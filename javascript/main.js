// DOM refs 
const chatLog       = document.getElementById('chatLog');
const replyOptions  = document.getElementById('replyOptions');
const gaugeFill     = document.getElementById('gaugeFill');
const gaugeValueEl  = document.getElementById('gaugeValue');

const GAUGE_CIRCUMFERENCE = 326.7; // 2 * PI * r(52)
const GAUGE_MAX_KG = 30;           // adjusted scale for realistic daily totals

// ---- running state ----
let state = {
  total: 0,
  goal: null,
  breakdown: { transport: 0, electricity: 0, meal: 0, waste: 0 }
};

/* =========================================================
   Emission factors (simplified estimates for teaching demo)
   ========================================================= */
// TRANSPORT: use kgCO2 per passenger-km (approximate averages)
// values (kg CO2 / passenger-km): walk/bike 0, train ~0.04, bus ~0.08, car ~0.17
const TRANSPORT = {
  walk:  { label: '徒歩・自転車', kgPerKm: 0 },
  train: { label: '電車',        kgPerKm: 0.04 },
  bus:   { label: 'バス',        kgPerKm: 0.08 },
  car:   { label: '車',          kgPerKm: 0.17 }
};

// Representative one-way distances (km) for each category
const DISTANCE_KM = {
  short:  { label: '近い (〜5km)',  km: 5 },
  medium: { label: '普通 (5〜15km)', km: 12 },
  long:   { label: '遠い (15km〜)',  km: 30 }
};
// Electricity: use grid intensity (kgCO2 per kWh) and approximate daily kWh usage
const GRID_INTENSITY = 0.46; // kg CO2 per kWh (example value - varies by grid)
const ELECTRICITY = {
  low:    { label: '少ない (こまめに消す)', hoursKwh: 2 },
  medium: { label: '普通',                 hoursKwh: 5 },
  high:   { label: '多い (エアコン・ゲーム長時間)', hoursKwh: 10 }
};
// Food and waste estimates (kg CO2 per day)
const MEAL = {
  veggie: { label: '野菜中心', kg: 1.5 },
  mixed:  { label: 'バランス型', kg: 3.5 },
  meat:   { label: '肉・揚げ物多め', kg: 7.5 }
};
const WASTE = {
  always:    { label: '必ず分別する', kg: 0.2 },
  sometimes: { label: 'たまに分別する', kg: 0.5 },
  rarely:    { label: 'あまりしない', kg: 1.0 }
};

// AI reply variation
const ACK_PHRASES = [
  'なるほど!', '了解!', 'いいね、次いこう。', 'OK、記録したよ。',
  'ふむふむ。', 'わかった!', 'そうなんだね。', 'メモしたよ📝'
];
function randomAck(){
  return ACK_PHRASES[Math.floor(Math.random() * ACK_PHRASES.length)];
}

//  Feature: History (localStorage)
function todayStr(){
  return new Date().toISOString().slice(0, 10);
}

function loadHistory(){
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e){
    return [];
  }
}

function saveHistoryEntry(entry){
  let hist = loadHistory();
  const idx = hist.findIndex(h => h.date === entry.date);
  if (idx >= 0) hist[idx] = entry; else hist.push(entry);
  hist.sort((a, b) => a.date.localeCompare(b.date));
  hist = hist.slice(-30); // keep last 30 days
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(hist)); } catch (e){ /* storage unavailable */ }
  return hist;
}

// Conversation script
let transportChoice = null;
let currentStepId = null;

