/* =========================================================
   月間目標プログレスリング
   「今日の目標」は日ごとにリセットされるため、1日サボると
   挫折しやすい。月平均で見る目標にすることで、1日の失敗が
   全体の達成感に響きにくくなる（行動変容アプリでよく使われる考え方）。

   ロジック:
   1. ユーザーが「月平均◯kg/日」を一度設定する（localStorageに保存）
   2. 既存の computeMonthlySummary() が計算する「今月の平均」と比較
   3. リング（円グラフ）で視覚化 — 目標以下なら緑、超えていればオレンジ
   4. 診断のたびに結果画面にもミニ表示を更新する
   ========================================================= */

window.MONTHLY_GOAL_KEY = 'co2compass_monthly_goal_kg_v1';

window.getMonthlyGoal = function(){
  try {
    const raw = localStorage.getItem(window.MONTHLY_GOAL_KEY);
    if (raw === null) return null;
    const val = parseFloat(raw);
    return Number.isFinite(val) && val > 0 ? val : null;
  } catch (e){
    return null;
  }
};

window.saveMonthlyGoal = function(kgPerDay){
  try { localStorage.setItem(window.MONTHLY_GOAL_KEY, String(kgPerDay)); } catch (e){ /* storage unavailable */ }
};

window.resetMonthlyGoal = function(){
  try { localStorage.removeItem(window.MONTHLY_GOAL_KEY); } catch (e){ /* storage unavailable */ }
};

/* 今月の進捗を計算する。目標未設定なら null を返す。 */
window.computeMonthlyGoalProgress = function(){
  const goal = window.getMonthlyGoal();
  if (goal === null) return null;

  const now = new Date();
  const history = window.loadHistory();
  const summary = window.computeMonthlySummary(history, now.getFullYear(), now.getMonth());

  if (!summary){
    return { goal, avg: null, count: 0, onTrack: true, ratio: 0 };
  }

  return {
    goal,
    avg: summary.avg,
    count: summary.count,
    onTrack: summary.avg <= goal,
    ratio: Math.max(0, summary.avg / goal)
  };
};

function monthlyGoalSetupHtml(existingGoal){
  const isEdit = existingGoal !== null && existingGoal !== undefined;
  return `
    <div class="monthly-goal-panel">
      <p class="monthly-goal-heading">📅 月間目標</p>
      ${isEdit ? '' : '<p class="monthly-goal-note">1日ごとじゃなく、月平均で見る目標。1日サボっても大丈夫、月を通して続けよう。</p>'}
      <div class="monthly-goal-setup">
        <input id="monthlyGoalInput" type="number" min="1" max="30" step="0.5"
          placeholder="例: 8" ${isEdit ? `value="${existingGoal}"` : ''}>
        <button id="saveMonthlyGoalBtn" class="reply-btn" type="button">
          <span class="btn-icon">🎯</span><span class="btn-text">${isEdit ? '更新する' : '目標を設定'}</span>
        </button>
      </div>
    </div>`;
}

function wireMonthlyGoalSetup(){
  const saveBtn = document.getElementById('saveMonthlyGoalBtn');
  const input = document.getElementById('monthlyGoalInput');
  if (!saveBtn || !input) return;
  saveBtn.onclick = () => {
    const val = parseFloat(input.value);
    if (!Number.isFinite(val) || val <= 0) return;
    window.saveMonthlyGoal(val);
    window.renderMonthlyGoalCard();
  };
}

/* カレンダーモーダル内に置くフルカード（リング + 設定/変更フォーム） */
window.renderMonthlyGoalCard = function(){
  const el = document.getElementById('monthlyGoalCard');
  if (!el) return;

  const progress = window.computeMonthlyGoalProgress();

  if (!progress){
    el.innerHTML = monthlyGoalSetupHtml(null);
    wireMonthlyGoalSetup();
    return;
  }

  const r = 34;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(progress.ratio, 1);
  const offset = circumference * (1 - pct);
  const color = progress.onTrack ? 'var(--mint)' : 'var(--warn)';
  const avgText = progress.avg !== null ? `${progress.avg}` : '－';

  el.innerHTML = `
    <div class="monthly-goal-panel">
      <p class="monthly-goal-heading">📅 月間目標</p>
      <div class="monthly-goal-body">
        <div class="monthly-goal-ring-wrap">
          <svg viewBox="0 0 84 84" class="monthly-goal-ring">
            <circle cx="42" cy="42" r="${r}" class="monthly-goal-ring-track"></circle>
            <circle cx="42" cy="42" r="${r}" class="monthly-goal-ring-fill"
              style="stroke:${color}; stroke-dasharray:${circumference}; stroke-dashoffset:${offset};"></circle>
          </svg>
          <div class="monthly-goal-ring-label">
            <span class="monthly-goal-ring-value">${avgText}</span>
            <span class="monthly-goal-ring-unit">kg/日</span>
          </div>
        </div>
        <div class="monthly-goal-info">
          <p class="monthly-goal-status ${progress.onTrack ? 'good' : 'over'}">${progress.onTrack ? '✅ 目標ペース内' : '⚠️ 少しオーバー気味'}</p>
          <p class="monthly-goal-target-text">目標 ${progress.goal}kg/日</p>
          <p class="monthly-goal-count-text">${progress.count}日分の記録から算出</p>
          <button id="editMonthlyGoalBtn" class="monthly-goal-edit-btn" type="button">目標を変更</button>
        </div>
      </div>
    </div>`;

  const editBtn = document.getElementById('editMonthlyGoalBtn');
  if (editBtn){
    editBtn.onclick = () => {
      el.innerHTML = monthlyGoalSetupHtml(progress.goal);
      wireMonthlyGoalSetup();
    };
  }
};

/* 結果モーダル用のコンパクト表示。診断が完了するたびに showResult() から呼ばれ、
   最新の月間ペースを反映する。目標未設定・記録なしの場合は何も出さない。 */
window.monthlyGoalResultHtml = function(){
  const progress = window.computeMonthlyGoalProgress();
  if (!progress || progress.avg === null) return '';

  const pct = Math.round(Math.min(progress.ratio, 1) * 100);
  const color = progress.onTrack ? 'var(--mint)' : 'var(--warn)';
  const statusText = progress.onTrack ? '目標ペース内✅' : '目標より少しオーバー⚠️';

  return `
    <div class="monthly-goal-mini">
      <div class="monthly-goal-mini-head">
        <span class="monthly-goal-mini-label">📅 今月の平均ペース</span>
        <span class="monthly-goal-mini-value">${progress.avg}kg/日 <span class="monthly-goal-mini-target">/ 目標${progress.goal}kg（${statusText}）</span></span>
      </div>
      <div class="monthly-goal-mini-track">
        <div class="monthly-goal-mini-fill" style="width:${pct}%; background:${color};"></div>
      </div>
    </div>`;
};