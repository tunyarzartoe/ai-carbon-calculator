window.HISTORY_KEY = 'co2-compass-history';

window.TRANSPORT = {
  walk:  { label: '徒歩・自転車', kgPerKm: 0 },
  train: { label: '電車',        kgPerKm: 0.04 },
  bus:   { label: 'バス',        kgPerKm: 0.08 },
  car:   { label: '車',          kgPerKm: 0.17 }
};

window.DISTANCE_KM = {
  short:  { label: '近い (〜5km)',  km: 5 },
  medium: { label: '普通 (5〜15km)', km: 12 },
  long:   { label: '遠い (15km〜)',  km: 30 }
};

window.GRID_INTENSITY = 0.46;

/* =========================================================
   地域別の電力CO2排出係数（kg-CO2/kWh）
   実際の電源構成は国・地域ごとに大きく異なる（原子力・水力が多い国は低く、
   石炭火力中心の国は高い）。ブラウザのタイムゾーンから大まかな地域を推定し、
   より実態に近い係数を使う。APIキーや外部通信は不要、完全にローカルで完結する。
   数値は各国公表資料等をもとにした概算値。
   ========================================================= */
window.CARBON_INTENSITY_BY_TIMEZONE = {
  'Asia/Tokyo': 0.46,
  'Asia/Yangon': 0.55,
  'Asia/Bangkok': 0.50,
  'Asia/Jakarta': 0.72,
  'Asia/Manila': 0.61,
  'Asia/Ho_Chi_Minh': 0.60,
  'Asia/Kolkata': 0.71,
  'Asia/Shanghai': 0.58,
  'Asia/Seoul': 0.42,
  'Asia/Singapore': 0.41,
  'Australia/Sydney': 0.66,
  'America/New_York': 0.39,
  'America/Chicago': 0.42,
  'America/Los_Angeles': 0.21,
  'America/Sao_Paulo': 0.09,
  'Europe/London': 0.21,
  'Europe/Paris': 0.06,
  'Europe/Berlin': 0.35,
  'Europe/Madrid': 0.18,
  'Europe/Rome': 0.31,
  'Europe/Moscow': 0.32
};

/* 端末のタイムゾーンから地域の電力CO2係数を推定する。
   判定できない場合は日本の平均値（GRID_INTENSITY）にフォールバックする。 */
window.getRegionalGridIntensity = function(){
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && window.CARBON_INTENSITY_BY_TIMEZONE[tz] !== undefined){
      return { value: window.CARBON_INTENSITY_BY_TIMEZONE[tz], matched: true };
    }
  } catch (e){ /* Intl未対応環境ではフォールバック */ }
  return { value: window.GRID_INTENSITY, matched: false };
};
window.ELECTRICITY = {
  low:    { label: '少ない (こまめに消す)', hoursKwh: 2 },
  medium: { label: '普通',                 hoursKwh: 5 },
  high:   { label: '多い (エアコン・ゲーム長時間)', hoursKwh: 10 }
};
window.MEAL = {
  veggie: { label: '野菜中心', kg: 1.5 },
  mixed:  { label: 'バランス型', kg: 3.5 },
  meat:   { label: '肉・揚げ物多め', kg: 7.5 }
};
window.WASTE = {
  always:    { label: '必ず分別する', kg: 0.2 },
  sometimes: { label: 'たまに分別する', kg: 0.5 },
  rarely:    { label: 'あまりしない', kg: 1.0 }
};

const ACK_PHRASES = [
  'なるほど!', '了解!', 'いいね、次いこう。', 'OK、記録したよ。',
  'ふむふむ。', 'わかった!', 'そうなんだね。', 'メモしたよ📝'
];

window.randomAck = function(){
  return ACK_PHRASES[Math.floor(Math.random() * ACK_PHRASES.length)];
};

