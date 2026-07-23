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
    const state = Object.assign({
      xp: 0,
      diagnosisCount: 0,
      sRankCount: 0,
      maxStreak: 0,
      bestGradeRank: undefined,
      quizCorrectCount: 0,
      weeklyKey: null,
      weeklyCleared: false,
      weeklyClearedCount: 0,
      badges: [],
      certId: null
    }, parsed);
    console.debug('gamify.loadGamifyState', state);
    return state;
  } catch (e){
    console.error('gamify.loadGamifyState failed', e);
    return {
      xp: 0, diagnosisCount: 0, sRankCount: 0, maxStreak: 0, bestGradeRank: undefined,
      quizCorrectCount: 0, weeklyKey: null, weeklyCleared: false, weeklyClearedCount: 0,
      badges: [], certId: null
    };
  }
};

window.saveGamifyState = function(g){
  try {
    localStorage.setItem(window.GAMIFY_KEY, JSON.stringify(g));
    console.debug('gamify.saveGamifyState', g);
  } catch (e){
    console.error('gamify.saveGamifyState failed', e);
  }
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
  { id: 'quiz10',   icon: '🧠',   title: 'クイズ博士',     desc: 'クイズに10回正解した',        check: g => g.quizCorrectCount >= 10 },
  { id: 'weekly5',  icon: '🎯',   title: 'チャレンジャー', desc: '週間チャレンジを5回クリアした', check: g => (g.weeklyClearedCount || 0) >= 5 }
];

/* =========================================================
   週替わりチャレンジ
   同じ週（月曜始まり）は全員同じチャレンジになるよう、
   ISO週キーからチャレンジ配列のインデックスを決定的に選ぶ。
   ========================================================= */
window.WEEKLY_CHALLENGES = [
  { icon: '🚌', text: '今週は移動のCO2を1回1kg以下に抑えよう', check: (b) => b.transport <= 1 },
  { icon: '🥗', text: '今週は野菜中心の食事を選んでみよう',     check: (b) => b.meal <= 2 },
  { icon: '💡', text: '今週は電気の使用を抑えてみよう',         check: (b) => b.electricity <= 1.5 },
  { icon: '♻️', text: '今週はゴミを必ず分別しよう',             check: (b) => b.waste <= 0.3 },
  { icon: '🎯', text: '今週は合計10kg以下を目指そう',           check: (b, total) => total <= 10 },
  { icon: '🚶', text: '今週は徒歩・自転車での移動に挑戦しよう', check: (b) => b.transport === 0 }
];

