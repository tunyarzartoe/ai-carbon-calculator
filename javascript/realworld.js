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
   絵文字ではなくベクターパスで描く（環境によって絵文字のレンダリングが崩れるのを防ぐため）。
   c1/c2 はティアごとの配色（HEX）。 */
function drawCertificateSeal(ctx, cx, cy, r, c1, c2){
  ctx.save();
  ctx.strokeStyle = hexToRgba(c2, 0.55);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = hexToRgba(c1, 0.55);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // leaf
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.58);
  ctx.bezierCurveTo(cx + r * 0.5, cy - r * 0.3, cx + r * 0.5, cy + r * 0.14, cx, cy + r * 0.2);
  ctx.bezierCurveTo(cx - r * 0.5, cy + r * 0.14, cx - r * 0.5, cy - r * 0.3, cx, cy - r * 0.58);
  ctx.fill();

  // compass needle
  ctx.fillStyle = hexToRgba(c2, 0.8);
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

function hexToRgba(hex, alpha){
  const h = hex.replace('#', '');
  const r = parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16);
  const g = parseInt(h.length === 3 ? h[1] + h[1] : h.slice(2, 4), 16);
  const b = parseInt(h.length === 3 ? h[2] + h[2] : h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawCornerBrackets(ctx, x, y, w, h, size, color){
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const corners = [
    [[x, y + size], [x, y], [x + size, y]],
    [[x + w - size, y], [x + w, y], [x + w, y + size]],
    [[x, y + h - size], [x, y + h], [x + size, y + h]],
    [[x + w - size, y + h], [x + w, y + h], [x + w, y + h - size]]
  ];
  corners.forEach(pts => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.stroke();
  });
  ctx.restore();
}

