// プロフィール編集（証明書のお名前をモーダルで編集する）:
//  - 証明書ページの生の入力欄（#certNameInput）は隠したまま、
//    gamify.js が内部で使い続けられるようにしておく（値の同期先はそのまま）。
//  - 代わりに「✏️ プロフィール編集」ボタンを押すとモーダルが開き、
//    保存すると証明書の表示を即座に更新し、トースト通知で完了を伝える。
//  - 名前の保存・取得は gamify.js の window.saveCertName() /
//    window.loadCertName() にそのまま委譲する（保存先を分けない）。
//
// 不具合修正:
//  以前は「空欄のまま保存」を押すと、何のフィードバックも無くモーダルが
//  静かに閉じるだけだった。ユーザーからは「保存しても何も起きない＝壊れている」
//  ように見えてしまうため、空欄の場合はモーダルを閉じずに、入力欄の下に
//  はっきりエラーメッセージを出す（キャンセルは別に用意されているので、
//  空欄保存を「キャンセル扱い」にする必要は無い）。
//  また、開く（フェードイン）と閉じる（フェードアウト）のタイマーが
//  短時間に連続で走ると、閉じている途中に開くアニメーションが割り込んで
//  モーダルが変な状態で止まることがあったため、開閉のたびに保留中の
//  タイマーを必ず破棄してから次の状態に入るようにした。
(function(){
  let visibilityTimer = null;
  let focusTimer = null;

  function clearPendingTimers(){
    if (visibilityTimer){ clearTimeout(visibilityTimer); visibilityTimer = null; }
    if (focusTimer){ clearTimeout(focusTimer); focusTimer = null; }
  }

  function currentName(){
    return (typeof window.loadCertName === 'function') ? window.loadCertName() : '';
  }

  /* ---------- トースト通知 ---------- */
  function showToast(message){
    const app = document.querySelector('.app') || document.body;
    const existing = app.querySelector('.app-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.textContent = message;
    app.appendChild(toast);

    setTimeout(() => toast.classList.add('visible'), 20);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2400);
  }

  /* ---------- 入力エラー表示 ---------- */
  function showFieldError(message){
    const errorEl = document.getElementById('profileEditError');
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearFieldError(){
    const errorEl = document.getElementById('profileEditError');
    if (!errorEl) return;
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  /* ---------- モーダルの開閉 ---------- */
  function openModal(){
    const modal = document.getElementById('profileEditModal');
    const input = document.getElementById('profileEditInput');
    if (!modal) return;
    clearPendingTimers();
    clearFieldError();
    if (input) input.value = currentName();
    modal.hidden = false;
    visibilityTimer = setTimeout(() => modal.classList.add('visible'), 20);
    if (input) focusTimer = setTimeout(() => input.focus(), 200);
  }

  function closeModal(){
    const modal = document.getElementById('profileEditModal');
    if (!modal) return;
    clearPendingTimers();
    clearFieldError();
    modal.classList.remove('visible');
    visibilityTimer = setTimeout(() => { modal.hidden = true; }, 300);
  }

  /* ---------- 保存 ---------- */
  function saveEdit(){
    const input = document.getElementById('profileEditInput');
    const name = input ? input.value.trim() : '';
    if (!name){
      // 空欄のまま静かに閉じると「保存が効かない」ように見えるため、
      // モーダルは閉じずにエラーを出す。閉じたいときはキャンセルを押してもらう。
      showFieldError('名前を入力してね（やめる場合はキャンセルを押してね）');
      if (input) input.focus();
      return;
    }

    if (typeof window.saveCertName === 'function') window.saveCertName(name);
    if (typeof window.setUserName === 'function') window.setUserName(name);

    // 証明書プレビュー（RECIPIENT表示）と #certNameInput を即座に反映させる
    if (typeof window.renderAchievements === 'function') window.renderAchievements();

    closeModal();
    showToast('✅ プロフィールを更新したよ');
  }

  /* ---------- 起動 ---------- */
  function attach(){
    const openBtn = document.getElementById('profileEditOpenBtn');
    const cancelBtn = document.getElementById('profileEditCancel');
    const saveBtn = document.getElementById('profileEditSave');
    const modal = document.getElementById('profileEditModal');
    const input = document.getElementById('profileEditInput');

    if (openBtn) openBtn.onclick = openModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;
    if (saveBtn) saveBtn.onclick = saveEdit;
    if (modal){
      modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }
    if (input){
      input.onkeydown = (e) => { if (e.key === 'Enter') saveEdit(); };
      input.oninput = clearFieldError;
    }
  }

  attach();
})();