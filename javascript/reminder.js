// Reminder feature (real-app version):
//  - actual OS-level Notification (with permission flow), not just an in-app popup
//  - per-day-of-week targeting (like Duolingo/Headspace reminder pickers)
//  - checks on load AND whenever the tab regains focus AND every minute while open
//    (a plain PWA without a push server can't wake up while fully closed —
//     this is the honest ceiling of what's possible client-side)
//  - snooze (30分後) instead of a hard dismiss
//  - test button so the user can verify permission + see the real notification
(function(){
  const KEY = 'co2-compass-reminder';
  const LAST_KEY = 'co2-compass-reminder-last';
  const SNOOZE_KEY = 'co2-compass-reminder-snooze';
  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
  const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
  const CHECK_INTERVAL_MS = 60 * 1000; // フォアグラウンドにいる間、1分おきに確認する

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const state = Object.assign({ enabled: false, time: '20:00', days: ALL_DAYS.slice() }, parsed || {});
      if (!Array.isArray(state.days) || state.days.length === 0) state.days = ALL_DAYS.slice();
      return state;
    } catch(e){
      console.error('reminder.load failed', e);
      return { enabled: false, time: '20:00', days: ALL_DAYS.slice() };
    }
  }

  function save(state){
    try{ localStorage.setItem(KEY, JSON.stringify(state)); }
    catch(e){ console.error('reminder.save failed', e); }
  }

  function hasEntryForToday(){
    try{ const hist = window.loadHistory ? window.loadHistory() : []; return hist.some(h => h.date === window.todayStr()); }
    catch(e){ return false; }
  }

  function markNotifiedToday(){
    try{ localStorage.setItem(LAST_KEY, window.todayStr()); }
    catch(e){ /* ignore */ }
  }

  function wasNotifiedToday(){
    try{ return localStorage.getItem(LAST_KEY) === window.todayStr(); }
    catch(e){ return false; }
  }

  function setSnooze(minutes){
    try{ localStorage.setItem(SNOOZE_KEY, JSON.stringify({ date: window.todayStr(), until: Date.now() + minutes * 60000 })); }
    catch(e){ /* ignore */ }
  }

  function isSnoozed(){
    try{
      const raw = localStorage.getItem(SNOOZE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      return s.date === window.todayStr() && Date.now() < s.until;
    } catch(e){ return false; }
  }

  /* ---------- 表示テキスト ---------- */
  function permissionLabel(){
    if (!('Notification' in window)) return 'このブラウザは端末通知に対応していないよ。アプリを開いている間だけお知らせするよ。';
    if (Notification.permission === 'granted') return '端末の通知が許可されているよ🔔 アプリを閉じていても届くタイミングがあるよ。';
    if (Notification.permission === 'denied') return '端末の通知がブロックされているよ。ブラウザの設定から許可すると、より確実に届くようになるよ。';
    return 'オンにすると端末通知の許可を確認するよ（許可しなくてもアプリを開いたときにはお知らせするよ）。';
  }

  function statusLabel(state){
    if (!state.enabled) return 'リマインダーはオフだよ。';
    const dayLabel = state.days.length === 7 ? '毎日' : state.days.slice().sort().map(d => DAY_LABELS[d]).join('・') + '曜日';
    return `${dayLabel} ${state.time} までに記録がなければお知らせするよ。`;
  }

  /* ---------- UI描画 ---------- */
  function render(){
    const state = load();
    const toggleEl = document.getElementById('reminderToggle');
    const timeInput = document.getElementById('reminderTimeInput');
    const statusNote = document.getElementById('reminderStatusNote');
    const permNote = document.getElementById('reminderPermissionNote');
    const settingsBlock = document.getElementById('reminderSettings');

    if (toggleEl) toggleEl.checked = !!state.enabled;
    if (timeInput) timeInput.value = state.time || '20:00';
    if (statusNote) statusNote.textContent = statusLabel(state);
    if (permNote) permNote.textContent = permissionLabel();
    if (settingsBlock) settingsBlock.classList.toggle('is-disabled', !state.enabled);

    document.querySelectorAll('.reminder-day-chip').forEach(chip => {
      const d = parseInt(chip.dataset.day, 10);
      const active = state.days.includes(d);
      chip.classList.toggle('active', active);
      chip.setAttribute('aria-pressed', String(active));
    });
  }

  /* ---------- 操作 ---------- */
  async function setEnabled(on){
    const state = load();
    if (on && 'Notification' in window && Notification.permission === 'default'){
      try{ await Notification.requestPermission(); } catch(e){ /* ignore */ }
    }
    state.enabled = on;
    save(state);
    render();
  }

  function updateTime(value){
    const state = load();
    state.time = value || state.time;
    save(state);
    render();
  }

  function toggleDay(day){
    const state = load();
    const set = new Set(state.days);
    if (set.has(day)) set.delete(day); else set.add(day);
    state.days = set.size > 0 ? Array.from(set).sort() : [day]; // 最低1日は残す
    save(state);
    render();
  }

  /* ---------- 通知の発火 ---------- */
  function openQuickLogFromReminder(){
    if (window.renderQuickLogList) window.renderQuickLogList();
    if (window.openQuickLogModal) window.openQuickLogModal();
  }

  function showInAppBanner(){
    const chatLog = document.getElementById('chatLog');
    if (!chatLog){ openQuickLogFromReminder(); return; }

    const toast = document.createElement('div');
    toast.className = 'bubble ai reminder-toast';
    toast.innerHTML = `
      <p class="reminder-toast-text">🔔 今日の記録がまだないよ。今つける？</p>
      <div class="reminder-toast-actions">
        <button type="button" class="reply-btn reminder-toast-log">⚡ 今つける</button>
        <button type="button" class="reply-btn reminder-toast-snooze">後で（30分後）</button>
      </div>
    `;
    chatLog.appendChild(toast);
    if (window.scrollToBottom) window.scrollToBottom();

    const logBtn = toast.querySelector('.reminder-toast-log');
    const snoozeBtn = toast.querySelector('.reminder-toast-snooze');
    if (logBtn) logBtn.onclick = () => { openQuickLogFromReminder(); toast.remove(); };
    if (snoozeBtn) snoozeBtn.onclick = () => { setSnooze(30); toast.remove(); };
  }

  function fireNotification(){
    const title = 'CO2 Compass';
    const body = '今日の記録がまだないよ。10秒で記録できるよ🌱';

    if ('Notification' in window && Notification.permission === 'granted'){
      try{
        const n = new Notification(title, {
          body,
          icon: 'icons/apple-touch-icon.png',
          tag: 'co2-compass-reminder',
        });
        n.onclick = () => { window.focus(); openQuickLogFromReminder(); n.close(); };
        return;
      } catch(e){
        console.error('Notification failed, falling back to in-app banner', e);
      }
    }
    showInAppBanner();
  }

  /* ---------- チェック ---------- */
  function checkOnOpen(){
    const state = load();
    if (!state.enabled) return;
    if (hasEntryForToday()) return;
    if (isSnoozed()) return;
    if (wasNotifiedToday()) return;

    const now = new Date();
    if (!state.days.includes(now.getDay())) return;

    const [hh, mm] = (state.time || '20:00').split(':').map(n => parseInt(n, 10));
    if (isNaN(hh) || isNaN(mm)) return;
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
    if (now < target) return;

    fireNotification();
    markNotifiedToday();
  }

  function testNotification(){
    if ('Notification' in window && Notification.permission === 'default'){
      Notification.requestPermission().then(() => { fireNotification(); render(); });
      return;
    }
    fireNotification();
  }

  /* ---------- 起動 ---------- */
  function attach(){
    const toggleEl = document.getElementById('reminderToggle');
    const timeInput = document.getElementById('reminderTimeInput');
    const testBtn = document.getElementById('reminderTestBtn');

    if (toggleEl) toggleEl.onchange = () => setEnabled(toggleEl.checked);
    if (timeInput) timeInput.onchange = () => updateTime(timeInput.value);
    if (testBtn) testBtn.onclick = testNotification;

    document.querySelectorAll('.reminder-day-chip').forEach(chip => {
      chip.onclick = () => toggleDay(parseInt(chip.dataset.day, 10));
    });

    render();

    setInterval(checkOnOpen, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkOnOpen();
    });
  }

  window.reminder = { load, save, render, checkOnOpen, testNotification };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();