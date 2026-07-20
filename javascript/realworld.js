/* =========================================================
   リアルワールド機能（本物のデバイスAPIを使用）
   1. 📍🌦️ Geolocation + Open-Meteo API（キー不要）で
      現在地の天気を取得し、天気に合わせたアドバイスを表示
   2. 📳 Vibration API でランクに応じた振動フィードバック
   3. 🔊 Web Speech API でAIのヒントを音声で読み上げ

   すべて「対応していない・許可されない場合は静かに諦める」
   設計にしてあります。オフラインやPCブラウザでも
   アプリ本体の動作には一切影響しません。
   ========================================================= */

/* ---------- 1. 位置情報 + 天気 ---------- */

function classifyWeather(code, precipitation, temp){
  const RAIN_CODES = [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99];
  const SNOW_CODES = [71,73,75,77,85,86];

  const isRain = precipitation > 0 || RAIN_CODES.includes(code);
  const isSnow = SNOW_CODES.includes(code);

  if (isSnow){
    return { icon: '❄️', text: `今日は雪みたい。足元に気をつけつつ、電車やバスを使うと安全で移動のCO2も減らせるよ。` };
  }
  if (isRain){
    return { icon: '☔', text: `今日は雨みたい。自転車の代わりに電車・バスを使うと、濡れずに済むし移動のCO2も減らせるよ。` };
  }
  if (temp >= 30){
    return { icon: '🥵', text: `今日は${Math.round(temp)}°Cと暑いから、エアコンの設定温度を28°C目安にすると電気のCO2を減らせるよ。` };
  }
  if (temp <= 5){
    return { icon: '🥶', text: `今日は${Math.round(temp)}°Cと寒いから、暖房を上げすぎず1枚羽織るのもおすすめだよ。` };
  }
  return { icon: '🌤️', text: `今日は${Math.round(temp)}°Cで過ごしやすい天気。徒歩や自転車での移動にもぴったりだよ。` };
}

/**
 * 現在地の天気を取得してアドバイスを返す。
 * 位置情報が使えない/拒否された/オフラインの場合は null を返すだけで、
 * エラーを投げたりアプリを止めたりしない。
 */
