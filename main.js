/* =========================================================
   CO2 Compass — rule-based "AI" carbon footprint chatbot
   Not a real AI API — a scripted decision engine that talks
   like one. Works fully offline, no API key needed.
   ========================================================= */

// ---- DOM refs ----
const chatLog       = document.getElementById('chatLog');
const replyOptions  = document.getElementById('replyOptions');
const gaugeFill     = document.getElementById('gaugeFill');
const gaugeValueEl  = document.getElementById('gaugeValue');

const GAUGE_CIRCUMFERENCE = 326.7; // 2 * PI * r(52)
const GAUGE_MAX_KG = 30;           // adjusted scale for realistic daily totals

// ---- running state ----
let state = {
  total: 0,
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

/* =========================================================
   Conversation script
   ========================================================= */
let transportChoice = null;
let currentStepId = null;

const steps = [
  {
    id: 'intro',
    ai: [
      'こんにちは。私は CO2 Compass、きみの1日の生活からおおよそのCO2排出量を推定するAIだよ🌱',
      '4つの質問に答えるだけ。正確な数値じゃなく「だいたいの目安」として見てね。さっそく始めよう。'
    ],
    options: [{ label: 'はじめる', icon: '✨', next: 'transport' }]
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
    btn.className = 'reply-btn';
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
  if (state.total > 15) color = 'var(--danger)';
  else if (state.total > 9) color = 'var(--warn)';
  else if (state.total > 5) color = 'var(--cyan)';
  gaugeFill.style.stroke = color;
}

function goToStep(stepId){
  if (!stepId) return;
  if (stepId === 'result'){ return; } // handled after waste step finishes
  const step = steps.find(s => s.id === stepId);
  if (!step) return;
  currentStepId = stepId;
  clearOptions();
  aiSpeak(step.ai, () => renderOptions(step.options));
}

function selectOption(opt){
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

/* =========================================================
   Final result
   ========================================================= */
function rankFor(total){
  if (total <= 5)  return { grade: 'S', cls: '',        msg: 'とてもエコな1日！このまま続けよう🌿' };
  if (total <= 9)  return { grade: 'A', cls: '',        msg: '良いバランスだね。あと一歩でSランク！' };
  if (total <= 13) return { grade: 'B', cls: 'warn',    msg: 'まずまず。1つ習慣を見直すと変わるよ。' };
  if (total <= 17) return { grade: 'C', cls: 'warn',    msg: '改善の余地あり。下のヒントを試してみよう。' };
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

function showResult(){
  const { grade, cls, msg } = rankFor(state.total);
  const tipKey = biggestCategory();
  const breakdown = Object.entries(state.breakdown)
    .map(([key, value]) => `
      <div class="result-detail">
        <span>${CATEGORY_LABELS[key]}</span>
        <strong>${value.toFixed(2)}kg</strong>
      </div>
    `).join('');

  const message = state.total === 0
    ? '今日の行動はとてもエコです！この調子で続けましょう🌿'
    : msg;

  removeTyping();
  updateGauge();

  const div = document.createElement('div');
  div.className = 'bubble ai result';
  div.innerHTML = `
    <span class="ai-tag">AI 診断結果</span>
    <div class="rank ${cls}">${grade}<span class="rank-label">ランク</span></div>
    <p class="result-summary">本日の推定排出量: <strong>${state.total.toFixed(1)} kg CO2</strong></p>
    <div class="result-breakdown">${breakdown}</div>
    <p class="result-message">${message}</p>
    <p class="result-tip">${TIPS[tipKey]}</p>
  `;
  chatLog.appendChild(div);

  renderOptions([{ label: 'もう一度診断する', icon: '↻', next: 'intro', restart: true }]);
  const restartBtn = replyOptions.querySelector('.reply-btn');
  if (restartBtn) {
    restartBtn.classList.add('restart');
  }
}

function restart(){
  state = { total: 0, breakdown: { transport: 0, electricity: 0, meal: 0, waste: 0 } };
  transportChoice = null;
  updateGauge();
  chatLog.innerHTML = '';
  clearOptions();
  goToStep('intro');
}

/* =========================================================
   Boot
   ========================================================= */
updateGauge();
goToStep('intro');