function isoWeekKey(date){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function hashStr(str){
  let h = 0;
  for (let i = 0; i < str.length; i++){
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

window.getWeeklyChallenge = function(){
  const key = isoWeekKey(new Date());
  const idx = hashStr(key) % window.WEEKLY_CHALLENGES.length;
  return Object.assign({ key }, window.WEEKLY_CHALLENGES[idx]);
};

/**
 * 診断完了時に呼ぶ。今週のチャレンジ条件を満たしていれば、
 * 週1回だけボーナスXPを加算してクリア扱いにする。
 */
window.evaluateWeeklyChallenge = function(breakdown, total){
  const challenge = window.getWeeklyChallenge();
  const g = window.loadGamifyState();

  if (g.weeklyKey !== challenge.key){
    g.weeklyKey = challenge.key;
    g.weeklyCleared = false;
  }

  const result = { challenge, justCleared: false, bonusXp: 0 };
  if (!g.weeklyCleared && challenge.check(breakdown, total)){
    const bonus = 20;
    g.weeklyCleared = true;
    g.weeklyClearedCount = (g.weeklyClearedCount || 0) + 1;
    g.xp += bonus;
    result.justCleared = true;
    result.bonusXp = bonus;
  }

  window.saveGamifyState(g);
  return result;
};

window.normalizeWeeklyGamifyState = function(){
  const challenge = window.getWeeklyChallenge();
  const g = window.loadGamifyState();
  if (g.weeklyKey !== challenge.key){
    g.weeklyKey = challenge.key;
    g.weeklyCleared = false;
    window.saveGamifyState(g);
  }
  return { challenge, state: g };
};

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
  window.updateLevelBadge();
  window.renderGrowthTree();
  const certData = window.getCertificateData();

  const card = document.getElementById('certificateCard');
  if (card){
    card.innerHTML = `
      <div class="cert-frame">
        <div class="cert-inner">
          <div class="cert-hologram"></div>
          <div class="cert-seal">
            <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
              <circle cx="50" cy="50" r="46" fill="none" stroke="var(--cyan)" stroke-width="1.5" opacity="0.55"></circle>
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--mint)" stroke-width="1" stroke-dasharray="3 4" opacity="0.6"></circle>
              <path d="M50 20 C62 28 62 46 50 54 C38 46 38 28 50 20 Z" fill="var(--mint)"></path>
              <polygon points="50,82 58,54 50,54 42,54" fill="var(--cyan)" opacity="0.75"></polygon>
              <circle cx="50" cy="54" r="5" fill="var(--bg-panel-2)" stroke="var(--text-hi)" stroke-width="1.4"></circle>
            </svg>
          </div>
          <p class="cert-kicker">ISSUED BY CO2 COMPASS AI</p>
          <h3 class="cert-title">CO<sub>2</sub> Compass 認定証</h3>
          <p class="cert-sub">地球にやさしい生活習慣への取り組みを証明します</p>
          <div class="cert-divider"></div>
          <div class="cert-stats">
            <div class="cert-stat"><span class="cert-stat-value">Lv.${certData.level}</span><span class="cert-stat-label">レベル</span></div>
            <div class="cert-stat"><span class="cert-stat-value">${certData.bestGrade}</span><span class="cert-stat-label">ベストランク</span></div>
            <div class="cert-stat"><span class="cert-stat-value">${certData.diagnosisCount}</span><span class="cert-stat-label">診断回数</span></div>
          </div>
          <p class="cert-badges-count">獲得バッジ ${certData.badgesUnlocked} / ${certData.badgesTotal}</p>
          <div class="cert-footer">
            <div class="cert-footer-row"><span class="cert-footer-label">発行日</span><span class="cert-footer-value">${certData.issueDate}</span></div>
            <div class="cert-footer-row"><span class="cert-footer-label">証明書番号</span><span class="cert-footer-value">${certData.certId}</span></div>
          </div>
        </div>
      </div>`;
  }

  const weeklyEl = document.getElementById('weeklyChallengeCard');
  if (weeklyEl){
    const { challenge, state: g2 } = window.normalizeWeeklyGamifyState();
    const cleared = g2.weeklyKey === challenge.key && g2.weeklyCleared;
    const clearedCount = g2.weeklyClearedCount || 0;
    weeklyEl.innerHTML = `
      <p class="weekly-heading">${challenge.icon} 今週のチャレンジ</p>
      <p class="weekly-text">${challenge.text}</p>
      <p class="weekly-status ${cleared ? 'cleared' : ''}">${cleared ? '✅ クリア済み' : '診断すると自動で判定されるよ'}</p>
      <p class="weekly-meta">これまでにチャレンジを達成した回数: ${clearedCount}回</p>
    `;
  }

  const grid = document.getElementById('badgesGrid');
  if (grid){
    const g = window.loadGamifyState();
    const unlocked = g.badges || [];
    const sortedBadges = [...window.BADGES].sort((a, b) => {
      const aUnlocked = unlocked.includes(a.id);
      const bUnlocked = unlocked.includes(b.id);
      if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;
      return window.BADGES.indexOf(a) - window.BADGES.indexOf(b);
    });

    if (unlocked.length === 0){
      grid.innerHTML = '<p class="badges-empty">まだバッジがありません。診断を続けて獲得しよう！</p>';
    } else {
      grid.innerHTML = sortedBadges.map(b => {
        const isUnlocked = unlocked.includes(b.id);
        return `
        <div class="badge-cell ${isUnlocked ? 'unlocked' : 'locked'}">
          <span class="badge-icon">${isUnlocked ? b.icon : '🔒'}</span>
          <span class="badge-title">${b.title}</span>
          <span class="badge-desc">${b.desc}</span>
        </div>`;
      }).join('');
    }
  }

  const shareBtn = document.getElementById('certShareBtn');
  if (shareBtn) shareBtn.onclick = () => window.shareCertificateImage(certData);
  const downloadBtn = document.getElementById('certDownloadBtn');
  if (downloadBtn) downloadBtn.onclick = () => window.downloadCertificateImage(certData);

  const exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) exportBtn.onclick = () => window.downloadBackupFile();

  const importBtn = document.getElementById('importDataBtn');
  const importInput = document.getElementById('importFileInput');
  if (importBtn && importInput){
    importBtn.onclick = () => importInput.click();
    importInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      window.importBackupFile(file, (ok, message) => {
        importInput.value = '';
        if (ok){
          alert(`${message} ページを再読み込みして反映するね。`);
          location.reload();
        } else {
          alert(message);
        }
      });
    };
  }
};

window.levelFor = function(xp){
  return Math.floor(xp / XP_PER_LEVEL) + 1;
};

window.xpIntoLevel = function(xp){
  return xp % XP_PER_LEVEL;
};