window.fetchWeatherTip = function(){
  // 同じ日にすでに取得済みならキャッシュを使い、位置情報の許可ダイアログを
  // 何度も出さないようにする（リロードしても1日1回でOK）。
  const cacheKey = 'co2compass_weather_' + window.todayStr();
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return Promise.resolve(JSON.parse(cached));
  } catch (e){ /* storage unavailable, fall through to live fetch */ }

  return new Promise((resolve) => {
    if (!('geolocation' in navigator)){
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation,weather_code`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('weather http ' + res.status);
          const data = await res.json();
          const cur = data.current || {};
          const result = classifyWeather(cur.weather_code, cur.precipitation || 0, cur.temperature_2m);
          try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch (e){ /* storage unavailable */ }
          resolve(result);
        } catch (e){
          console.warn('weather fetch failed:', e);
          resolve(null);
        }
      },
      (err) => {
        console.warn('geolocation denied/unavailable:', err && err.message);
        resolve(null);
      },
      { timeout: 6000, maximumAge: 30 * 60 * 1000 }
    );
  });
};

// 天気取得はアプリ起動時に自動では行わない（許可ダイアログが起動直後に
// 出てユーザーを戸惑わせたり、WebViewによっては固まって見えたりするのを防ぐため）。
// 診断が完了した最初のタイミングで showResult() から呼び出される。

/* ---------- 2. バイブレーション ---------- */

window.vibrateForGrade = function(grade){
  if (!('vibrate' in navigator)) return;
  try {
    if (grade === 'S' || grade === 'A') navigator.vibrate([40, 30, 40]);
    else if (grade === 'D') navigator.vibrate([80, 40, 80]);
    else navigator.vibrate(50);
  } catch (e){ /* vibration not permitted/supported */ }
};

/* バッジ解除時の短い通知バイブ */
window.vibrateForBadge = function(){
  if (!('vibrate' in navigator)) return;
  try { navigator.vibrate([25, 20, 25, 20, 60]); } catch (e){ /* vibration not permitted/supported */ }
};

/* ---------- 4. 認定証イメージ（Canvas）+ Web Share API ---------- */
/* paiza の認定証のように、レベル/ランク/バッジ実績を1枚の画像として
   保存・シェアできるようにする。ライブラリ不要、すべて Canvas 2D で描画。 */

window.generateCertificateCanvas = function(certData){
  const canvas = document.createElement('canvas');
  const W = 1000, H = 640;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = '#0A0F0D';
  ctx.fillRect(0, 0, W, H);

  // grid atmosphere (subtle)
  ctx.strokeStyle = 'rgba(34,50,44,0.5)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 28){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 28){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // borders
  ctx.strokeStyle = '#3DFFB0';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.strokeStyle = '#22322C';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  ctx.textAlign = 'center';

  // kicker
  ctx.fillStyle = '#33C7E8';
  ctx.font = '700 18px "JetBrains Mono", monospace';
  ctx.fillText('E C O   /   A I   C E R T I F I C A T E', W / 2, 108);

  // title
  ctx.fillStyle = '#E7F5EF';
  ctx.font = '800 46px "JetBrains Mono", monospace';
  ctx.fillText('CO2 Compass 認定証', W / 2, 168);

  // subtitle
  ctx.fillStyle = '#7C948C';
  ctx.font = '400 16px sans-serif';
  ctx.fillText('地球にやさしい生活習慣への取り組みを証明します', W / 2, 202);

  // divider
  ctx.strokeStyle = '#22322C';
  ctx.beginPath(); ctx.moveTo(140, 232); ctx.lineTo(W - 140, 232); ctx.stroke();

  // stats row
  const stats = [
    { label: 'レベル', value: `Lv.${certData.level}` },
    { label: 'ベストランク', value: certData.bestGrade },
    { label: '診断回数', value: `${certData.diagnosisCount}回` },
    { label: '獲得バッジ', value: `${certData.badgesUnlocked}/${certData.badgesTotal}` }
  ];
  const colW = (W - 280) / stats.length;
  stats.forEach((s, i) => {
    const cx = 140 + colW * i + colW / 2;
    ctx.fillStyle = '#3DFFB0';
    ctx.font = '800 40px "JetBrains Mono", monospace';
    ctx.fillText(s.value, cx, 330);
    ctx.fillStyle = '#7C948C';
    ctx.font = '500 14px sans-serif';
    ctx.fillText(s.label, cx, 358);
  });

  // seal circle
  ctx.beginPath();
  ctx.arc(W / 2, 460, 54, 0, Math.PI * 2);
  ctx.strokeStyle = '#33C7E8';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#33C7E8';
  ctx.font = '700 26px "JetBrains Mono", monospace';
  ctx.fillText('🌱', W / 2, 470);

  // footer
  ctx.fillStyle = '#7C948C';
  ctx.font = '400 14px "JetBrains Mono", monospace';
  ctx.fillText(`発行日: ${certData.issueDate}`, W / 2, 566);
  ctx.fillText(`証明書番号: ${certData.certId}`, W / 2, 588);

  return canvas;
};

window.downloadCertificateImage = function(certData){
  const canvas = window.generateCertificateCanvas(certData);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `co2compass-certificate-${certData.certId}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');
};

/* 画像つきで Web Share API を使う。対応していなければ静かに画像保存にフォールバック。 */
window.shareCertificateImage = function(certData){
  const canvas = window.generateCertificateCanvas(certData);
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const shareText = `🌱 CO2 Compassで認定証を獲得したよ！\nLv.${certData.level} / ベストランク ${certData.bestGrade} / バッジ ${certData.badgesUnlocked}/${certData.badgesTotal}`;

    if (navigator.share){
      try {
        const file = new File([blob], 'co2compass-certificate.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })){
          await navigator.share({ files: [file], title: 'CO2 Compass 認定証', text: shareText });
          return;
        }
        // ファイル共有非対応なら、テキストだけでも共有を試す
        await navigator.share({ title: 'CO2 Compass 認定証', text: shareText });
        return;
      } catch (e){
        // ユーザーがキャンセルした/失敗した場合は画像保存にフォールバック
      }
    }
    window.downloadCertificateImage(certData);
  }, 'image/png');
};