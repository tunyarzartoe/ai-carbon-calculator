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

window.todayStr = function(){
  return new Date().toISOString().slice(0, 10);
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
  if (total <= 6)  return { grade: 'S', cls: '',        msg: 'とてもエコな1日！このまま続けよう🌿' };
  if (total <= 11) return { grade: 'A', cls: '',        msg: '良いバランスだね。あと一歩でSランク！' };
  if (total <= 16) return { grade: 'B', cls: 'warn',    msg: 'まずまず。1つ習慣を見直すと変わるよ。' };
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