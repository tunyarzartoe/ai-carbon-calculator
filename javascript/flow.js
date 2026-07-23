window.transportChoice = null;
window.currentStepId = null;

window.steps = [
  {
    id: 'intro',
    ai: function(){
      const history = window.loadHistory();
      const weekly = window.getWeeklyChallenge();
      const g = window.loadGamifyState();
      const weeklyCleared = g.weeklyKey === weekly.key && g.weeklyCleared;

      if (history.length === 0){
        return [
          'こんにちは。私は CO2 Compass、きみの1日の生活からおおよそのCO2排出量を推定するAIだよ🌱',
          '4つの質問に答えるだけ。正確な数値じゃなく「だいたいの目安」として見てね。さっそく始めよう。'
        ];
      }

      const streak = window.computeStreak(history);
      const streakLine = streak >= 2
        ? `おかえり！${streak}日連続で診断できてるね🔥 この調子でいこう。`
        : 'おかえり！今日も一緒に診断していこう。';
      const weeklyLine = weeklyCleared
        ? `${weekly.icon} 今週のチャレンジ「${weekly.text}」はもうクリア済みだよ✅`
        : `${weekly.icon} 今週のチャレンジ: ${weekly.text}`;
      return [streakLine, weeklyLine];
    },
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
      const grid = window.getRegionalGridIntensity();
      const kg = +(grid.value * hours).toFixed(2);
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
      next: 'quiz'
    })),
    onAnswer: function(val){
      const kg = +window.WASTE[val].kg.toFixed(2);
      window.addResult('waste', kg, `ゴミ分別: ${window.WASTE[val].label} → 約 ${kg}kg`);
    }
  },
  {
    id: 'quiz',
    ai: function(){
      window.currentQuiz = window.pickRandomQuiz();
      return [`ちょっと一息、クイズです🧠<br>${window.currentQuiz.q}`];
    },
    options: [], // populated dynamically in goToStep for this step
    onAnswer: function(){} // handled specially in selectQuizAnswer
  }
];

function goToStep(stepId){
  if (!stepId){
    console.warn('flow.goToStep called without stepId');
    return;
  }
  if (stepId === 'result'){
    console.warn('flow.goToStep called with reserved stepId result');
    return;
  }
  const step = window.steps.find(s => s.id === stepId);
  if (!step){
    console.error('flow.goToStep could not find step', stepId);
    return;
  }
  window.currentStepId = stepId;
  window.clearOptions();
  console.debug('flow.goToStep', { stepId, currentStepId: window.currentStepId });

  if (stepId === 'quiz'){
    window.currentQuiz = window.pickRandomQuiz();
    const lines = [window.randomAck(), ...step.ai()];
    const quiz = window.currentQuiz;
    if (!quiz){
      console.error('flow.goToStep quiz step could not pick a quiz');
      showResult();
      return;
    }
    const letters = ['Ⓐ', 'Ⓑ', 'Ⓒ'];
    const quizOptions = quiz.choices.map((choice, i) => ({
      label: choice.label,
      icon: letters[i] || '❓',
      correct: choice.correct,
      isQuizAnswer: true
    }));
    console.debug('flow.goToStep quiz', { quizIndex: window.lastQuizIndex, quiz: quiz.q });
    window.aiSpeak(lines, () => window.renderOptions(quizOptions, selectOption));
    return;
  }

  const lines = stepId === 'intro' ? step.ai() : [window.randomAck(), ...step.ai];
  window.aiSpeak(lines, () => window.renderOptions(step.options, selectOption));
}

