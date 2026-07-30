const chatLog = document.getElementById('chatLog');
const replyOptions = document.getElementById('replyOptions');
const gaugeFill = document.getElementById('gaugeFill');
const gaugeValueEl = document.getElementById('gaugeValue');

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
  // console.log('chat.showTyping');
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
  // else console.log('chat.removeTyping: no indicator found');
}

function aiSpeak(lines, done){
  // console.log('chat.aiSpeak start', Array.isArray(lines) ? lines.slice(0,3) : lines);
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

function renderOptions(options, onSelect){
  replyOptions.innerHTML = '';

  // 前のセッションで残ってしまった quiz-header があれば掃除する（過去バージョンの後始末）
  const staleHeaders = replyOptions.parentElement.querySelectorAll(':scope > .quiz-header');
  staleHeaders.forEach(el => el.remove());

  // クイズの場合は見出しを表示する。#replyOptions の中に入れておくことで、
  // 次回の renderOptions() 呼び出し時（replyOptions.innerHTML = ''）に
  // 自動的に消える（外に置くと消されずに蓄積してレイアウトが壊れるため）。
  const isQuiz = options.some(opt => opt.isQuizAnswer);
  if (isQuiz){
    const header = document.createElement('div');
    header.className = 'quiz-header';
    header.innerHTML = '<span class="quiz-indicator">🧠 クイズに答えよう</span>';
    replyOptions.appendChild(header);
  }

  options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    
    let className = 'reply-btn';
    if (opt.restart) className += ' restart';
    if (opt.isQuizAnswer) className += ' quiz-option';
    
    btn.className = className;
    
    if (opt.isQuizAnswer){
      btn.setAttribute('data-quiz-answer', 'true');
      btn.setAttribute('data-quiz-label', opt.icon);
    }
    
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
    
    btn.onclick = () => onSelect(opt);
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
  window.state.breakdown[category] = kg;
  const sum = Object.values(window.state.breakdown).reduce((s, v) => s + v, 0);
  window.state.total = +sum.toFixed(2);
  console.debug('chat.addResult', { category, kg, breakdown: window.state.breakdown, total: window.state.total });
  updateGauge();
  if (note){
    addBubble(note, 'ai');
  }
}

function updateGauge(){
  const total = Math.max(0, Number(window.state.total) || 0);
  const ratio = Math.min(total / 30, 1);
  const offset = 326.7 * (1 - ratio);
  gaugeFill.style.strokeDashoffset = offset;
  gaugeValueEl.textContent = total.toFixed(1);
  let color = 'var(--mint)';
  if (total > 16) color = 'var(--danger)';
  else if (total > 11) color = 'var(--warn)';
  else if (total > 6) color = 'var(--cyan)';
  gaugeFill.style.stroke = color;
  console.debug('chat.updateGauge', { total, ratio, color, offset });
}

window.scrollToBottom = scrollToBottom;
window.addBubble = addBubble;
window.showTyping = showTyping;
window.removeTyping = removeTyping;
window.aiSpeak = aiSpeak;
window.renderOptions = renderOptions;
window.clearOptions = clearOptions;
window.addResult = addResult;
window.updateGauge = updateGauge;