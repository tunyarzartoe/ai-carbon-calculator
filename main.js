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
const GAUGE_MAX_KG = 20;           // scale: 0kg -> 20kg maps to 0% -> 100%

// ---- running state ----
let state = {
  total: 0,
  breakdown: { transport: 0, electricity: 0, meal: 0, waste: 0 }
};

/* =========================================================
   Emission factors (simplified estimates for teaching demo)
   ========================================================= */
const TRANSPORT = {
  walk:  { label: '徒歩・自転車', kgPerDay: 0 },
  train: { label: '電車',        kgPerDay: 0.04 * 20 }, // 20km/day avg
  bus:   { label: 'バス',        kgPerDay: 0.08 * 20 },
  car:   { label: '車',          kgPerDay: 0.17 * 20 }
};
const DISTANCE_MULT = {
  short:  { label: '近い (〜5km)',  mult: 0.4 },
  medium: { label: '普通 (5〜15km)', mult: 1.0 },
  long:   { label: '遠い (15km〜)',  mult: 1.8 }
};
const ELECTRICITY = {
  low:    { label: '少ない (こまめに消す)', kg: 0.46 * 2 },
  medium: { label: '普通',                 kg: 0.46 * 5 },
  high:   { label: '多い (エアコン・ゲーム長時間)', kg: 0.46 * 10 }
};
const MEAL = {
  veggie: { label: '野菜中心', kg: 1.5 },
  mixed:  { label: 'バランス型', kg: 4.0 },
  meat:   { label: '肉・揚げ物多め', kg: 8.0 }
};
const WASTE = {
  always:    { label: '必ず分別する', kg: 0.1 },
  sometimes: { label: 'たまに分別する', kg: 0.3 },
  rarely:    { label: 'あまりしない', kg: 0.6 }
};

/* =========================================================
   Conversation script
   ========================================================= */
let transportChoice = null;

const steps = [
  {
    id: 'intro',
    ai: [
      'こんにちは。私は CO2 Compass、きみの1日の生活からおおよそのCO2排出量を推定するAIだよ🌱',
      '4つの質問に答えるだけ。正確な数値じゃなく「だいたいの目安」として見てね。さっそく始めよう。'
    ],
    options: [{ label: 'はじめる ▶', next: 'transport' }]
  },
  {
    id: 'transport',
    ai: ['Q1. 通学・移動手段は主に何かな？'],
    options: Object.entries(TRANSPORT).map(([key, v]) => ({
      label: v.label, value: key, next: 'distance'
    })),
    onAnswer: (val) => { transportChoice = val; }
  },
  {
    id: 'distance',
    ai: ['なるほど。だいたいの片道の距離は？'],
    options: Object.entries(DISTANCE_MULT).map(([key, v]) => ({
      label: v.label, value: key, next: 'electricity'
    })),
    onAnswer: (val) => {
      const base = TRANSPORT[transportChoice].kgPerDay;
      const kg = +(base * DISTANCE_MULT[val].mult).toFixed(2);
      addResult('transport', kg,
        `移動: ${TRANSPORT[transportChoice].label} / ${DISTANCE_MULT[val].label} → 約 ${kg}kg`);
    }
  },
  {
    id: 'electricity',
    ai: ['Q2. 家での電気の使い方は？(エアコン・ゲーム・照明など)'],
    options: Object.entries(ELECTRICITY).map(([key, v]) => ({
      label: v.label, value: key, next: 'meal'
    })),
    onAnswer: (val) => {
      const kg = +ELECTRICITY[val].kg.toFixed(2);
      addResult('electricity', kg, `電気使用: ${ELECTRICITY[val].label} → 約 ${kg}kg`);
    }
  },
  {
    id: 'meal',
    ai: ['Q3. 今日の食事はどんな感じ？'],
    options: Object.entries(MEAL).map(([key, v]) => ({
      label: v.label, value: key, next: 'waste'
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
      label: v.label, value: key, next: 'result'
    })),
    onAnswer: (val) => {
      const kg = +WASTE[val].kg.toFixed(2);
      addResult('waste', kg, `ゴミ分別: ${WASTE[val].label} → 約 ${kg}kg`);
    }
  }
];

/* =========================================================
   Chat rendering helpers
   ========================================================= */
function scrollToBottom(){
  chatLog.scrollTop = chatLog.scrollHeight;
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
  scrollToBottom();
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
    btn.textContent = opt.label;
    btn.onclick = () => selectOption(opt);
    replyOptions.appendChild(btn);
  });
}

function clearOptions(){ replyOptions.innerHTML = ''; }

function addResult(category, kg, note){
  state.breakdown[category] += kg;
  state.total = +(state.total + kg).toFixed(2);
  updateGauge();
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

/* =========================================================
   Flow control
   ========================================================= */
function goToStep(stepId){
  if (!stepId) return;
  if (stepId === 'result'){ return; } // handled after waste step finishes
  const step = steps.find(s => s.id === stepId);
  if (!step) return;
  clearOptions();
  aiSpeak(step.ai, () => renderOptions(step.options));
}

function selectOption(opt){
  clearOptions();
  addBubble(opt.label, 'user');

  if (opt.value !== undefined){
    const currentStep = steps.find(s => s.options.some(o => o === opt));
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
  scrollToBottom();

  renderOptions([{ label: '↻ もう一度診断する', next: 'intro', restart: true }]);
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