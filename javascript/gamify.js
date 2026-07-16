/* =========================================================
   ゲーミフィケーション機能
   - レベル/XP: 診断1回ごとにXPを獲得し、たまるとレベルアップ
   - デイリーボーナス: 連続診断日数に応じてボーナスXP
   - 自己ランキング: これまでの記録をCO2が少ない順に並べて表示
     （※このアプリはサーバーを持たないため、他のユーザーとの
        本当の対戦ランキングは実装していません。あくまで
        「過去の自分」との比較・ランキングです）
   ========================================================= */

window.GAMIFY_KEY = 'co2compass_gamify_v1';

const BASE_XP = 10;
const QUIZ_BONUS_XP = 5;
const STREAK_BONUS_XP = 15;
const XP_PER_LEVEL = 50;

const GRADE_RANK = { S: 0, A: 1, B: 2, C: 3, D: 4 };
const GRADE_BY_RANK = ['S', 'A', 'B', 'C', 'D'];

window.loadGamifyState = function(){
  try {
    const raw = localStorage.getItem(window.GAMIFY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return Object.assign({
      xp: 0,
      diagnosisCount: 0,
      sRankCount: 0,
      maxStreak: 0,
      bestGradeRank: undefined,
      quizCorrectCount: 0,
      badges: [],
      certId: null
    }, parsed);
  } catch (e){
    return { xp: 0, diagnosisCount: 0, sRankCount: 0, maxStreak: 0, bestGradeRank: undefined, quizCorrectCount: 0, badges: [], certId: null };
  }
};

window.saveGamifyState = function(g){
  try { localStorage.setItem(window.GAMIFY_KEY, JSON.stringify(g)); } catch (e){ /* storage unavailable */ }
};

/* =========================================================
   認定バッジ（paiza風のスキル認定をイメージ）
   ========================================================= */
window.BADGES = [
  { id: 'first',    icon: '🌱',   title: 'はじめの一歩',   desc: '初めて診断を完了した',        check: g => g.diagnosisCount >= 1 },
  { id: 'streak3',  icon: '🔥',   title: '3日連続診断',    desc: '3日連続で診断した',           check: g => g.maxStreak >= 3 },
  { id: 'streak7',  icon: '🔥🔥', title: '7日連続診断',    desc: '7日連続で診断した',           check: g => g.maxStreak >= 7 },
  { id: 'srank',    icon: '🏅',   title: 'Sランク認定',    desc: 'Sランクを1回達成した',        check: g => g.sRankCount >= 1 },
  { id: 'srank5',   icon: '👑',   title: 'Sランクマスター', desc: 'Sランクを5回達成した',        check: g => g.sRankCount >= 5 },
  { id: 'lv5',      icon: '⭐',   title: 'Lv.5 到達',      desc: 'レベル5に到達した',           check: g => window.levelFor(g.xp) >= 5 },
  { id: 'lv10',     icon: '🌟',   title: 'Lv.10 到達',     desc: 'レベル10に到達した',          check: g => window.levelFor(g.xp) >= 10 },
  { id: 'master',   icon: '🌍',   title: 'エコの達人',     desc: '累計30回診断した',            check: g => g.diagnosisCount >= 30 },
  { id: 'quiz10',   icon: '🧠',   title: 'クイズ博士',     desc: 'クイズに10回正解した',        check: g => g.quizCorrectCount >= 10 }
];

function makeCertId(){
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CO2-${Date.now().toString(36).toUpperCase().slice(-5)}${rand}`;
}

/**
 * 診断完了時に呼ぶ。統計を更新し、新しく解除されたバッジ一覧を返す。
 * grade: rankFor() が返す 'S'|'A'|'B'|'C'|'D'
 * streak: 連続診断日数
 */
window.checkAchievements = function(grade, streak, quizCorrect){
  const g = window.loadGamifyState();
  g.diagnosisCount = (g.diagnosisCount || 0) + 1;
  if (grade === 'S') g.sRankCount = (g.sRankCount || 0) + 1;
  g.maxStreak = Math.max(g.maxStreak || 0, streak || 0);
  if (quizCorrect) g.quizCorrectCount = (g.quizCorrectCount || 0) + 1;
  const rank = GRADE_RANK[grade];
  if (rank !== undefined && (g.bestGradeRank === undefined || rank < g.bestGradeRank)){
    g.bestGradeRank = rank;
  }
  if (!g.certId) g.certId = makeCertId();
  g.badges = g.badges || [];

  const newlyUnlocked = [];
  window.BADGES.forEach(b => {
    if (!g.badges.includes(b.id) && b.check(g)){
      g.badges.push(b.id);
      newlyUnlocked.push(b);
    }
  });

  window.saveGamifyState(g);
  return newlyUnlocked;
};

/* 認定証データを取得（未診断でも表示できるようデフォルト値付き） */
window.getCertificateData = function(){
  const g = window.loadGamifyState();
  if (!g.certId) g.certId = makeCertId();
  return {
    level: window.levelFor(g.xp),
    xp: g.xp,
    bestGrade: g.bestGradeRank !== undefined ? GRADE_BY_RANK[g.bestGradeRank] : '-',
    diagnosisCount: g.diagnosisCount || 0,
    badgesUnlocked: (g.badges || []).length,
    badgesTotal: window.BADGES.length,
    certId: g.certId,
    issueDate: window.todayStr()
  };
};

/* 認定証・バッジモーダルの中身を描画 */
window.renderAchievements = function(){
  const certData = window.getCertificateData();

  const card = document.getElementById('certificateCard');
  if (card){
    card.innerHTML = `
      <div class="cert-border">
        <p class="cert-kicker">ECO / AI CERTIFICATE</p>
        <h3 class="cert-title">CO<sub>2</sub> Compass 認定証</h3>
        <p class="cert-sub">地球にやさしい生活習慣への取り組みを証明します</p>
        <div class="cert-stats">
          <div class="cert-stat"><span class="cert-stat-value">Lv.${certData.level}</span><span class="cert-stat-label">レベル</span></div>
          <div class="cert-stat"><span class="cert-stat-value">${certData.bestGrade}</span><span class="cert-stat-label">ベストランク</span></div>
          <div class="cert-stat"><span class="cert-stat-value">${certData.diagnosisCount}</span><span class="cert-stat-label">診断回数</span></div>
        </div>
        <p class="cert-badges-count">獲得バッジ ${certData.badgesUnlocked} / ${certData.badgesTotal}</p>
        <div class="cert-footer">
          <span>発行日: ${certData.issueDate}</span>
          <span>No. ${certData.certId}</span>
        </div>
      </div>`;
  }

  const grid = document.getElementById('badgesGrid');
  if (grid){
    const g = window.loadGamifyState();
    const unlocked = g.badges || [];
    grid.innerHTML = window.BADGES.map(b => {
      const isUnlocked = unlocked.includes(b.id);
      return `
        <div class="badge-cell ${isUnlocked ? 'unlocked' : 'locked'}">
          <span class="badge-icon">${isUnlocked ? b.icon : '🔒'}</span>
          <span class="badge-title">${b.title}</span>
          <span class="badge-desc">${b.desc}</span>
        </div>`;
    }).join('');
  }

  const shareBtn = document.getElementById('certShareBtn');
  if (shareBtn) shareBtn.onclick = () => window.shareCertificateImage(certData);
  const downloadBtn = document.getElementById('certDownloadBtn');
  if (downloadBtn) downloadBtn.onclick = () => window.downloadCertificateImage(certData);
};

window.levelFor = function(xp){
  return Math.floor(xp / XP_PER_LEVEL) + 1;
};

window.xpIntoLevel = function(xp){
  return xp % XP_PER_LEVEL;
};

/* 連続診断日数（今日を含む）を history から計算 */
window.computeStreak = function(history){
  const dates = new Set(history.map(h => h.date));
  let streak = 0;
  const cursor = new Date();
  while (true){
    const key = cursor.toISOString().slice(0, 10);
    if (dates.has(key)){
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

/**
 * 診断完了時に呼ぶ。XPを加算し、レベルアップしたかどうかも返す。
 * quizCorrect: クイズに正解したか（任意）
 * streak: 連続診断日数
 */
window.awardXp = function(quizCorrect, streak){
  const g = window.loadGamifyState();
  const beforeLevel = window.levelFor(g.xp);

  let gained = BASE_XP;
  if (quizCorrect) gained += QUIZ_BONUS_XP;
  const streakBonus = (streak >= 3) ? STREAK_BONUS_XP : 0;
  gained += streakBonus;

  g.xp += gained;
  window.saveGamifyState(g);

  const afterLevel = window.levelFor(g.xp);

  return {
    xp: g.xp,
    gained,
    streakBonus,
    level: afterLevel,
    leveledUp: afterLevel > beforeLevel,
    xpIntoLevel: window.xpIntoLevel(g.xp),
    xpPerLevel: XP_PER_LEVEL
  };
};

window.updateLevelBadge = function(){
  const badge = document.getElementById('levelBadge');
  if (!badge) return;
  const g = window.loadGamifyState();
  badge.textContent = `Lv.${window.levelFor(g.xp)}`;
};

/* =========================================================
   自己ランキング（過去の記録をCO2が少ない順に）
   ========================================================= */
window.renderRanking = function(){
  const list = document.getElementById('rankingList');
  if (!list) return;
  const history = window.loadHistory();

  if (history.length === 0){
    list.innerHTML = '<p class="ranking-empty">まだ記録がないよ。診断すると自動でランキングに載るよ🏆</p>';
    return;
  }

  const sorted = [...history].sort((a, b) => a.total - b.total);
  const today = window.todayStr();
  const medals = ['①', '②', '③'];

  list.innerHTML = sorted.slice(0, 10).map((h, i) => {
    const isToday = h.date === today;
    return `
      <div class="ranking-row ${isToday ? 'today' : ''}">
        <span class="ranking-rank">${medals[i] || (i + 1)}</span>
        <span class="ranking-date">${h.date}${isToday ? '<span class="you-tag">YOU</span>' : ''}</span>
        <span class="ranking-value">${h.total.toFixed(1)}kg</span>
      </div>`;
  }).join('');
};