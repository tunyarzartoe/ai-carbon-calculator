/* =========================================================
   クイック記録（10秒モード）
   毎日フル診断（4問+クイズ）するのが面倒な日のための、
   「やったことにチェックを入れるだけ」の簡易モード。
   平均的な1日のベースラインから、チェックした行動の分だけ
   差し引いて概算する。結果は既存の showResult() にそのまま渡すので、
   XP・バッジ・週間チャレンジ・カレンダー・ランキングすべてに
   通常の診断と同じように反映される。
   ========================================================= */

window.quickLogSelectedActions = [];
window.quickLogFromQuickMode = false;

window.QUICK_BASELINE = {
  transport: 3.8,
  electricity: 2.7,
  meal: 4.8,
  waste: 0.6
};

window.QUICK_ACTIONS = [
  { id: 'walked',    icon: '🚶', label: '徒歩・自転車で移動した',   category: 'transport',   newValue: 0.4 },
  { id: 'unplugged', icon: '💡', label: '使ってない電気を消した',   category: 'electricity', newValue: 1.1 },
  { id: 'noMeat',    icon: '🥗', label: '肉を控えめにした',         category: 'meal',        newValue: 2.5 },
  { id: 'recycled',  icon: '♻️', label: 'ゴミをきちんと分別した',   category: 'waste',       newValue: 0.3 }
];

/* チェックした行動から、簡易版の内訳(breakdown)と合計を計算する。
   チェックした項目のカテゴリはベースラインより低い値に置き換わる。 */
window.computeQuickLogResult = function(checkedIds){
  const breakdown = Object.assign({}, window.QUICK_BASELINE);
  window.QUICK_ACTIONS.forEach(action => {
    if (checkedIds.includes(action.id)){
      breakdown[action.category] = action.newValue;
    }
  });
  const total = +Object.values(breakdown).reduce((sum, v) => sum + v, 0).toFixed(2);
  return { breakdown, total };
};

window.quickLogSummaryHtml = function(){
  if (!window.quickLogFromQuickMode || !Array.isArray(window.quickLogSelectedActions)) return '';
  const selected = window.QUICK_ACTIONS.filter(a => window.quickLogSelectedActions.includes(a.id));
  const baseline = Object.values(window.QUICK_BASELINE).reduce((sum, v) => sum + v, 0);
  const diff = +(baseline - window.state.total).toFixed(1);
  const notes = selected.length
    ? selected.map(a => `<li>${a.icon} ${a.label}</li>`).join('')
    : '<li>改善行動は選択されませんでした。次回はチェックしてより具体的に記録できます。</li>';

  return `
    <div class="quicklog-summary">
      <p class="quicklog-summary-title">⚡ クイック記録の見える化</p>
      <p class="quicklog-summary-note">平均的な1日から約<strong>${diff}kg</strong>減らした見積もりです。</p>
      <ul class="quicklog-summary-list">${notes}</ul>
    </div>`;
};

window.renderQuickLogList = function(){
  const list = document.getElementById('quickLogList');
  if (!list) return;
  list.innerHTML = window.QUICK_ACTIONS.map(a => `
    <label class="quicklog-item">
      <input type="checkbox" class="quicklog-checkbox" value="${a.id}">
      <span class="quicklog-icon">${a.icon}</span>
      <span class="quicklog-label">${a.label}</span>
    </label>`).join('');
};

window.submitQuickLog = function(){
  const checked = Array.from(document.querySelectorAll('.quicklog-checkbox:checked')).map(el => el.value);
  const { breakdown, total } = window.computeQuickLogResult(checked);

  window.quickLogSelectedActions = checked;
  window.quickLogFromQuickMode = true;
  window.state.breakdown = breakdown;
  window.state.total = total;

  window.closeQuickLogModal();
  document.getElementById('chatLog').innerHTML = '';
  window.clearOptions();
  window.addBubble('⚡ クイック記録で診断するよ！', 'ai');

  if (typeof window.showResult === 'function'){
    setTimeout(window.showResult, 300);
  }
};