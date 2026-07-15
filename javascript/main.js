const historyToggleBtn = document.getElementById('historyToggle');
if (historyToggleBtn) {
    historyToggleBtn.onclick = window.openCalendarModal;
    // console.log('main: bound historyToggle');
}

const calendarClose = document.getElementById('calendarClose');
if (calendarClose) {
    calendarClose.onclick = window.closeCalendarModal;
    // console.log('main: bound calendarClose');
}
const calendarOverlay = document.getElementById('calendarOverlay');
if (calendarOverlay) calendarOverlay.onclick = (e) => { if (e.target === calendarOverlay) window.closeCalendarModal(); };

const calPrev = document.getElementById('calPrev');
if (calPrev) {
    calPrev.onclick = () => window.moveCalendarMonth(-1);
    // console.log('main: bound calPrev');
}
const calNext = document.getElementById('calNext');
if (calNext) {
    calNext.onclick = () => window.moveCalendarMonth(1);
    // console.log('main: bound calNext');
}

const resultClose = document.getElementById('resultClose');
if (resultClose) {
    resultClose.onclick = window.closeResultModal;
    // console.log('main: bound resultClose');
}
const resultOverlay = document.getElementById('resultOverlay');
if (resultOverlay) resultOverlay.onclick = (e) => { if (e.target === resultOverlay) window.closeResultModal(); };

// console.log('main: initializing app');
window.initApp();