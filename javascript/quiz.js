/* =========================================================
   クイズ機能
   - CO2 Compass の診断フロー中に出題される一問一答クイズ
   - flow.js の quiz ステップから
       window.pickRandomQuiz(preferredCategory)
     が呼ばれ、{ id, category, q, choices: [{label, correct}], fact }
     の形で1問返す。choices は必ず3択。

   このバージョンでの改善点:
   1. 各問題に category（transport/electricity/meal/waste/general）を
      タグ付けし、flow.js が渡してくる「今日いちばんCO2が多かった
      カテゴリ」に沿った問題を優先的に出す（ただのトリビアから、
      本人の生活に直結した学びに変える）。
   2. 間違えた問題は復習リストに入り、正解できるまで優先的に
      再出題される（正解したら卒業）。
   3. 全問出題し終えるまでは同じ問題を繰り返さない
      （小さい問題バンクでもすぐ飽きないようにする）。
   ========================================================= */

window.QUIZ_BANK = [
  {
    id: 'q1', category: 'transport',
    q: '電車と車、同じ距離を移動したときCO2排出量が少ないのはどっち？',
    choices: [
      { label: '電車', correct: true },
      { label: '車（ガソリン車）', correct: false },
      { label: '同じくらい', correct: false }
    ],
    fact: '電車は多くの人を一度に運べるため、1人あたりのCO2排出量は車よりずっと少ないんだ。'
  },
  {
    id: 'q2', category: 'meal',
    q: '肉料理（特に牛肉）は野菜中心の食事と比べてCO2排出量がどうなる？',
    choices: [
      { label: 'かなり多くなる', correct: true },
      { label: 'ほとんど変わらない', correct: false },
      { label: '逆に少なくなる', correct: false }
    ],
    fact: '牛は消化の過程でメタンガスを出す上、飼育に広い土地や飼料が必要なため、牛肉はCO2排出量が特に多い食材なんだ。'
  },
  {
    id: 'q3', category: 'electricity',
    q: 'エアコンの設定温度を夏に1°C上げると、消費電力はどのくらい変わる？',
    choices: [
      { label: '約10%減る', correct: true },
      { label: 'ほぼ変わらない', correct: false },
      { label: '逆に増える', correct: false }
    ],
    fact: '環境省によると、冷房の設定温度を1°C上げるだけで消費電力を約10%削減できると言われているよ。'
  },
  {
    id: 'q4', category: 'waste',
    q: 'ゴミをきちんと分別してリサイクルすると、何が減らせる？',
    choices: [
      { label: '新しい資源の採取と焼却時のCO2', correct: true },
      { label: '家庭の電気代だけ', correct: false },
      { label: '何も変わらない', correct: false }
    ],
    fact: 'リサイクルすれば新たに原料を採掘・製造する必要が減り、焼却するゴミも減るので、CO2排出を抑えられるよ。'
  },
  {
    id: 'q5', category: 'meal',
    q: '「地産地消」（地元で作られたものを地元で消費すること）がエコな理由は？',
    choices: [
      { label: '輸送距離が短くCO2が減るから', correct: true },
      { label: '値段が必ず安くなるから', correct: false },
      { label: '生産量が必ず増えるから', correct: false }
    ],
    fact: '食べ物を遠くから運ぶほど輸送にCO2がかかるよ。地元産を選ぶと「フードマイレージ」が減らせるんだ。'
  },
  {
    id: 'q6', category: 'general',
    q: '世界の温室効果ガスの中で、最も排出量が多いのはどれ？',
    choices: [
      { label: '二酸化炭素（CO2）', correct: true },
      { label: 'メタン', correct: false },
      { label: 'フロンガス', correct: false }
    ],
    fact: '二酸化炭素は排出量そのものは多いけど1分子あたりの温室効果は比較的小さく、メタンは少量でも影響が大きいと言われているよ。'
  },
  {
    id: 'q7', category: 'electricity',
    q: 'LED電球は白熱電球と比べて消費電力がどのくらい少ない？',
    choices: [
      { label: '約80%少ない', correct: true },
      { label: '約20%少ない', correct: false },
      { label: 'ほぼ同じ', correct: false }
    ],
    fact: 'LED電球は白熱電球の5分の1程度の電力で同じ明るさを出せると言われていて、電気代もCO2も大幅に削減できるよ。'
  },
  {
    id: 'q8', category: 'electricity',
    q: '使っていない部屋の電気をこまめに消すことは、なぜ大事？',
    choices: [
      { label: '無駄な発電（＝CO2排出）を防げるから', correct: true },
      { label: '電球が長持ちしなくなるだけ', correct: false },
      { label: '特に意味はない', correct: false }
    ],
    fact: '発電の多くは化石燃料に頼っているため、使っていない電気を消すだけでも間接的にCO2排出を減らせるよ。'
  },
  {
    id: 'q9', category: 'transport',
    q: '飛行機での移動は、電車と比べてCO2排出量がどうなる？',
    choices: [
      { label: '同じ距離ならかなり多くなる', correct: true },
      { label: 'ほぼ同じ', correct: false },
      { label: '飛行機の方が少ない', correct: false }
    ],
    fact: '飛行機は高高度で燃料を燃やすため、同じ距離でも電車の何倍もCO2を排出すると言われているよ。'
  },
  {
    id: 'q10', category: 'meal',
    q: '「フードロス（食品廃棄）」を減らすことがエコにつながる理由は？',
    choices: [
      { label: '生産・輸送・廃棄すべての段階のCO2が無駄になるから', correct: true },
      { label: '値段が上がるから', correct: false },
      { label: '特に関係はない', correct: false }
    ],
    fact: '食べ物を作って運んで捨てるまでの全プロセスにCO2がかかっているので、食品ロスを減らすことは大きな削減につながるよ。'
  },
  {
    id: 'q11', category: 'waste',
    q: 'マイバッグ（エコバッグ）を使うことの主なメリットは？',
    choices: [
      { label: 'レジ袋（プラスチック）の生産・廃棄を減らせる', correct: true },
      { label: '買い物の量が増える', correct: false },
      { label: 'CO2とは無関係', correct: false }
    ],
    fact: 'プラスチック製のレジ袋は石油から作られていて、生産にも廃棄（焼却）にもCO2が発生するんだ。'
  },
  {
    id: 'q12', category: 'electricity',
    q: '夏、カーテンやブラインドを閉めて日差しを遮ると効果があるのは？',
    choices: [
      { label: '室温上昇を抑え冷房の電力を節約できる', correct: true },
      { label: '部屋が暗くなるだけで意味はない', correct: false },
      { label: '逆に電気代が増える', correct: false }
    ],
    fact: '直射日光を遮るだけで室温上昇をかなり抑えられ、冷房の設定を下げすぎずに済むので節電になるよ。'
  },
  {
    id: 'q13', category: 'transport',
    q: '自転車通勤・通学のCO2排出量は、車と比べてどうなる？',
    choices: [
      { label: 'ほぼゼロ', correct: true },
      { label: '車の半分くらい', correct: false },
      { label: '車と同じくらい', correct: false }
    ],
    fact: '自転車は燃料を使わないため、走行中のCO2排出はほぼゼロ。健康にもいいから一石二鳥だね。'
  },
  {
    id: 'q14', category: 'electricity',
    q: '冷蔵庫にものを詰め込みすぎると、なぜ電力の無駄になる？',
    choices: [
      { label: '冷気の循環が悪くなり余計に冷やそうとするから', correct: true },
      { label: '冷蔵庫が壊れやすくなるだけ', correct: false },
      { label: '特に影響はない', correct: false }
    ],
    fact: '冷蔵庫は庫内に冷気を循環させて冷やしているので、詰め込みすぎると効率が落ちて余分な電力を使ってしまうんだ。'
  },
  {
    id: 'q15', category: 'general',
    q: '「カーボンニュートラル」とはどんな意味？',
    choices: [
      { label: 'CO2の排出量と吸収・除去量を差し引きゼロにすること', correct: true },
      { label: 'CO2の排出を完全に禁止すること', correct: false },
      { label: '電気を一切使わないこと', correct: false }
    ],
    fact: 'カーボンニュートラルは排出をゼロにするのではなく、植林などの吸収量と相殺して実質ゼロを目指す考え方だよ。'
  },
  {
    id: 'q16', category: 'waste',
    q: '古着や中古品を活用（リユース）することのメリットは？',
    choices: [
      { label: '新品を作る際のCO2排出を減らせる', correct: true },
      { label: '流行に敏感になれるだけ', correct: false },
      { label: 'CO2とは関係がない', correct: false }
    ],
    fact: '新しい服や製品を作るには原料の生産や製造工程でCO2が発生するので、リユースはその分を丸ごと削減できるよ。'
  },
  {
    id: 'q17', category: 'electricity',
    q: '水道の使用量を減らすことも間接的にCO2削減につながる理由は？',
    choices: [
      { label: '浄水・給水にも電力（エネルギー）が使われているから', correct: true },
      { label: '水そのものがCO2を出すから', correct: false },
      { label: '関係はまったくない', correct: false }
    ],
    fact: '水をきれいにして各家庭に送るポンプや浄水設備にも電力が必要で、その発電時にCO2が発生しているんだ。'
  }
];