const steps = [
  {
    id: 'intro',
    ai: [
      'こんにちは。私は CO2 Compass、きみの1日の生活からおおよそのCO2排出量を推定するAIだよ🌱',
      '4つの質問に答えるだけ。正確な数値じゃなく「だいたいの目安」として見てね。さっそく始めよう。'
    ],
    options: [{ label: 'はじめる', icon: '✨', next: 'goal' }]
  },
  {
    id: 'goal',
    ai: ['最後にもう一つだけ。今日の目標にしたいCO2量はある？（なくてもOK）'],
    options: [
      { label: '5kg以下', icon: '🎯', value: 5, next: 'transport' },
      { label: '8kg以下', icon: '🎯', value: 8, next: 'transport' },
      { label: '12kg以下', icon: '🎯', value: 12, next: 'transport' },
      { label: '目標なし', icon: '➖', value: null, next: 'transport' }
    ],
    onAnswer: (val) => { state.goal = val; }
  },
  {
    id: 'transport',
    ai: ['Q1. 通学・移動手段は主に何かな？'],
    options: Object.entries(TRANSPORT).map(([key, v]) => ({
      label: v.label,
      icon: key === 'walk' ? '🚶' : key === 'train' ? '🚆' : key === 'bus' ? '🚌' : '🚗',
      value: key,
      next: 'distance'
    })),
    onAnswer: (val) => { transportChoice = val; }
  },
  {
    id: 'distance',
    ai: ['なるほど。だいたいの片道の距離は？'],
    options: Object.entries(DISTANCE_KM).map(([key, v]) => ({
      label: v.label,
      icon: key === 'short' ? '📍' : key === 'medium' ? '🛤️' : '🛣️',
      value: key,
      next: 'electricity'
    })),
    onAnswer: (val) => {
      const kgPerKm = TRANSPORT[transportChoice].kgPerKm || 0;
      const km = DISTANCE_KM[val].km || 0;
      // round-trip assumed (往復)
      const totalKm = km * 2;
      const kg = +(kgPerKm * totalKm).toFixed(2);
      addResult('transport', kg,
        `移動: ${TRANSPORT[transportChoice].label} / ${DISTANCE_KM[val].label}（往復 ${totalKm}km）→ 約 ${kg}kg`);
    }
  },
  {
    id: 'electricity',
    ai: ['Q2. 家での電気の使い方は？(エアコン・ゲーム・照明など)'],
    options: Object.entries(ELECTRICITY).map(([key, v]) => ({
      label: v.label,
      icon: key === 'low' ? '💡' : key === 'medium' ? '🔌' : '⚡',
      value: key,
      next: 'meal'
    })),
    onAnswer: (val) => {
      const hours = ELECTRICITY[val].hoursKwh || 0;
      const kg = +(GRID_INTENSITY * hours).toFixed(2);
      addResult('electricity', kg, `電気使用: ${ELECTRICITY[val].label}（約 ${hours} kWh）→ 約 ${kg}kg`);
    }
  },
  {
    id: 'meal',
    ai: ['Q3. 今日の食事はどんな感じ？'],
    options: Object.entries(MEAL).map(([key, v]) => ({
      label: v.label,
      icon: key === 'veggie' ? '🥗' : key === 'mixed' ? '🍛' : '🍖',
      value: key,
      next: 'waste'
    })),
    onAnswer: (val) => {
      const kg = +MEAL[val].kg.toFixed(2);
      addResult('meal', kg, `食事: ${MEAL[val].label} → 約 ${kg}kg`);
    }
  },
  {
    id: 'waste',
    ai: ['最後の質問。ゴミの分別はどのくらいしてる？'],
    options: Object.entries(WASTE).map(([key, v]) => ({
      label: v.label,
      icon: key === 'always' ? '♻️' : key === 'sometimes' ? '🗑️' : '🚯',
      value: key,
      next: 'result'
    })),
    onAnswer: (val) => {
      const kg = +WASTE[val].kg.toFixed(2);
      addResult('waste', kg, `ゴミ分別: ${WASTE[val].label} → 約 ${kg}kg`);
    }
  }
];


  //  Chat rendering helpers
function scrollToBottom(){
  requestAnimationFrame(() => {
    chatLog.scrollTop = chatLog.scrollHeight;
  });
}

function addBubble(text, cls){
  const div = document.createElement('div');
  div.className = `bubble ${cls}`;
  if (cls === 'ai'){
    div.innerHTML = `<span class="ai-tag">AI</span>${text}`;
  } else {
    div.textContent = text;
  }
  chatLog.appendChild(div);
  requestAnimationFrame(() => {
    div.scrollIntoView({ block: 'end', inline: 'nearest' });
    scrollToBottom();
  });
}

function showTyping(){
  const el = document.createElement('div');
  el.className = 'typing';
  el.id = 'typingIndicator';
  el.innerHTML = '<span></span><span></span><span></span>';
  chatLog.appendChild(el);
  scrollToBottom();
  return el;
}

