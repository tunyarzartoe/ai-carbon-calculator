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

function roundedRectPath(ctx, x, y, w, h, r){
  ctx.beginPath();
  if (ctx.roundRect){
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

/* 認定証の中央上部に置く「シール」マーク。ブランドのコンパス/リーフのモチーフを
   絵文字ではなくベクターパスで描く（環境によって絵文字のレンダリングが崩れるのを防ぐため）。 */
function drawCertificateSeal(ctx, cx, cy, r){
  ctx.save();
  ctx.strokeStyle = 'rgba(51,199,232,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(61,255,176,0.55)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // leaf
  ctx.fillStyle = '#3DFFB0';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.58);
  ctx.bezierCurveTo(cx + r * 0.5, cy - r * 0.3, cx + r * 0.5, cy + r * 0.14, cx, cy + r * 0.2);
  ctx.bezierCurveTo(cx - r * 0.5, cy + r * 0.14, cx - r * 0.5, cy - r * 0.3, cx, cy - r * 0.58);
  ctx.fill();

  // compass needle
  ctx.fillStyle = 'rgba(51,199,232,0.8)';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.16, cy + r * 0.2);
  ctx.lineTo(cx + r * 0.16, cy + r * 0.2);
  ctx.lineTo(cx, cy + r * 0.75);
  ctx.closePath();
  ctx.fill();

  // center pin
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.2, r * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#0A0F0D';
  ctx.fill();
  ctx.strokeStyle = '#E7F5EF';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

window.generateCertificateCanvas = function(certData){
  const canvas = document.createElement('canvas');
  const W = 1000, H = 700;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // page background
  ctx.fillStyle = '#0A0F0D';
  ctx.fillRect(0, 0, W, H);

  // gradient frame (outer)
  const frameGrad = ctx.createLinearGradient(0, 0, W, H);
  frameGrad.addColorStop(0, '#3DFFB0');
  frameGrad.addColorStop(0.55, '#33C7E8');
  frameGrad.addColorStop(1, '#3DFFB0');
  roundedRectPath(ctx, 20, 20, W - 40, H - 40, 28);
  ctx.strokeStyle = frameGrad;
  ctx.lineWidth = 5;
  ctx.stroke();

  // inner panel
  roundedRectPath(ctx, 34, 34, W - 68, H - 68, 22);
  ctx.fillStyle = '#111917';
  ctx.fill();
  ctx.clip();

  // subtle dot-grid texture inside the panel
  ctx.fillStyle = 'rgba(34,50,44,0.6)';
  for (let x = 50; x < W - 50; x += 26){
    for (let y = 50; y < H - 50; y += 26){
      ctx.fillRect(x, y, 1, 1);
    }
  }

  ctx.textAlign = 'center';

  // seal
  drawCertificateSeal(ctx, W / 2, 118, 46);

  // kicker
  ctx.fillStyle = '#33C7E8';
  ctx.font = '700 16px "JetBrains Mono", monospace';
  ctx.fillText('I S S U E D   B Y   C O 2   C O M P A S S   A I', W / 2, 202);

  // title
  ctx.fillStyle = '#E7F5EF';
  ctx.font = '800 44px "JetBrains Mono", monospace';
  ctx.fillText('CO2 Compass 認定証', W / 2, 250);

  // subtitle
  ctx.fillStyle = '#7C948C';
  ctx.font = '400 16px sans-serif';
  ctx.fillText('地球にやさしい生活習慣への取り組みを証明します', W / 2, 280);

  // divider (gradient)
  const divGrad = ctx.createLinearGradient(140, 0, W - 140, 0);
  divGrad.addColorStop(0, 'rgba(61,255,176,0)');
  divGrad.addColorStop(0.5, 'rgba(51,199,232,0.6)');
  divGrad.addColorStop(1, 'rgba(61,255,176,0)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(140, 312); ctx.lineTo(W - 140, 312); ctx.stroke();

  // stats row with dividers
  const stats = [
    { label: 'レベル', value: `Lv.${certData.level}` },
    { label: 'ベストランク', value: certData.bestGrade },
    { label: '診断回数', value: `${certData.diagnosisCount}回` },
    { label: '獲得バッジ', value: `${certData.badgesUnlocked}/${certData.badgesTotal}` }
  ];
  const colW = (W - 280) / stats.length;
  stats.forEach((s, i) => {
    const cx = 140 + colW * i + colW / 2;
    if (i > 0){
      ctx.strokeStyle = 'rgba(124,148,140,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(140 + colW * i, 360);
      ctx.lineTo(140 + colW * i, 430);
      ctx.stroke();
    }
    ctx.fillStyle = '#3DFFB0';
    ctx.font = '800 38px "JetBrains Mono", monospace';
    ctx.fillText(s.value, cx, 400);
    ctx.fillStyle = '#7C948C';
    ctx.font = '500 14px sans-serif';
    ctx.fillText(s.label, cx, 424);
  });

  // ledger-style footer
  ctx.strokeStyle = 'rgba(124,148,140,0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(140, 500); ctx.lineTo(W - 140, 500); ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'left';
  ctx.font = '500 15px "JetBrains Mono", monospace';
  ctx.fillStyle = '#7C948C';
  ctx.fillText('発行日', 140, 546);
  ctx.fillText('証明書番号', 140, 578);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#E7F5EF';
  ctx.fillText(certData.issueDate, W - 140, 546);
  ctx.fillText(certData.certId, W - 140, 578);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#7C948C';
  ctx.font = '400 12px "JetBrains Mono", monospace';
  ctx.fillText('co2compass.app', W / 2, 640);

  return canvas;
};

function whenFontsReady(){
  if (document.fonts && document.fonts.ready){
    return document.fonts.ready.catch(() => {});
  }
  return Promise.resolve();
}

window.downloadCertificateImage = function(certData){
  whenFontsReady().then(() => {
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
  });
};

/* 画像つきで Web Share API を使う。対応していなければ静かに画像保存にフォールバック。 */
window.shareCertificateImage = function(certData){
  whenFontsReady().then(() => {
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
  });
};