/* =========================================================
   出題履歴・復習リストの管理（localStorage）
   ========================================================= */
const QUIZ_STATE_KEY = 'co2compass-quiz-state';

function loadQuizState(){
  try {
    const raw = localStorage.getItem(QUIZ_STATE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      seen: Array.isArray(parsed.seen) ? parsed.seen : [],   // 一巡した問題のid
      wrong: Array.isArray(parsed.wrong) ? parsed.wrong : [] // まだ正解できていない問題のid（復習対象）
    };
  } catch (e){
    console.error('quiz.loadQuizState failed', e);
    return { seen: [], wrong: [] };
  }
}

function saveQuizState(state){
  try {
    localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(state));
  } catch (e){
    console.error('quiz.saveQuizState failed', e);
  }
}

window.lastQuizIndex = null; // 直前に出した問題のid（連続で同じ問題を避けるため）

/* 出題ロジックの優先順位:
   1. 苦手カテゴリ × まだ正解できていない問題（一番学びになる復習）
   2. 苦手カテゴリ × まだ出していない問題（新しい学び、本人に関係が深いテーマ）
   3. カテゴリ問わず、まだ正解できていない問題（復習）
   4. カテゴリ問わず、まだ出していない問題（全問一巡してから繰り返す）
   5. 全問出題済みなら履歴をリセットして最初から
   直前に出した問題（同じid）は、選択肢が複数あるかぎり避ける。 */