function removeTyping(){
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// AI speaks one or more lines with a short "typing" delay each
function aiSpeak(lines, done){
  const queue = Array.isArray(lines) ? [...lines] : [lines];
  function next(){
    if (queue.length === 0){ if (done) done(); return; }
    showTyping();
    setTimeout(() => {
      removeTyping();
      addBubble(queue.shift(), 'ai');
      setTimeout(next, 260);
    }, 550);
  }
  next();
}

function renderOptions(options){
  replyOptions.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = opt.restart ? 'reply-btn restart' : 'reply-btn';
    if (opt.icon){
      const icon = document.createElement('span');
      icon.className = 'btn-icon';
      icon.textContent = opt.icon;
      btn.appendChild(icon);
    }
    const text = document.createElement('span');
    text.className = 'btn-text';
    text.textContent = opt.label;
    btn.appendChild(text);
    btn.onclick = () => selectOption(opt);
    replyOptions.appendChild(btn);
  });

  scrollToBottom();
  const firstButton = replyOptions.querySelector('.reply-btn');
  if (firstButton){
    firstButton.focus({ preventScroll: true });
  }
}

function clearOptions(){ replyOptions.innerHTML = ''; }

function addResult(category, kg, note){
  state.breakdown[category] += kg;
  state.total = +(state.total + kg).toFixed(2);
  updateGauge();
  if (note){
    addBubble(note, 'ai');
  }
}

function updateGauge(){
  const ratio = Math.min(state.total / GAUGE_MAX_KG, 1);
  const offset = GAUGE_CIRCUMFERENCE * (1 - ratio);
  gaugeFill.style.strokeDashoffset = offset;
  gaugeValueEl.textContent = state.total.toFixed(1);

  let color = 'var(--mint)';
  if (state.total > 16) color = 'var(--danger)';
  else if (state.total > 11) color = 'var(--warn)';
  else if (state.total > 6) color = 'var(--cyan)';
  gaugeFill.style.stroke = color;
}

  //  Flow control
function goToStep(stepId){
  if (!stepId) return;
  if (stepId === 'result'){ return; } // handled after waste step finishes
  const step = steps.find(s => s.id === stepId);
  if (!step) return;
  currentStepId = stepId;
  clearOptions();
  const lines = stepId === 'intro' ? step.ai : [randomAck(), ...step.ai];
  aiSpeak(lines, () => renderOptions(step.options));
}

function selectOption(opt){
  if (opt.showResultModal){
    openResultModal();
    return;
  }

  clearOptions();
  addBubble(opt.label, 'user');

  if (opt.value !== undefined){
    // use currentStepId to reliably find the step that presented the options
    const currentStep = steps.find(s => s.id === currentStepId) || steps.find(s => s.options.some(o => o === opt));
    if (currentStep && currentStep.onAnswer) currentStep.onAnswer(opt.value);
  }

  if (opt.restart){
    return setTimeout(restart, 300);
  }

  if (opt.next === 'result'){
    setTimeout(showResult, 400);
  } else {
    setTimeout(() => goToStep(opt.next), 300);
  }
}

  //  Final result
function rankFor(total){
  if (total <= 6)  return { grade: 'S', cls: '',        msg: 'とてもエコな1日！このまま続けよう🌿' };
  if (total <= 11) return { grade: 'A', cls: '',        msg: '良いバランスだね。あと一歩でSランク！' };
  if (total <= 16) return { grade: 'B', cls: 'warn',    msg: 'まずまず。1つ習慣を見直すと変わるよ。' };
  if (total <= 21) return { grade: 'C', cls: 'warn',    msg: '改善の余地あり。下のヒントを試してみよう。' };
  return              { grade: 'D', cls: 'danger',    msg: '今日から少しずつ変えていこう。きっとできる！' };
}