/* =========================================================
   成長する木（レベルに応じて種→若木→大木→満開に育つビジュアル）
   ========================================================= */
window.GROWTH_STAGES = [
  { id: 'seed',   minLevel: 1,  label: '🌱 種' },
  { id: 'sprout', minLevel: 3,  label: '🌿 芽ばえ' },
  { id: 'young',  minLevel: 6,  label: '🌳 若木' },
  { id: 'tree',   minLevel: 10, label: '🌲 大木' },
  { id: 'bloom',  minLevel: 15, label: '🌸 満開' }
];

window.getGrowthStage = function(level){
  let current = window.GROWTH_STAGES[0];
  window.GROWTH_STAGES.forEach(s => { if (level >= s.minLevel) current = s; });
  return current;
};

function nextGrowthStage(stageId){
  const idx = window.GROWTH_STAGES.findIndex(s => s.id === stageId);
  return window.GROWTH_STAGES[idx + 1] || null;
}

window.renderGrowthTreeSvg = function(stageId){
  const ground = `<rect x="18" y="96" width="84" height="6" rx="3" fill="var(--border)"></rect>`;
  let parts = '';

  if (stageId === 'seed'){
    parts = `
      <ellipse cx="60" cy="93" rx="11" ry="5" fill="var(--bg-panel-2)"></ellipse>
      <circle cx="60" cy="88" r="7" fill="var(--mint)"></circle>`;
  } else if (stageId === 'sprout'){
    parts = `
      <line x1="60" y1="96" x2="60" y2="72" stroke="var(--mint)" stroke-width="4" stroke-linecap="round"></line>
      <ellipse cx="49" cy="75" rx="11" ry="6" fill="var(--mint)" transform="rotate(-30 49 75)"></ellipse>
      <ellipse cx="71" cy="75" rx="11" ry="6" fill="var(--mint)" transform="rotate(30 71 75)"></ellipse>`;
  } else if (stageId === 'young'){
    parts = `
      <line x1="60" y1="96" x2="60" y2="54" stroke="var(--text-dim)" stroke-width="5" stroke-linecap="round"></line>
      <circle cx="60" cy="48" r="24" fill="var(--mint)" opacity="0.92"></circle>`;
  } else if (stageId === 'tree'){
    parts = `
      <line x1="60" y1="96" x2="60" y2="40" stroke="var(--text-dim)" stroke-width="6" stroke-linecap="round"></line>
      <circle cx="43" cy="44" r="21" fill="var(--mint)" opacity="0.85"></circle>
      <circle cx="77" cy="44" r="21" fill="var(--mint)" opacity="0.85"></circle>
      <circle cx="60" cy="28" r="26" fill="var(--mint)"></circle>`;
  } else if (stageId === 'bloom'){
    parts = `
      <line x1="60" y1="96" x2="60" y2="40" stroke="var(--text-dim)" stroke-width="6" stroke-linecap="round"></line>
      <circle cx="43" cy="44" r="21" fill="var(--mint)" opacity="0.85"></circle>
      <circle cx="77" cy="44" r="21" fill="var(--mint)" opacity="0.85"></circle>
      <circle cx="60" cy="28" r="26" fill="var(--mint)"></circle>
      <circle cx="42" cy="34" r="3.5" fill="var(--cyan)"></circle>
      <circle cx="80" cy="38" r="3.5" fill="var(--cyan)"></circle>
      <circle cx="60" cy="14" r="3.5" fill="var(--cyan)"></circle>
      <circle cx="68" cy="56" r="3.5" fill="var(--cyan)"></circle>
      <circle cx="38" cy="54" r="3.5" fill="var(--cyan)"></circle>`;
  }

  return `<svg viewBox="0 0 120 110" aria-hidden="true" focusable="false">${ground}${parts}</svg>`;
};

window.renderGrowthTree = function(){
  const el = document.getElementById('growthTreeCard');
  if (!el) return;
  const g = window.loadGamifyState();
  const level = window.levelFor(g.xp);
  const stage = window.getGrowthStage(level);
  const next = nextGrowthStage(stage.id);
  const nextLine = next
    ? `Lv.${next.minLevel}で${next.label}に成長するよ`
    : '最大まで成長したよ！';

  el.innerHTML = `
    <div class="growth-tree-visual">${window.renderGrowthTreeSvg(stage.id)}</div>
    <p class="growth-tree-label">${stage.label}</p>
    <p class="growth-tree-next">${nextLine}</p>
  `;
};

/* 連続診断日数（今日を含む）を history から計算 */
window.computeStreak = function(history){
  const dates = new Set(history.map(h => h.date));
  let streak = 0;
  const cursor = new Date();
  while (true){
    const key = window.formatLocalDate(cursor);
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