function selectOption(opt){
  console.debug('flow.selectOption', { opt, currentStepId: window.currentStepId });
  if (opt.isQuizAnswer){
    window.clearOptions();
    
    // Remove quiz header if present
    const quizHeader = document.querySelector('.quiz-header');
    if (quizHeader) quizHeader.remove();
    
    window.addBubble(opt.label, 'user');
    window.lastQuizCorrect = opt.correct;
    const fact = window.currentQuiz ? window.currentQuiz.fact : 'クイズ情報が見つかりませんでした。';
    
    const resultLine = opt.correct
      ? `🎉 正解！`
      : `😅 おしい、不正解。`;
    
    // Show feedback with enhanced styling
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = `quiz-feedback ${opt.correct ? '' : 'incorrect'}`;
    const feedbackContent = document.createElement('div');
    feedbackContent.innerHTML = `${resultLine}<div class="quiz-fact">${fact}</div>`;
    feedbackDiv.appendChild(feedbackContent);
    document.getElementById('chatLog').appendChild(feedbackDiv);
    
    setTimeout(() => {
      document.getElementById('chatLog').scrollTop = document.getElementById('chatLog').scrollHeight;
      setTimeout(showResult, 500);
    }, 300);
    return;
  }

  if (opt.showResultModal){
    console.debug('flow.selectOption opening result modal');
    window.openResultModal();
    return;
  }

  if (opt.showAchievements){
    console.debug('flow.selectOption opening achievements modal');
    window.openAchievementsModal();
    return;
  }

  window.clearOptions();
  window.addBubble(opt.label, 'user');

  if (opt.value !== undefined){
    const currentStep = window.steps.find(s => s.id === window.currentStepId) || window.steps.find(s => s.options.some(o => o === opt));
    if (!currentStep){
      console.warn('flow.selectOption could not determine currentStep for answer', opt);
    }
    if (currentStep && currentStep.onAnswer){
      console.debug('flow.selectOption executing onAnswer', { stepId: currentStep.id, value: opt.value });
      currentStep.onAnswer(opt.value);
    }
  }

  if (opt.restart){
    console.debug('flow.selectOption restarting flow');
    return setTimeout(restart, 300);
  }

  if (opt.next === 'result'){
    console.debug('flow.selectOption navigating to result');
    setTimeout(showResult, 400);
  } else if (opt.next){
    console.debug('flow.selectOption navigating to next step', opt.next);
    setTimeout(() => goToStep(opt.next), 300);
  } else {
    console.warn('flow.selectOption has no next action', opt);
  }
}

