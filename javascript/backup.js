// バックアップ／復元のUI層（実際のデータ処理は data.js に完全に委譲する）:
//  - データの実体（history・gamify）や保存形式（app/version/フィールド名）は
//    data.js の window.downloadBackupFile() / window.importBackupFile() が
//    唯一の正とする。ここでは「最終バックアップ表示」「復元前の確認」
//    「成功・失敗のフィードバック」といった、real-appらしい体験だけを足す。
//  - 復元前のプレビュー用に一度ファイルを読むが、実際の検証・書き込みは
//    必ず window.importBackupFile に行わせる（判定がここと二重に分岐しないように）。
//  - index.html には元々 exportDataBtn / importDataBtn / importFileInput に
//    ハンドラーを付けているコードが見当たらなかったため、そのままだと
//    ボタンを押しても何も起きない状態だった。このファイルがそれを配線する。
(function(){
  const LAST_BACKUP_KEY = 'co2-compass-last-backup';

  function formatDateTime(iso){
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${mm}`;
  }

  function renderBackupStatus(){
    const note = document.getElementById('backupStatusNote');
    if (!note) return;
    const last = formatDateTime(localStorage.getItem(LAST_BACKUP_KEY));
    note.textContent = last
      ? `最終バックアップ: ${last}`
      : 'まだバックアップを取っていないよ。機種変更前に一度保存しておこう。';
  }

  /* ---------- アプリ内フィードバック（チャットのバブルと同じ見た目） ---------- */
  function showBanner({ text, tone = 'info', actions = [] }){
    const chatLog = document.getElementById('chatLog');
    if (!chatLog){
      if (tone === 'error') alert(text); // 最終フォールバック
      return null;
    }
    const toast = document.createElement('div');
    toast.className = `bubble ai backup-toast backup-toast-${tone}`;
    const actionsHtml = actions.length
      ? `<div class="backup-toast-actions">${actions.map((a, i) => `<button type="button" class="reply-btn${a.danger ? ' backup-toast-danger' : ''}" data-action-index="${i}">${a.label}</button>`).join('')}</div>`
      : '';
    toast.innerHTML = `<p class="backup-toast-text">${text}</p>${actionsHtml}`;
    chatLog.appendChild(toast);
    if (window.scrollToBottom) window.scrollToBottom();

    actions.forEach((a, i) => {
      const btn = toast.querySelector(`[data-action-index="${i}"]`);
      if (btn) btn.onclick = () => { toast.remove(); a.onClick(); };
    });
    return toast;
  }

  /* ---------- エクスポート（実処理は data.js の downloadBackupFile） ---------- */
  function exportData(){
    if (typeof window.downloadBackupFile !== 'function'){
      showBanner({ text: 'バックアップ機能が読み込まれていないみたい。ページを再読み込みしてからもう一度試してね。', tone: 'error' });
      return;
    }
    try{
      window.downloadBackupFile();
      localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
      renderBackupStatus();
      showBanner({ text: '💾 バックアップを保存したよ。大切に保管してね。', tone: 'success' });
    } catch(e){
      console.error('exportData failed', e);
      showBanner({ text: 'バックアップの保存に失敗しちゃった。もう一度試してみてね。', tone: 'error' });
    }
  }

  /* ---------- インポート（復元） ----------
     ファイルの中身は「確認バナーに表示する要約」を作るためだけに一度読む。
     実際の検証・localStorageへの書き込みは必ず window.importBackupFile に
     行わせ、その結果（ok/message）だけを表示に反映する。 */
  function readFileAsText(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  async function handleImportFile(file){
    if (!file) return;

    let preview = null;
    try{
      const text = await readFileAsText(file);
      preview = JSON.parse(text);
    } catch(e){
      showBanner({ text: 'このファイルを読み込めなかったよ。CO2 Compassのバックアップファイル（.json）を選んでね。', tone: 'error' });
      return;
    }

    const historyCount = preview && Array.isArray(preview.history) ? preview.history.length : null;
    const backupDate = preview && preview.exportedAt ? preview.exportedAt : null;
    const summary = historyCount !== null
      ? `${backupDate ? backupDate + '時点・' : ''}記録${historyCount}件`
      : '内容を確認できないバックアップ';

    // 復元は上書きが起きる破壊的操作なので、実際に書き込む前に必ず確認する
    showBanner({
      text: `このバックアップ（${summary}）を復元する？現在この端末にある記録は上書きされて元に戻せなくなるよ。`,
      tone: 'warn',
      actions: [
        { label: '↩️ 復元する', danger: true, onClick: () => commitRestore(file) },
        { label: 'キャンセル', onClick: () => {} },
      ],
    });
  }

  function commitRestore(file){
    if (typeof window.importBackupFile !== 'function'){
      showBanner({ text: '復元機能が読み込まれていないみたい。ページを再読み込みしてからもう一度試してね。', tone: 'error' });
      return;
    }
    window.importBackupFile(file, (ok, message) => {
      if (ok){
        showBanner({ text: `✅ ${message}`, tone: 'success' });
        setTimeout(() => window.location.reload(), 1400);
      } else {
        showBanner({ text: message || '復元に失敗したよ。ファイルを確認してもう一度試してね。', tone: 'error' });
      }
    });
  }

  /* ---------- 起動 ---------- */
  function cloneToStripOldListeners(el){
    if (!el) return null;
    const fresh = el.cloneNode(true);
    el.parentNode.replaceChild(fresh, el);
    return fresh;
  }

  function attach(){
    const exportBtn = cloneToStripOldListeners(document.getElementById('exportDataBtn'));
    const importBtn = cloneToStripOldListeners(document.getElementById('importDataBtn'));
    const fileInput = cloneToStripOldListeners(document.getElementById('importFileInput'));

    if (exportBtn) exportBtn.onclick = exportData;
    if (importBtn && fileInput) importBtn.onclick = () => fileInput.click();
    if (fileInput){
      fileInput.onchange = () => {
        const file = fileInput.files && fileInput.files[0];
        handleImportFile(file);
        fileInput.value = ''; // 同じファイルを連続で選び直せるようにする
      };
    }

    renderBackupStatus();
  }

  window.backupFeature = { exportData, renderBackupStatus };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();