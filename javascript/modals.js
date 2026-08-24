/* =========================================================
   modals.js → ハイブリッド版
   ------------------------------------------------------------
   ・診断結果（resultOverlay）/ 日付詳細 / クイック記録
     → 本物のモーダル（ポップアップ）のまま
   ・履歴・ランキング・認定証
     → チャット画面を隠して、そのページだけを表示する
       「本物のタブ切り替え」（Instagram等の実アプリと同じ方式）
   ========================================================= */

function switchPage(pageId){
  document.querySelectorAll('.app-page').forEach(p => p.classList.toggle('active', p.id === pageId));
}

function setTab(id){
  if (window.setActiveTab) window.setActiveTab(id);
}

function closeAllModals(){
  closeResultModal();
  closeDayDetailModal();
  closeQuickLogModal();
}

/* ===== 証明書タブ切り替え（認定証ページ内） ===== */
function switchAchievementsTab(panelId){
  document.querySelectorAll('.achievements-panel').forEach(p => p.classList.toggle('active', p.id === panelId));
  document.querySelectorAll('.subtab-btn').forEach(b => b.classList.toggle('active', b.dataset.panel === panelId));
}
window.switchAchievementsTab = switchAchievementsTab;

/* ===== 📊 診断結果（本物のモーダル） ===== */
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

/* ===== 🗓️ 履歴・カレンダー（チャットを隠してページ切り替え） ===== */
function openCalendarModal(){
  window.calendarCursor = new Date();
  renderCalendar();
  switchPage('historyPage');
  setTab('navHistory');
}
function closeCalendarModal(){ switchPage('chatPage'); setTab('navChat'); }

