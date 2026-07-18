/* =========================================================
   クイズ機能
   - CO2 Compass の診断フロー中に出題される一問一答クイズ
   - flow.js の quiz ステップから window.pickRandomQuiz() が呼ばれ、
     { q, choices: [{label, correct}], fact } の形で1問返す
   - choices は必ず3択（flow.js 側が Ⓐ Ⓑ Ⓒ の3ラベルを想定しているため）
   ========================================================= */

window.QUIZ_BANK = [
  {
    q: '電車と車、同じ距離を移動したときCO2排出量が少ないのはどっち？',
    choices: [
      { label: '電車', correct: true },
      { label: '車（ガソリン車）', correct: false },
      { label: '同じくらい', correct: false }
    ],
    fact: '電車は多くの人を一度に運べるため、1人あたりのCO2排出量は車よりずっと少ないんだ。'
  },
  {
    q: '肉料理（特に牛肉）は野菜中心の食事と比べてCO2排出量がどうなる？',
    choices: [
      { label: 'かなり多くなる', correct: true },
      { label: 'ほとんど変わらない', correct: false },
      { label: '逆に少なくなる', correct: false }
    ],
    fact: '牛は消化の過程でメタンガスを出す上、飼育に広い土地や飼料が必要なため、牛肉はCO2排出量が特に多い食材なんだ。'
  },
  {
    q: 'エアコンの設定温度を夏に1°C上げると、消費電力はどのくらい変わる？',
    choices: [
      { label: '約10%減る', correct: true },
      { label: 'ほぼ変わらない', correct: false },
      { label: '逆に増える', correct: false }
    ],
    fact: '環境省によると、冷房の設定温度を1°C上げるだけで消費電力を約10%削減できると言われているよ。'
  },
  {
    q: 'ゴミをきちんと分別してリサイクルすると、何が減らせる？',
    choices: [
      { label: '新しい資源の採取と焼却時のCO2', correct: true },
      { label: '家庭の電気代だけ', correct: false },
      { label: '何も変わらない', correct: false }
    ],
    fact: 'リサイクルすれば新たに原料を採掘・製造する必要が減り、焼却するゴミも減るので、CO2排出を抑えられるよ。'
  },
  {
    q: '「地産地消」（地元で作られたものを地元で消費すること）がエコな理由は？',
    choices: [
      { label: '輸送距離が短くCO2が減るから', correct: true },
      { label: '値段が必ず安くなるから', correct: false },
      { label: '生産量が必ず増えるから', correct: false }
    ],
    fact: '食べ物を遠くから運ぶほど輸送にCO2がかかるよ。地元産を選ぶと「フードマイレージ」が減らせるんだ。'
  },
  {
    q: '世界の温室効果ガスの中で、最も排出量が多いのはどれ？',
    choices: [
      { label: '二酸化炭素（CO2）', correct: true },
      { label: 'メタン', correct: false },
      { label: 'フロンガス', correct: false }
    ],
    fact: '二酸化炭素は排出量そのものは多いけど1分子あたりの温室効果は比較的小さく、メタンは少量でも影響が大きいと言われているよ。'
  },
  {
    q: 'LED電球は白熱電球と比べて消費電力がどのくらい少ない？',
    choices: [
      { label: '約80%少ない', correct: true },
      { label: '約20%少ない', correct: false },
      { label: 'ほぼ同じ', correct: false }
    ],
    fact: 'LED電球は白熱電球の5分の1程度の電力で同じ明るさを出せると言われていて、電気代もCO2も大幅に削減できるよ。'
  },
  {
    q: '使っていない部屋の電気をこまめに消すことは、なぜ大事？',
    choices: [
      { label: '無駄な発電（＝CO2排出）を防げるから', correct: true },
      { label: '電球が長持ちしなくなるから', correct: false },
      { label: '特に意味はない', correct: false }
    ],
    fact: '発電の多くは化石燃料に頼っているため、使っていない電気を消すだけでも間接的にCO2排出を減らせるよ。'
  },
  {
    q: '飛行機での移動は、電車と比べてCO2排出量がどうなる？',
    choices: [
      { label: '同じ距離ならかなり多くなる', correct: true },
      { label: 'ほぼ同じ', correct: false },
      { label: '飛行機の方が少ない', correct: false }
    ],
    fact: '飛行機は高高度で燃料を燃やすため、同じ距離でも電車の何倍もCO2を排出すると言われているよ。'
  },
  {
    q: '「フードロス（食品廃棄）」を減らすことがエコにつながる理由は？',
    choices: [
      { label: '生産・輸送・廃棄すべての段階のCO2が無駄になるから', correct: true },
      { label: '値段が上がるから', correct: false },
      { label: '特に関係はない', correct: false }
    ],
    fact: '食べ物を作って運んで捨てるまでの全プロセスにCO2がかかっているので、食品ロスを減らすことは大きな削減につながるよ。'
  },
  {
    q: 'マイバッグ（エコバッグ）を使うことの主なメリットは？',
    choices: [
      { label: 'レジ袋（プラスチック）の生産・廃棄を減らせる', correct: true },
      { label: '買い物の量が増える', correct: false },
      { label: 'CO2とは無関係', correct: false }
    ],
    fact: 'プラスチック製のレジ袋は石油から作られていて、生産にも廃棄（焼却）にもCO2が発生するんだ。'
  },
  {
    q: '夏、カーテンやブラインドを閉めて日差しを遮ると効果があるのは？',
    choices: [
      { label: '室温上昇を抑え冷房の電力を節約できる', correct: true },
      { label: '部屋が暗くなるだけで意味はない', correct: false },
      { label: '逆に電気代が増える', correct: false }
    ],
    fact: '直射日光を遮るだけで室温上昇をかなり抑えられ、冷房の設定を下げすぎずに済むので節電になるよ。'
  },
  {
    q: '自転車通勤・通学のCO2排出量は、車と比べてどうなる？',
    choices: [
      { label: 'ほぼゼロ', correct: true },
      { label: '車の半分くらい', correct: false },
      { label: '車と同じくらい', correct: false }
    ],
    fact: '自転車は燃料を使わないため、走行中のCO2排出はほぼゼロ。健康にもいいから一石二鳥だね。'
  },
  {
    q: '冷蔵庫にものを詰め込みすぎると、なぜ電力の無駄になる？',
    choices: [
      { label: '冷気の循環が悪くなり余計に冷やそうとするから', correct: true },
      { label: '冷蔵庫が壊れやすくなるだけ', correct: false },
      { label: '特に影響はない', correct: false }
    ],
    fact: '冷蔵庫は庫内に冷気を循環させて冷やしているので、詰め込みすぎると効率が落ちて余分な電力を使ってしまうんだ。'
  },
  {
    q: '「カーボンニュートラル」とはどんな意味？',
    choices: [
      { label: 'CO2の排出量と吸収・除去量を差し引きゼロにすること', correct: true },
      { label: 'CO2の排出を完全に禁止すること', correct: false },
      { label: '電気を一切使わないこと', correct: false }
    ],
    fact: 'カーボンニュートラルは排出をゼロにするのではなく、植林などの吸収量と相殺して実質ゼロを目指す考え方だよ。'
  },
  {
    q: '古着や中古品を活用（リユース）することのメリットは？',
    choices: [
      { label: '新品を作る際のCO2排出を減らせる', correct: true },
      { label: '流行に敏感になれるだけ', correct: false },
      { label: 'CO2とは関係がない', correct: false }
    ],
    fact: '新しい服や製品を作るには原料の生産や製造工程でCO2が発生するので、リユースはその分を丸ごと削減できるよ。'
  },
  {
    q: '水道の使用量を減らすことも間接的にCO2削減につながる理由は？',
    choices: [
      { label: '浄水・給水にも電力（エネルギー）が使われているから', correct: true },
      { label: '水そのものがCO2を出すから', correct: false },
      { label: '関係はまったくない', correct: false }
    ],
    fact: '水をきれいにして各家庭に送るポンプや浄水設備にも電力が必要で、その発電時にCO2が発生しているんだ。'
  }
];

window.lastQuizIndex = null;

window.pickRandomQuiz = function(){
  const bank = window.QUIZ_BANK;
  if (!bank || bank.length === 0) return null;
  let idx;
  if (bank.length === 1){
    idx = 0;
  } else {
    do {
      idx = Math.floor(Math.random() * bank.length);
    } while (idx === window.lastQuizIndex);
  }
  window.lastQuizIndex = idx;
  return bank[idx];
};