function showResult(){
  console.debug('flow.showResult start', { state: window.state, currentStepId: window.currentStepId, lastQuizCorrect: window.lastQuizCorrect });
  const { grade, cls, msg } = window.rankFor(window.state.total);
  const chart = window.buildBreakdownChart(window.state.breakdown);
  const message = window.state.total === 0
    ? '今日の行動はとてもエコです！この調子で続けましょう🌿'
    : msg;
  const tipCategory = Object.keys(window.state.breakdown).sort((a, b) => window.state.breakdown[b] - window.state.breakdown[a])[0];
  const tipText = window.TIPS[tipCategory];

  const updatedHistory = window.saveHistoryEntry({
    date: window.todayStr(),
    total: window.state.total,
    breakdown: window.state.breakdown
  });

  const streak = window.computeStreak(updatedHistory);
  const quizWasCorrect = window.lastQuizCorrect;
  const xpResult = window.awardXp(quizWasCorrect, streak);
  window.lastQuizCorrect = undefined;
  const weeklyResult = window.evaluateWeeklyChallenge(window.state.breakdown, window.state.total);
  const newBadges = window.checkAchievements(grade, streak, quizWasCorrect);
  console.debug('flow.showResult summary', { grade, msg, streak, xpResult, weeklyResult, newBadges, updatedHistoryLength: updatedHistory.length });
  window.updateLevelBadge();
  window.vibrateForGrade(grade);

  window.removeTyping();
  window.updateGauge();

  window.addBubble('診断が完了したよ🎉 結果を見てみよう👇', 'ai');

  if (xpResult.leveledUp){
    const toast = document.createElement('div');
    toast.className = 'bubble ai level-up-toast';
    toast.innerHTML = `🎉 レベルアップ！ Lv.${xpResult.level} になったよ`;
    document.getElementById('chatLog').appendChild(toast);
    window.scrollToBottom();
  }

  if (weeklyResult.justCleared){
    const toast = document.createElement('div');
    toast.className = 'bubble ai badge-unlock-toast';
    toast.innerHTML = `${weeklyResult.challenge.icon} 今週のチャレンジをクリア！ +${weeklyResult.bonusXp}XP`;
    document.getElementById('chatLog').appendChild(toast);
    window.scrollToBottom();
  }

  if (newBadges.length > 0){
    window.vibrateForBadge();
    newBadges.forEach(b => {
      const toast = document.createElement('div');
      toast.className = 'bubble ai badge-unlock-toast';
      toast.innerHTML = `${b.icon} 新しいバッジ「${b.title}」を獲得！`;
      document.getElementById('chatLog').appendChild(toast);
    });
    window.scrollToBottom();
  }

  const streakBadgeHtml = xpResult.streakBonus > 0
    ? `<p class="streak-badge">🔥 ${streak}日連続診断ボーナス +${xpResult.streakBonus}XP</p>`
    : '';

  const body = document.getElementById('resultModalBody');
  if (body){
    body.innerHTML = `\n      <div class="rank ${cls}">${grade}<span class="rank-label">ランク</span></div>\n      <p class="result-summary">本日の推定排出量: <strong>${window.state.total.toFixed(1)} kg CO2</strong></p>\n      <div class="result-breakdown">${chart}</div>\n      ${window.goalMessageHtml(window.state.goal, window.state.total)}\n      ${window.historyCompareHtml(updatedHistory, window.state.total)}\n      ${window.co2EquivalentHtml(window.state.total)}\n      <p class="result-message">${message}</p>\n      <p class="result-tip">${tipText}</p>\n      <div id="weatherTipSlot"></div>\n      <div class="xp-block">\n        <div class="xp-row"><span class="xp-label">Lv.${xpResult.level}</span><span class="xp-gain">+${xpResult.gained}XP</span></div>\n        <div class="xp-track"><div class="xp-fill" style="width:${(xpResult.xpIntoLevel / xpResult.xpPerLevel) * 100}%"></div></div>\n      </div>\n      ${streakBadgeHtml}\n      <div class="result-modal-actions">\n        <button id="resultAchievementsBtn" class="reply-btn" type="button">\n          <span class="btn-icon">🎓</span><span class="btn-text">認定証を見る</span>\n        </button>\n        <button id="resultRestartBtn" class="reply-btn restart" type="button">\n          <span class="btn-icon">↻</span><span class="btn-text">もう一度診断する</span>\n        </button>\n      </div>\n    `;
    const restartBtn = document.getElementById('resultRestartBtn');
    if (restartBtn) restartBtn.onclick = () => { window.closeResultModal(); restart(); };

    const achievementsBtn = document.getElementById('resultAchievementsBtn');
    if (achievementsBtn) achievementsBtn.onclick = () => window.openAchievementsModal();

    // 天気は非同期で取得されるので、届き次第あとから差し込む
    // （初回の診断完了時にだけ位置情報の許可を求める＝起動直後に求めない）
    if (!window.weatherTipPromise){
      window.weatherTipPromise = window.fetchWeatherTip();
    }
    window.weatherTipPromise.then((weather) => {
      if (!weather) return;
      const slot = document.getElementById('weatherTipSlot');
      if (!slot) return; // モーダルがすでに閉じられた/再描画された場合は何もしない
      slot.innerHTML = `<p class="weather-tip">${weather.icon} ${weather.text}</p>`;
    });
  }
  window.openResultModal();

  window.renderOptions([
    { label: '結果を見る', icon: '📊', showResultModal: true },
    { label: '認定証を見る', icon: '🎓', showAchievements: true },
    { label: 'もう一度診断する', icon: '↻', next: 'intro', restart: true }
  ], selectOption);
}

function restart(){
  console.debug('flow.restart resetting state');
  window.state.total = 0;
  window.state.goal = null;
  window.state.breakdown = { transport: 0, electricity: 0, meal: 0, waste: 0 };
  window.transportChoice = null;
  window.lastQuizCorrect = undefined;
  window.currentQuiz = null;
  window.updateGauge();
  const chatLogEl = document.getElementById('chatLog');
  if (chatLogEl) chatLogEl.innerHTML = '';
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