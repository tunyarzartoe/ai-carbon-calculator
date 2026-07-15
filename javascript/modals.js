function openResultModal(){
  // console.log('modals.openResultModal');
  const overlay = document.getElementById('resultOverlay');
  if (!overlay) return console.log('modals.openResultModal: overlay not found');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeResultModal(){
  // console.log('modals.closeResultModal');
  const overlay = document.getElementById('resultOverlay');
  if (!overlay) return console.log('modals.closeResultModal: overlay not found');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

function openCalendarModal(){
  // console.log('modals.openCalendarModal');
  const overlay = document.getElementById('calendarOverlay');
  if (!overlay) return console.log('modals.openCalendarModal: overlay not found');
  window.calendarCursor = new Date();
  renderCalendar();
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeCalendarModal(){
  // console.log('modals.closeCalendarModal');
  const overlay = document.getElementById('calendarOverlay');
  if (!overlay) return console.log('modals.closeCalendarModal: overlay not found');
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

  const y = window.calendarCursor.getFullYear();
  const m = window.calendarCursor.getMonth();
  label.textContent = `${y}年 ${m + 1}月`;

  const hist = window.loadHistory();
  const byDate = {};
  hist.forEach(h => { byDate[h.date] = h; });

  const firstWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayKey = window.todayStr();

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
      const rank = window.rankFor(entry.total).grade;
      dot = `<span class="cal-dot rank-${rank}"></span>`;
    }
    html += `<button type="button" class="${classes.join(' ')}" data-date="${key}">${d}${dot}</button>`;
  }
  grid.innerHTML = html;
  console.log('modals.renderCalendar: populated', daysInMonth, 'days (firstWeekday', firstWeekday + ')');

  grid.querySelectorAll('.cal-day.has-entry').forEach(btn => {
    btn.onclick = () => { console.log('modals.openDay', btn.dataset.date); selectCalendarDay(btn.dataset.date, byDate[btn.dataset.date]); };
  });

  if (detail) detail.innerHTML = '<p class="cd-empty">記録のある日をタップすると詳細が見られるよ📊</p>';
}

function selectCalendarDay(key, entry){
  document.querySelectorAll('.cal-day.selected').forEach(el => el.classList.remove('selected'));
  const btn = document.querySelector(`.cal-day[data-date="${key}"]`);
  if (btn) btn.classList.add('selected');

  const detail = document.getElementById('calendarDetail');
  if (!detail || !entry) return;
  const { grade } = window.rankFor(entry.total);
  const chartHtml = Object.entries(entry.breakdown).map(([k, v]) => {
    const max = Math.max(...Object.values(entry.breakdown), 0.01);
    const pct = Math.max(Math.min((v / max) * 100, 100), v > 0 ? 3 : 0);
    return `\n      <div class="chart-row">\n        <span class="chart-label">${window.CATEGORY_LABELS[k]}</span>\n        <div class="chart-track"><div class="chart-fill cat-${k}" style="width:${pct}%"></div></div>\n        <span class="chart-value">${v.toFixed(2)}kg</span>\n      </div>`;
  }).join('');

  detail.innerHTML = `\n    <p class="cd-date">${key}</p>\n    <p class="cd-total">合計 <strong>${entry.total.toFixed(1)} kg CO2</strong>（${grade}ランク）</p>\n    <div class="result-breakdown">${chartHtml}</div>\n  `;
}

function moveCalendarMonth(offset){
  window.calendarCursor.setMonth(window.calendarCursor.getMonth() + offset);
  renderCalendar();
}

window.openResultModal = openResultModal;
window.closeResultModal = closeResultModal;
window.openCalendarModal = openCalendarModal;
window.closeCalendarModal = closeCalendarModal;
window.renderCalendar = renderCalendar;
window.selectCalendarDay = selectCalendarDay;
window.moveCalendarMonth = moveCalendarMonth;