function biggestCategory(){
  const entries = Object.entries(state.breakdown);
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

const CATEGORY_LABELS = {
  transport: '移動',
  electricity: '電気',
  meal: '食事',
  waste: '廃棄'
};

const TIPS = {
  transport:   '💡 週に1〜2回、電車やバス・自転車に切り替えるだけでも移動によるCO2はぐっと減るよ。',
  electricity: '💡 使っていない部屋の電気やエアコンをこまめに消すと、電気由来のCO2を減らせるよ。',
  meal:        '💡 週に数回、肉を減らして野菜中心の食事にすると食事由来のCO2が下がるよ。',
  waste:       '💡 ゴミを分別してリサイクルに回すだけでも、廃棄によるCO2を減らせるよ。'
};

function buildBreakdownChart(){
  const entries = Object.entries(state.breakdown);
  const max = Math.max(...entries.map(e => e[1]), 0.01);
  return entries.map(([key, val]) => {
    const pct = Math.max(Math.min((val / max) * 100, 100), val > 0 ? 3 : 0);
    return `
      <div class="chart-row">
        <span class="chart-label">${CATEGORY_LABELS[key]}</span>
        <div class="chart-track"><div class="chart-fill cat-${key}" style="width:${pct}%"></div></div>
        <span class="chart-value">${val.toFixed(2)}kg</span>
      </div>`;
  }).join('');
}

function goalMessageHtml(){
  if (state.goal === null || state.goal === undefined) return '';
  if (state.total <= state.goal){
    return `<p class="goal-badge success">🎯 目標（${state.goal}kg以下）達成！</p>`;
  }
  const diff = (state.total - state.goal).toFixed(1);
  return `<p class="goal-badge miss">🎯 目標まであと ${diff}kg</p>`;
}

function historyCompareHtml(history){
  const past = history.filter(h => h.date !== todayStr());
  if (past.length === 0) return '';
  const avg = past.reduce((sum, h) => sum + h.total, 0) / past.length;
  const diff = state.total - avg;
  const arrow = diff > 0.2 ? '↑' : diff < -0.2 ? '↓' : '→';
  const cls = diff > 0.2 ? 'up' : diff < -0.2 ? 'down' : 'flat';
  return `<p class="history-compare ${cls}">これまでの平均 ${avg.toFixed(1)}kg と比べて ${arrow} ${Math.abs(diff).toFixed(1)}kg</p>`;
}

function showResult(){
  const { grade, cls, msg } = rankFor(state.total);
  const tipKey = biggestCategory();
  const chart = buildBreakdownChart();

  const message = state.total === 0
    ? '今日の行動はとてもエコです！この調子で続けましょう🌿'
    : msg;

  const updatedHistory = saveHistoryEntry({
    date: todayStr(),
    total: state.total,
    breakdown: state.breakdown
  });

  removeTyping();
  updateGauge();

  // short confirmation in the chat itself
  addBubble('診断が完了したよ🎉 結果を見てみよう👇', 'ai');

  const body = document.getElementById('resultModalBody');
  if (body){
    body.innerHTML = `
      <div class="rank ${cls}">${grade}<span class="rank-label">ランク</span></div>
      <p class="result-summary">本日の推定排出量: <strong>${state.total.toFixed(1)} kg CO2</strong></p>
      <div class="result-breakdown">${chart}</div>
      ${goalMessageHtml()}
      ${historyCompareHtml(updatedHistory)}
      <p class="result-message">${message}</p>
      <p class="result-tip">${TIPS[tipKey]}</p>
      <div class="result-modal-actions">
        <button id="resultRestartBtn" class="reply-btn restart" type="button">
          <span class="btn-icon">↻</span><span class="btn-text">もう一度診断する</span>
        </button>
      </div>
    `;
    const restartBtn = document.getElementById('resultRestartBtn');
    if (restartBtn) restartBtn.onclick = () => { closeResultModal(); restart(); };
  }
  openResultModal();

  renderOptions([
    { label: '結果を見る', icon: '📊', showResultModal: true },
    { label: 'もう一度診断する', icon: '↻', next: 'intro', restart: true }
  ]);
}

function restart(){
  state = { total: 0, goal: null, breakdown: { transport: 0, electricity: 0, meal: 0, waste: 0 } };
  transportChoice = null;
  updateGauge();
  chatLog.innerHTML = '';
  clearOptions();
  closeResultModal();
  closeCalendarModal();
  goToStep('intro');
}

/* AI診断結果 modal */
function openResultModal(){
  const overlay = document.getElementById('resultOverlay');
  if (!overlay) return;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}
function closeResultModal(){
  const overlay = document.getElementById('resultOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

  //  Real calendar modal (history)
let calendarCursor = new Date(); 

function openCalendarModal(){
  const overlay = document.getElementById('calendarOverlay');
  if (!overlay) return;
  calendarCursor = new Date();
  renderCalendar();
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}
function closeCalendarModal(){
  const overlay = document.getElementById('calendarOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

function dateKey(y, m, d){
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function renderCalendar(){
  const grid = document.getElementById('calendarGrid');
  const label = document.getElementById('calMonthLabel');
  const detail = document.getElementById('calendarDetail');
  if (!grid || !label) return;

  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  label.textContent = `${y}年 ${m + 1}月`;

  const hist = loadHistory();
  const byDate = {};
  hist.forEach(h => { byDate[h.date] = h; });

  const firstWeekday = new Date(y, m, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayKey = todayStr();

  let html = '';
  for (let i = 0; i < firstWeekday; i++){
    html += `<div class="cal-day empty"></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++){
    const key = dateKey(y, m, d);
    const entry = byDate[key];
    const classes = ['cal-day'];
    if (key === todayKey) classes.push('today');
    if (entry) classes.push('has-entry');
    let dot = '';
    if (entry){
      const rank = rankFor(entry.total).grade;
      dot = `<span class="cal-dot rank-${rank}"></span>`;
    }
    html += `<button type="button" class="${classes.join(' ')}" data-date="${key}">${d}${dot}</button>`;
  }
  grid.innerHTML = html;

  grid.querySelectorAll('.cal-day.has-entry').forEach(btn => {
    btn.onclick = () => selectCalendarDay(btn.dataset.date, byDate[btn.dataset.date]);
  });

  if (detail) detail.innerHTML = '<p class="cd-empty">記録のある日をタップすると詳細が見られるよ📊</p>';
}

function selectCalendarDay(key, entry){
  document.querySelectorAll('.cal-day.selected').forEach(el => el.classList.remove('selected'));
  const btn = document.querySelector(`.cal-day[data-date="${key}"]`);
  if (btn) btn.classList.add('selected');

  const detail = document.getElementById('calendarDetail');
  if (!detail || !entry) return;
  const { grade } = rankFor(entry.total);
  const chartHtml = Object.entries(entry.breakdown).map(([k, v]) => {
    const max = Math.max(...Object.values(entry.breakdown), 0.01);
    const pct = Math.max(Math.min((v / max) * 100, 100), v > 0 ? 3 : 0);
    return `
      <div class="chart-row">
        <span class="chart-label">${CATEGORY_LABELS[k]}</span>
        <div class="chart-track"><div class="chart-fill cat-${k}" style="width:${pct}%"></div></div>
        <span class="chart-value">${v.toFixed(2)}kg</span>
      </div>`;
  }).join('');

  detail.innerHTML = `
    <p class="cd-date">${key}</p>
    <p class="cd-total">合計 <strong>${entry.total.toFixed(1)} kg CO2</strong>（${grade}ランク）</p>
    <div class="result-breakdown">${chartHtml}</div>
  `;
}

  // Boot
const historyToggleBtn = document.getElementById('historyToggle');
if (historyToggleBtn) historyToggleBtn.onclick = openCalendarModal;

const calendarClose = document.getElementById('calendarClose');
if (calendarClose) calendarClose.onclick = closeCalendarModal;
const calendarOverlay = document.getElementById('calendarOverlay');
if (calendarOverlay) calendarOverlay.onclick = (e) => { if (e.target === calendarOverlay) closeCalendarModal(); };

const calPrev = document.getElementById('calPrev');
if (calPrev) calPrev.onclick = () => { calendarCursor.setMonth(calendarCursor.getMonth() - 1); renderCalendar(); };
const calNext = document.getElementById('calNext');
if (calNext) calNext.onclick = () => { calendarCursor.setMonth(calendarCursor.getMonth() + 1); renderCalendar(); };

const resultClose = document.getElementById('resultClose');
if (resultClose) resultClose.onclick = closeResultModal;
const resultOverlay = document.getElementById('resultOverlay');
if (resultOverlay) resultOverlay.onclick = (e) => { if (e.target === resultOverlay) closeResultModal(); };

updateGauge();
goToStep('intro');