function dateKey(y, m, d){
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function renderCalendar(){
  const grid = document.getElementById('calendarGrid');
  const label = document.getElementById('calMonthLabel');
  const detail = document.getElementById('calendarDetail');
  const summaryEl = document.getElementById('calendarSummary');
  const trendEl = document.getElementById('calendarTrend');
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

  if (summaryEl){
    const summary = window.computeMonthlySummary(hist, y, m);
    if (!summary){
      summaryEl.innerHTML = '<p class="calendar-summary-empty">この月はまだ記録がないよ</p>';
    } else {
      const bestDay = summary.best.date.slice(8, 10);
      const worstDay = summary.worst.date.slice(8, 10);
      const momHtml = window.computeMonthOverMonthHtml(hist, y, m);
      const weekdayInsight = window.computeWeekdayInsight(hist);
      const insightHtml = weekdayInsight
        ? `<p class="calendar-insight">💡 ${weekdayInsight.worstDay}曜日は平均${weekdayInsight.worstAvg}kgと多め。${weekdayInsight.bestDay}曜日は平均${weekdayInsight.bestAvg}kgと少なめだよ。</p>`
        : '';
      summaryEl.innerHTML = `
        <div class="calendar-stats">
          <div class="calendar-stat"><span class="calendar-stat-value">${summary.avg}</span><span class="calendar-stat-label">平均kg/日</span></div>
          <div class="calendar-stat"><span class="calendar-stat-value">${bestDay}日</span><span class="calendar-stat-label">ベスト(${summary.best.total.toFixed(1)}kg)</span></div>
          <div class="calendar-stat"><span class="calendar-stat-value">${worstDay}日</span><span class="calendar-stat-label">ワースト(${summary.worst.total.toFixed(1)}kg)</span></div>
          <div class="calendar-stat"><span class="calendar-stat-value">${summary.count}</span><span class="calendar-stat-label">記録日数</span></div>
        </div>
        ${momHtml}
        ${insightHtml}
      `;
    }
  }

  if (window.renderMonthlyGoalCard) window.renderMonthlyGoalCard();

  if (trendEl){
    const totals = [];
    for (let d = 1; d <= daysInMonth; d++){
      const entry = byDate[dateKey(y, m, d)];
      totals.push(entry ? entry.total : null);
    }
    const max = Math.max(...totals.filter(t => t !== null), 1);
    trendEl.innerHTML = totals.map((t, i) => {
      const d = i + 1;
      if (t === null){
        return `<div class="trend-bar empty" title="${d}日: 記録なし"><div class="trend-bar-fill" style="height:100%"></div></div>`;
      }
      const pct = Math.max(8, Math.min(100, (t / max) * 100));
      const rank = window.rankFor(t).grade;
      return `<div class="trend-bar rank-${rank}" title="${d}日: ${t.toFixed(1)}kg"><div class="trend-bar-fill" style="height:${pct}%"></div></div>`;
    }).join('');
  }

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

  grid.querySelectorAll('.cal-day[data-date]').forEach(btn => {
    btn.onclick = () => selectCalendarDay(btn.dataset.date, byDate[btn.dataset.date] || null);
  });

  if (detail) detail.innerHTML = '<p class="cd-empty">記録のある日をタップすると詳細が見られるよ📊</p>';
}

function selectCalendarDay(key, entry){
  document.querySelectorAll('.cal-day.selected').forEach(el => el.classList.remove('selected'));
  const btn = document.querySelector(`.cal-day[data-date="${key}"]`);
  if (btn) btn.classList.add('selected');

  if (!entry) return;
  openDayDetailModal(key, entry);
}

/* 日付詳細は本物のモーダルのまま（カレンダーページの上に重ねて出す） */
function openDayDetailModal(key, entry){
  const overlay = document.getElementById('dayDetailOverlay');
  const titleEl = document.getElementById('dayDetailTitle');
  const bodyEl = document.getElementById('dayDetailBody');
  if (!overlay || !titleEl || !bodyEl) return;

  const { grade, cls } = window.rankFor(entry.total);
  const weekday = window.WEEKDAY_LABELS ? window.WEEKDAY_LABELS[new Date(key + 'T00:00:00').getDay()] : '';
  titleEl.textContent = weekday ? `${key}（${weekday}）` : key;

  const chartHtml = window.buildBreakdownChart(entry.breakdown);
  const equivHtml = window.co2EquivalentHtml ? window.co2EquivalentHtml(entry.total) : '';
  const costHtml = window.co2ToYenHtml ? window.co2ToYenHtml(entry.breakdown) : '';

  bodyEl.innerHTML = `
    <div class="rank ${cls}">${grade}<span class="rank-label">ランク</span></div>
    <p class="result-summary">この日の推定排出量: <strong>${entry.total.toFixed(1)} kg CO2</strong></p>
    <div class="result-breakdown">${chartHtml}</div>
    ${equivHtml}
    ${costHtml}
  `;

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}
function closeDayDetailModal(){
  const overlay = document.getElementById('dayDetailOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.querySelectorAll('.cal-day.selected').forEach(el => el.classList.remove('selected'));
}

function moveCalendarMonth(offset){
  window.calendarCursor.setMonth(window.calendarCursor.getMonth() + offset);
  renderCalendar();
}

/* ===== 🏆 自己ランキング（ページ切り替え） ===== */
function openRankingModal(){
  try { if (window.renderRanking) window.renderRanking(); }
  catch (e){ console.error('openRankingModal: renderRanking failed', e); }
  switchPage('rankingPage');
  setTab('navRanking');
}
function closeRankingModal(){ switchPage('chatPage'); setTab('navChat'); }

/* ===== 🎓 認定証・バッジ（ページ切り替え） ===== */
function openAchievementsModal(){
  window.renderAchievements();
  if (window.renderCommuteStatus) window.renderCommuteStatus();
  switchAchievementsTab('achPanelCert');
  switchPage('achievementsPage');
  setTab('navAchievements');
}
function closeAchievementsModal(){ switchPage('chatPage'); setTab('navChat'); }

/* ===== ⚡ クイック記録（本物のモーダル） ===== */
function openQuickLogModal(){
  const overlay = document.getElementById('quickLogOverlay');
  if (!overlay) return;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}
function closeQuickLogModal(){
  const overlay = document.getElementById('quickLogOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

window.openResultModal = openResultModal;
window.closeResultModal = closeResultModal;
window.openCalendarModal = openCalendarModal;
window.closeCalendarModal = closeCalendarModal;
window.renderCalendar = renderCalendar;
window.selectCalendarDay = selectCalendarDay;
window.moveCalendarMonth = moveCalendarMonth;
window.openRankingModal = openRankingModal;
window.closeRankingModal = closeRankingModal;
window.openAchievementsModal = openAchievementsModal;
window.closeAchievementsModal = closeAchievementsModal;
window.openQuickLogModal = openQuickLogModal;
window.closeQuickLogModal = closeQuickLogModal;
window.openDayDetailModal = openDayDetailModal;
window.closeDayDetailModal = closeDayDetailModal;
window.closeAllModals = closeAllModals;