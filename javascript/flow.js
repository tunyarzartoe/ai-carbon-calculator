window.transportChoice = null;
window.currentStepId = null;

window.steps = [
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
    onAnswer: function(val){ window.state.goal = val; }
  },
  {
    id: 'transport',
    ai: ['Q1. 通学・移動手段は主に何かな？'],
    options: Object.entries(window.TRANSPORT).map(([key, v]) => ({
      label: v.label,
      icon: key === 'walk' ? '🚶' : key === 'train' ? '🚆' : key === 'bus' ? '🚌' : '🚗',
      value: key,
      next: 'distance'
    })),
    onAnswer: function(val){ window.transportChoice = val; }
  },
  {
    id: 'distance',
    ai: ['なるほど。だいたいの片道の距離は？'],
    options: Object.entries(window.DISTANCE_KM).map(([key, v]) => ({
      label: v.label,
      icon: key === 'short' ? '📍' : key === 'medium' ? '🛤️' : '🛣️',
      value: key,
      next: 'electricity'
    })),
    onAnswer: function(val){
      const kgPerKm = window.TRANSPORT[window.transportChoice].kgPerKm || 0;
      const km = window.DISTANCE_KM[val].km || 0;
      const totalKm = km * 2;
      const kg = +(kgPerKm * totalKm).toFixed(2);
      window.addResult('transport', kg, `移動: ${window.TRANSPORT[window.transportChoice].label} / ${window.DISTANCE_KM[val].label}（往復 ${totalKm}km）→ 約 ${kg}kg`);
    }
  },
  {
    id: 'electricity',
    ai: ['Q2. 家での電気の使い方は？(エアコン・ゲーム・照明など)'],
    options: Object.entries(window.ELECTRICITY).map(([key, v]) => ({
      label: v.label,
      icon: key === 'low' ? '💡' : key === 'medium' ? '🔌' : '⚡',
      value: key,
      next: 'meal'
    })),
    onAnswer: function(val){
      const hours = window.ELECTRICITY[val].hoursKwh || 0;
      const kg = +(window.GRID_INTENSITY * hours).toFixed(2);
      window.addResult('electricity', kg, `電気使用: ${window.ELECTRICITY[val].label}（約 ${hours} kWh）→ 約 ${kg}kg`);
    }
  },
  {
    id: 'meal',
    ai: ['Q3. 今日の食事はどんな感じ？'],
    options: Object.entries(window.MEAL).map(([key, v]) => ({
      label: v.label,
      icon: key === 'veggie' ? '🥗' : key === 'mixed' ? '🍛' : '🍖',
      value: key,
      next: 'waste'
    })),
    onAnswer: function(val){
      const kg = +window.MEAL[val].kg.toFixed(2);
      window.addResult('meal', kg, `食事: ${window.MEAL[val].label} → 約 ${kg}kg`);
    }
  },
  {
    id: 'waste',
    ai: ['最後の質問。ゴミの分別はどのくらいしてる？'],
    options: Object.entries(window.WASTE).map(([key, v]) => ({
      label: v.label,
      icon: key === 'always' ? '♻️' : key === 'sometimes' ? '🗑️' : '🚯',
      value: key,
      next: 'result'
    })),
    onAnswer: function(val){
      const kg = +window.WASTE[val].kg.toFixed(2);
      window.addResult('waste', kg, `ゴミ分別: ${window.WASTE[val].label} → 約 ${kg}kg`);
    }
  }
];

function goToStep(stepId){
  if (!stepId) return;
  if (stepId === 'result') return;
  const step = window.steps.find(s => s.id === stepId);
  if (!step) return;
  window.currentStepId = stepId;
  window.clearOptions();
  const lines = stepId === 'intro' ? step.ai : [window.randomAck(), ...step.ai];
  window.aiSpeak(lines, () => window.renderOptions(step.options, selectOption));
}

function selectOption(opt){
  if (opt.showResultModal){
    window.openResultModal();
    return;
  }

  window.clearOptions();
  window.addBubble(opt.label, 'user');

  if (opt.value !== undefined){
    const currentStep = window.steps.find(s => s.id === window.currentStepId) || window.steps.find(s => s.options.some(o => o === opt));
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

function showResult(){
  const { grade, cls, msg } = window.rankFor(window.state.total);
  const chart = window.buildBreakdownChart(window.state.breakdown);
  const message = window.state.total === 0
    ? '今日の行動はとてもエコです！この調子で続けましょう🌿'
    : msg;

  const updatedHistory = window.saveHistoryEntry({
    date: window.todayStr(),
    total: window.state.total,
    breakdown: window.state.breakdown
  });

  window.removeTyping();
  window.updateGauge();

  window.addBubble('診断が完了したよ🎉 結果を見てみよう👇', 'ai');

  const body = document.getElementById('resultModalBody');
  if (body){
    body.innerHTML = `\n      <div class="rank ${cls}">${grade}<span class="rank-label">ランク</span></div>\n      <p class="result-summary">本日の推定排出量: <strong>${window.state.total.toFixed(1)} kg CO2</strong></p>\n      <div class="result-breakdown">${chart}</div>\n      ${window.goalMessageHtml(window.state.goal, window.state.total)}\n      ${window.historyCompareHtml(updatedHistory, window.state.total)}\n      <p class="result-message">${message}</p>\n      <p class="result-tip">${window.TIPS[Object.keys(window.state.breakdown).sort((a,b)=>window.state.breakdown[b]-window.state.breakdown[a])[0]]}</p>\n      <div class="result-modal-actions">\n        <button id="resultRestartBtn" class="reply-btn restart" type="button">\n          <span class="btn-icon">↻</span><span class="btn-text">もう一度診断する</span>\n        </button>\n      </div>\n    `;
    const restartBtn = document.getElementById('resultRestartBtn');
    if (restartBtn) restartBtn.onclick = () => { window.closeResultModal(); restart(); };
  }
  window.openResultModal();

  window.renderOptions([
    { label: '結果を見る', icon: '📊', showResultModal: true },
    { label: 'もう一度診断する', icon: '↻', next: 'intro', restart: true }
  ], selectOption);
}

function restart(){
  window.state.total = 0;
  window.state.goal = null;
  window.state.breakdown = { transport: 0, electricity: 0, meal: 0, waste: 0 };
  window.transportChoice = null;
  window.updateGauge();
  document.getElementById('chatLog').innerHTML = '';
  window.clearOptions();
  window.closeResultModal();
  window.closeCalendarModal();
  goToStep('intro');
}

function initApp(){
  window.updateGauge();
  goToStep('intro');
}

window.initApp = initApp;