function drawTierBadge(ctx, cx, y, text, c1, c2){
  ctx.save();
  ctx.font = '700 15px "JetBrains Mono", monospace';
  const paddingX = 18;
  const textWidth = ctx.measureText(text).width;
  const boxW = textWidth + paddingX * 2;
  const boxH = 30;
  const grad = ctx.createLinearGradient(cx - boxW / 2, 0, cx + boxW / 2, 0);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  roundedRectPath(ctx, cx - boxW / 2, y - boxH / 2, boxW, boxH, boxH / 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.fillStyle = '#0A0F0D';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, y + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

window.generateCertificateCanvas = function(certData){
  const canvas = document.createElement('canvas');
  const W = 850, H = 1100;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const tier = certData.tier || { primary: '#3DFFB0', secondary: '#33C7E8', emoji: '🥉', label: 'ブロンズ' };
  const c1 = tier.primary, c2 = tier.secondary;

  // page background
  ctx.fillStyle = '#0A0F0D';
  ctx.fillRect(0, 0, W, H);

  // gradient frame (outer)
  const frameGrad = ctx.createLinearGradient(0, 0, W, H);
  frameGrad.addColorStop(0, c1);
  frameGrad.addColorStop(0.55, c2);
  frameGrad.addColorStop(1, c1);
  roundedRectPath(ctx, 20, 20, W - 40, H - 40, 26);
  ctx.strokeStyle = frameGrad;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.save();
  // inner panel
  roundedRectPath(ctx, 34, 34, W - 68, H - 68, 20);
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
  ctx.restore();

  // corner brackets
  drawCornerBrackets(ctx, 46, 46, W - 92, H - 92, 22, hexToRgba(c1, 0.85));

  ctx.textAlign = 'center';

  // seal
  drawCertificateSeal(ctx, W / 2, 128, 48, '#3DFFB0', '#33C7E8');

  // tier badge
  drawTierBadge(ctx, W / 2, 208, `${tier.emoji} ${tier.label}会員`, c1, c2);

  // kicker
  ctx.fillStyle = c2;
  ctx.font = '700 15px "JetBrains Mono", monospace';
  ctx.fillText('I S S U E D   B Y   C O 2   C O M P A S S   A I', W / 2, 250);

  // title
  ctx.fillStyle = '#E7F5EF';
  ctx.font = '800 38px "JetBrains Mono", monospace';
  ctx.fillText('CO2 Compass 認定証', W / 2, 294);

  // subtitle
  ctx.fillStyle = '#7C948C';
  ctx.font = '400 14px sans-serif';
  ctx.fillText('地球にやさしい生活習慣への取り組みを証明します', W / 2, 320);

  // recipient name
  ctx.fillStyle = '#7C948C';
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.fillText('R E C I P I E N T', W / 2, 366);

  const displayName = certData.name && certData.name.trim() ? certData.name.trim() : '－ 未設定 －';
  ctx.fillStyle = '#E7F5EF';
  ctx.font = '800 30px "JetBrains Mono", monospace';
  ctx.fillText(displayName, W / 2, 406);
  const nameWidth = Math.max(170, ctx.measureText(displayName).width + 30);
  ctx.strokeStyle = c1;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - nameWidth / 2, 420);
  ctx.lineTo(W / 2 + nameWidth / 2, 420);
  ctx.stroke();

  // divider (gradient)
  const divY = 466;
  const divGrad = ctx.createLinearGradient(110, 0, W - 110, 0);
  divGrad.addColorStop(0, hexToRgba(c1, 0));
  divGrad.addColorStop(0.5, hexToRgba(c2, 0.6));
  divGrad.addColorStop(1, hexToRgba(c1, 0));
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(110, divY); ctx.lineTo(W - 110, divY); ctx.stroke();

  // stats: 2x2 grid (matches the in-app certificate card layout)
  const stats = [
    { label: 'レベル', value: `Lv.${certData.level}` },
    { label: 'ベストランク', value: certData.bestGrade },
    { label: '診断回数', value: `${certData.diagnosisCount}回` },
    { label: '獲得バッジ', value: `${certData.badgesUnlocked}/${certData.badgesTotal}` }
  ];
  const gridTop = divY + 60;
  const rowH = 110;
  const colW = (W - 220) / 2;
  const colCenters = [110 + colW / 2, 110 + colW + colW / 2];
  stats.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = colCenters[col];
    const cy = gridTop + row * rowH;
    ctx.fillStyle = c1;
    ctx.font = '800 34px "JetBrains Mono", monospace';
    ctx.fillText(s.value, cx, cy);
    ctx.fillStyle = '#7C948C';
    ctx.font = '500 14px sans-serif';
    ctx.fillText(s.label, cx, cy + 26);
  });
  // grid divider lines (vertical between columns, horizontal between rows)
  ctx.strokeStyle = 'rgba(124,148,140,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2, gridTop - 42); ctx.lineTo(W / 2, gridTop + rowH + 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(110, gridTop + rowH / 2 - 6); ctx.lineTo(W - 110, gridTop + rowH / 2 - 6);
  ctx.stroke();

  // perforation (ticket-style dashed line)
  const perfY = gridTop + rowH + 70;
  ctx.strokeStyle = 'rgba(124,148,140,0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.beginPath(); ctx.moveTo(70, perfY); ctx.lineTo(W - 70, perfY); ctx.stroke();
  ctx.setLineDash([]);

  // ledger-style footer
  const footerY1 = perfY + 56;
  const footerY2 = perfY + 92;
  ctx.textAlign = 'left';
  ctx.font = '500 15px "JetBrains Mono", monospace';
  ctx.fillStyle = '#7C948C';
  ctx.fillText('発行日', 110, footerY1);
  ctx.fillText('証明書番号', 110, footerY2);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#E7F5EF';
  ctx.fillText(certData.issueDate, W - 110, footerY1);
  ctx.fillText(certData.certId, W - 110, footerY2);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#7C948C';
  ctx.font = '400 12px "JetBrains Mono", monospace';
  ctx.fillText('co2compass.app', W / 2, H - 60);

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
      const shareText = `🌱 CO2 Compassで${certData.tier ? certData.tier.label + '認定証' : '認定証'}を獲得したよ！\nLv.${certData.level} / ベストランク ${certData.bestGrade} / バッジ ${certData.badgesUnlocked}/${certData.badgesTotal}`;

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
          // ユーザーが共有シートを開いた上でキャンセルしただけの場合は AbortError になる。
          // これは正常な操作なので、勝手に画像をダウンロードしたりはしない。
          if (e && e.name === 'AbortError') return;
          // それ以外（Web Share API が使えない環境・実際の失敗）の場合だけ、画像保存にフォールバックする
        }
      }
      window.downloadCertificateImage(certData);
    }, 'image/png');
  });
};