window.pickRandomQuiz = function(preferredCategory){
  const bank = window.QUIZ_BANK;
  if (!bank || bank.length === 0) return null;

  const state = loadQuizState();
  const notLast = bank.filter(q => q.id !== window.lastQuizIndex);
  const pool = notLast.length ? notLast : bank;

  const inCategory = q => !preferredCategory || q.category === preferredCategory;
  const isWrong = q => state.wrong.includes(q.id);
  const isUnseen = q => !state.seen.includes(q.id);

  let candidates = pool.filter(q => inCategory(q) && isWrong(q));
  if (candidates.length === 0) candidates = pool.filter(q => inCategory(q) && isUnseen(q));
  if (candidates.length === 0) candidates = pool.filter(isWrong);
  if (candidates.length === 0) candidates = pool.filter(isUnseen);

  if (candidates.length === 0){
    // 全問出題し終えたので出題履歴だけリセットする（復習リストは維持する）
    state.seen = [];
    saveQuizState(state);
    const fresh = pool.filter(inCategory);
    candidates = fresh.length ? fresh : pool;
  }

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  window.lastQuizIndex = picked.id;

  if (!state.seen.includes(picked.id)) state.seen.push(picked.id);
  saveQuizState(state);

  console.debug('quiz.pickRandomQuiz', {
    preferredCategory, pickedId: picked.id, pickedCategory: picked.category,
    candidateCount: candidates.length, reviewCount: state.wrong.length
  });
  return picked;
};

/* 回答のたびに flow.js から呼ばれる（既存の呼び出し口をそのまま利用）。
   間違えたら復習リストに追加、正解したら復習リストから卒業する。 */
window.recordQuizAnswer = function(quizId, correct){
  const state = loadQuizState();
  const idx = state.wrong.indexOf(quizId);
  if (correct){
    if (idx >= 0) state.wrong.splice(idx, 1);
  } else if (idx < 0){
    state.wrong.push(quizId);
  }
  saveQuizState(state);
  console.debug('quiz.recordQuizAnswer', { quizId, correct, reviewCount: state.wrong.length });
};

/* 認定証モーダルなどで「クイズの成績」を表示したくなったときのための集計。
   例: 累計で触れた問題数、まだ復習が必要な問題数など。 */
window.getQuizStats = function(){
  const state = loadQuizState();
  return {
    totalQuestions: window.QUIZ_BANK.length,
    seenCount: state.seen.length,
    reviewCount: state.wrong.length
  };
};