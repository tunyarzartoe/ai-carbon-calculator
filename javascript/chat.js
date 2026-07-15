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
  console.log('chat.renderOptions', options.map(o => o.label));
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
  window.state.breakdown[category] += kg;
  window.state.total = +(window.state.total + kg).toFixed(2);
  updateGauge();
  if (note){
    addBubble(note, 'ai');
  }
}

function updateGauge(){
  const ratio = Math.min(window.state.total / 30, 1);
  const offset = 326.7 * (1 - ratio);
  gaugeFill.style.strokeDashoffset = offset;
  gaugeValueEl.textContent = window.state.total.toFixed(1);

  let color = 'var(--mint)';
  if (window.state.total > 16) color = 'var(--danger)';
  else if (window.state.total > 11) color = 'var(--warn)';
  else if (window.state.total > 6) color = 'var(--cyan)';
  gaugeFill.style.stroke = color;
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