window.formatLocalDate = function(d){
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

window.todayStr = function(){
  return window.formatLocalDate(new Date());
};

window.loadHistory = function(){
  try {
    const raw = localStorage.getItem(window.HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // console.log('data.loadHistory', parsed.length, 'entries');
    return parsed;
  } catch (e){
    return [];
  }
};

window.saveHistoryEntry = function(entry){
  let hist = window.loadHistory();
  const idx = hist.findIndex(h => h.date === entry.date);
  if (idx >= 0) hist[idx] = entry; else hist.push(entry);
  hist.sort((a, b) => a.date.localeCompare(b.date));
  hist = hist.slice(-30);
  try { localStorage.setItem(window.HISTORY_KEY, JSON.stringify(hist)); } catch (e){}
  // console.log('data.saveHistoryEntry', entry.date, entry.total);
  return hist;
};

window.rankFor = function(total){
  // Mapping grades to CSS classes used across the UI:
  // S/A -> default (mint), B -> mid (cyan), C -> warn (amber), D -> danger (red)
  if (total <= 6)  return { grade: 'S', cls: '',        msg: 'とてもエコな1日！このまま続けよう🌿' };
  if (total <= 11) return { grade: 'A', cls: '',        msg: '良いバランスだね。あと一歩でSランク！' };
  if (total <= 16) return { grade: 'B', cls: 'mid',     msg: 'まずまず。1つ習慣を見直すと変わるよ。' };
  if (total <= 21) return { grade: 'C', cls: 'warn',    msg: '改善の余地あり。下のヒントを試してみよう。' };
  return              { grade: 'D', cls: 'danger',    msg: '今日から少しずつ変えていこう。きっとできる！' };
};

window.CATEGORY_LABELS = {
  transport: '移動',
  electricity: '電気',
  meal: '食事',
  waste: '廃棄'
};

window.TIPS = {
  transport:   '💡 週に1〜2回、電車やバス・自転車に切り替えるだけでも移動によるCO2はぐっと減るよ。',
  electricity: '💡 使っていない部屋の電気やエアコンをこまめに消すと、電気由来のCO2を減らせるよ。',
  meal:        '💡 週に数回、肉を減らして野菜中心の食事にすると食事由来のCO2が下がるよ。',
  waste:       '💡 ゴミを分別してリサイクルに回すだけでも、廃棄によるCO2を減らせるよ。'
};

window.buildBreakdownChart = function(breakdown){
  const entries = Object.entries(breakdown);
  const max = Math.max(...entries.map(([, value]) => value), 0.01);
  return entries.map(([key, value]) => {
    const pct = Math.max(Math.min((value / max) * 100, 100), value > 0 ? 3 : 0);
    return `\n      <div class="chart-row">\n        <span class="chart-label">${window.CATEGORY_LABELS[key]}</span>\n        <div class="chart-track"><div class="chart-fill cat-${key}" style="width:${pct}%"></div></div>\n        <span class="chart-value">${value.toFixed(2)}kg</span>\n      </div>`;
  }).join('');
};

window.goalMessageHtml = function(goal, total){
  if (goal === null || goal === undefined) return '';
  if (total <= goal){
    return `<p class="goal-badge success">🎯 目標（${goal}kg以下）達成！</p>`;
  }
  const diff = (total - goal).toFixed(1);
  return `<p class="goal-badge miss">🎯 目標まであと ${diff}kg</p>`;
};

window.historyCompareHtml = function(history, total){
  const past = history.filter(h => h.date !== window.todayStr());
  if (past.length === 0) return '';
  const avg = past.reduce((sum, h) => sum + h.total, 0) / past.length;
  const diff = total - avg;
  const arrow = diff > 0.2 ? '↑' : diff < -0.2 ? '↓' : '→';
  const cls = diff > 0.2 ? 'up' : diff < -0.2 ? 'down' : 'flat';
  return `<p class="history-compare ${cls}">これまでの平均 ${avg.toFixed(1)}kg と比べて ${arrow} ${Math.abs(diff).toFixed(1)}kg</p>`;
};

/* 排出量を身近なものに換算して直感的にイメージしやすくする */
window.CO2_PER_KM_CAR = 0.17;      // 車で1km走った場合のCO2(kg)
window.CO2_PER_TREE_DAY = 0.038;   // 杉の木1本が1日に吸収するCO2(kg)（年間約14kgとして換算）

window.co2EquivalentHtml = function(total){
  if (!total || total <= 0) return '';
  const carKm = total / window.CO2_PER_KM_CAR;
  const treeDays = total / window.CO2_PER_TREE_DAY;

  const carText = carKm >= 1
    ? `🚗 車で <strong>${carKm.toFixed(0)}km</strong> 走った時と同じくらいのCO2`
    : `🚗 車で ${(carKm * 1000).toFixed(0)}m 走った時と同じくらいのCO2`;
  const treeText = `🌲 杉の木 <strong>${Math.max(1, Math.round(treeDays))}本</strong>が1日で吸収するCO2に相当`;

  return `
    <div class="co2-equivalent">
      <p class="co2-equivalent-title">これってどのくらい？</p>
      <p class="co2-equivalent-row">${carText}</p>
      <p class="co2-equivalent-row">${treeText}</p>
    </div>`;
};

/* =========================================================
   履歴分析（月次サマリー・曜日パターン）
   ========================================================= */
window.WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/* 指定した年月の記録から合計・平均・ベスト/ワーストの日を集計する */
window.computeMonthlySummary = function(history, year, month){
  const entries = history.filter(h => {
    const d = new Date(h.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });
  if (entries.length === 0) return null;

  const total = entries.reduce((sum, h) => sum + h.total, 0);
  const avg = total / entries.length;
  const best = entries.reduce((a, b) => (a.total <= b.total ? a : b));
  const worst = entries.reduce((a, b) => (a.total >= b.total ? a : b));

  return {
    count: entries.length,
    total: +total.toFixed(1),
    avg: +avg.toFixed(1),
    best,
    worst
  };
};

/* 前月と当月の平均を比べて、改善傾向かどうかを返す */
window.computeMonthOverMonthHtml = function(history, year, month){
  const current = window.computeMonthlySummary(history, year, month);
  if (!current) return '';
  const prevDate = new Date(year, month - 1, 1);
  const prev = window.computeMonthlySummary(history, prevDate.getFullYear(), prevDate.getMonth());
  if (!prev) return '';

  const diff = current.avg - prev.avg;
  if (Math.abs(diff) < 0.2) return `<p class="month-compare flat">先月とほぼ同じペースだよ</p>`;
  if (diff < 0){
    return `<p class="month-compare down">先月より平均 ${Math.abs(diff).toFixed(1)}kg/日 改善したよ📉</p>`;
  }
  return `<p class="month-compare up">先月より平均 ${diff.toFixed(1)}kg/日 増えているよ📈</p>`;
};

/* 曜日ごとの平均から、排出量が多い/少ない曜日の傾向を見つける（実用的な行動のヒント用） */
window.computeWeekdayInsight = function(history){
  if (!history || history.length < 7) return null;

  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  history.forEach(h => {
    const wd = new Date(h.date + 'T00:00:00').getDay();
    sums[wd] += h.total;
    counts[wd]++;
  });

  let worstIdx = -1, worstAvg = -Infinity;
  let bestIdx = -1, bestAvg = Infinity;
  for (let i = 0; i < 7; i++){
    if (counts[i] === 0) continue;
    const avg = sums[i] / counts[i];
    if (avg > worstAvg){ worstAvg = avg; worstIdx = i; }
    if (avg < bestAvg){ bestAvg = avg; bestIdx = i; }
  }
  if (worstIdx === -1 || worstIdx === bestIdx) return null;

  return {
    worstDay: window.WEEKDAY_LABELS[worstIdx],
    worstAvg: +worstAvg.toFixed(1),
    bestDay: window.WEEKDAY_LABELS[bestIdx],
    bestAvg: +bestAvg.toFixed(1)
  };
};

/* =========================================================
   データのバックアップ・復元
   このアプリは端末のブラウザ内（localStorage）にしか記録を保存していない。
   機種変更やブラウザのデータ消去で記録が消えてしまうリスクに備え、
   記録をJSONファイルとして書き出し・読み込みできるようにする。
   ========================================================= */
window.exportBackupJson = function(){
  const payload = {
    app: 'co2-compass',
    version: 1,
    exportedAt: window.todayStr(),
    history: window.loadHistory(),
    gamify: window.loadGamifyState()
  };
  return JSON.stringify(payload, null, 2);
};

window.downloadBackupFile = function(){
  const json = window.exportBackupJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `co2compass-backup-${window.todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

/* ファイルを読み込んで localStorage に復元する。
   callback(ok, message) の形で結果を返す。壊れたファイルでもアプリを止めない。 */
window.importBackupFile = function(file, callback){
  if (!file){ callback(false, 'ファイルが選択されていません'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.history) || typeof data.gamify !== 'object' || data.gamify === null){
        callback(false, 'バックアップファイルの形式が正しくありません');
        return;
      }
      localStorage.setItem(window.HISTORY_KEY, JSON.stringify(data.history));
      localStorage.setItem(window.GAMIFY_KEY, JSON.stringify(data.gamify));
      callback(true, '復元が完了したよ！');
    } catch (e){
      callback(false, 'ファイルの読み込みに失敗しました');
    }
  };
  reader.onerror = () => callback(false, 'ファイルの読み込みに失敗しました');
  reader.readAsText(file);
};