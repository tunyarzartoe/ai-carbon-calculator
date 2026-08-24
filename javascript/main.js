/* ---- bottom nav: active-tab highlighting + wiring ---- */
function setActiveTab(id){
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.toggle('active', btn.id === id));
}
window.setActiveTab = setActiveTab;

const navChatBtn = document.getElementById('navChat');
if (navChatBtn) navChatBtn.onclick = () => {
  window.closeAllModals();
  document.querySelectorAll('.app-page').forEach(p => p.classList.toggle('active', p.id === 'chatPage'));
  setActiveTab('navChat');
};

const navHistoryBtn = document.getElementById('navHistory');
if (navHistoryBtn) navHistoryBtn.onclick = () => window.openCalendarModal();

const calPrev = document.getElementById('calPrev');
if (calPrev) calPrev.onclick = () => window.moveCalendarMonth(-1);
const calNext = document.getElementById('calNext');
if (calNext) calNext.onclick = () => window.moveCalendarMonth(1);

const resultClose = document.getElementById('resultClose');
if (resultClose) resultClose.onclick = window.closeResultModal;
const resultOverlay = document.getElementById('resultOverlay');
if (resultOverlay) resultOverlay.onclick = (e) => { if (e.target === resultOverlay) window.closeResultModal(); };

const navRankingBtn = document.getElementById('navRanking');
if (navRankingBtn) navRankingBtn.onclick = () => window.openRankingModal();

const navAchievementsBtn = document.getElementById('navAchievements');
if (navAchievementsBtn) navAchievementsBtn.onclick = () => window.openAchievementsModal();

const achSubtabCert = document.getElementById('achSubtabCert');
if (achSubtabCert) achSubtabCert.onclick = () => window.switchAchievementsTab('achPanelCert');
const achSubtabBadges = document.getElementById('achSubtabBadges');
if (achSubtabBadges) achSubtabBadges.onclick = () => window.switchAchievementsTab('achPanelBadges');
const achSubtabSettings = document.getElementById('achSubtabSettings');
if (achSubtabSettings) achSubtabSettings.onclick = () => window.switchAchievementsTab('achPanelSettings');

const quickLogClose = document.getElementById('quickLogClose');
if (quickLogClose) quickLogClose.onclick = () => window.closeQuickLogModal();
const quickLogOverlay = document.getElementById('quickLogOverlay');
if (quickLogOverlay) quickLogOverlay.onclick = (e) => { if (e.target === quickLogOverlay) window.closeQuickLogModal(); };

const dayDetailClose = document.getElementById('dayDetailClose');
if (dayDetailClose) dayDetailClose.onclick = () => window.closeDayDetailModal();
const dayDetailOverlay = document.getElementById('dayDetailOverlay');
if (dayDetailOverlay) dayDetailOverlay.onclick = (e) => { if (e.target === dayDetailOverlay) window.closeDayDetailModal(); };

const quickLogSubmit = document.getElementById('quickLogSubmit');
if (quickLogSubmit) quickLogSubmit.onclick = () => window.submitQuickLog();

window.updateLevelBadge();
window.initApp();

if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* 登録できなくても致命的ではない */ });
  });
}