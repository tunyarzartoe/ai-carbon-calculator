const historyToggleBtn = document.getElementById('historyToggle');
if (historyToggleBtn) historyToggleBtn.onclick = window.openCalendarModal;

const calendarClose = document.getElementById('calendarClose');
if (calendarClose) calendarClose.onclick = window.closeCalendarModal;
const calendarOverlay = document.getElementById('calendarOverlay');
if (calendarOverlay) calendarOverlay.onclick = (e) => { if (e.target === calendarOverlay) window.closeCalendarModal(); };

const calPrev = document.getElementById('calPrev');
if (calPrev) calPrev.onclick = () => window.moveCalendarMonth(-1);
const calNext = document.getElementById('calNext');
if (calNext) calNext.onclick = () => window.moveCalendarMonth(1);

const resultClose = document.getElementById('resultClose');
if (resultClose) resultClose.onclick = window.closeResultModal;
const resultOverlay = document.getElementById('resultOverlay');
if (resultOverlay) resultOverlay.onclick = (e) => { if (e.target === resultOverlay) window.closeResultModal(); };

window.initApp();