/* =========================================================
   quiz.js → CO2 豆知識機能（evergreen版）
   ------------------------------------------------------------
   以前は日付付きの「ニュース」も混ぜていたが、時間が経つと
   内容が古くなり、開発側が定期的に手動更新しないと成立しない
   仕組みだった。そのため日付・出典付きの内容はすべて廃止し、
   いつ見ても通用する評価軸の豆知識だけに絞った。
   メンテナンス不要、内容が古くなる心配もない。

   使い方（flow.js 側）:
     window.pickInsight(preferredCategory)
   → { id, category, title, body } を1件返す
   ========================================================= */

window.CO2_INSIGHTS = [
  { id: 'i1', category: 'transport',
    title: '電車は「みんなで乗るから」エコになる',
    body: '同じ距離を移動しても、電車は一度に大勢を運べるため、1人あたりのCO2排出量は車よりずっと少なくなるよ。' },
  { id: 'i2', category: 'transport',
    title: '飛行機は距離の割にCO2が多い',
    body: '飛行機は高高度で燃料を大量に燃やすため、同じ距離でも電車の何倍ものCO2を出すと言われているよ。' },
  { id: 'i3', category: 'transport',
    title: '自転車移動はほぼゼロ排出',
    body: '自転車は燃料を使わないから、走行中のCO2排出はほぼゼロ。健康にもいいから一石二鳥だね。' },
  { id: 'i4', category: 'electricity',
    title: '設定温度1℃で消費電力が変わる',
    body: '環境省によると、夏の冷房の設定温度を1℃上げるだけで、消費電力を約10%減らせると言われているよ。' },
  { id: 'i5', category: 'electricity',
    title: 'LED電球は白熱電球の5分の1の電力',
    body: 'LED電球は白熱電球よりずっと少ない電力で同じ明るさを出せるから、電気代もCO2も大きく減らせるよ。' },
  { id: 'i6', category: 'electricity',
    title: '冷蔵庫は詰め込みすぎると損する',
    body: '冷蔵庫は庫内に冷気を循環させて冷やしているから、詰め込みすぎると効率が落ちて余分な電力を使ってしまうよ。' },
  { id: 'i7', category: 'electricity',
    title: '使わない部屋の電気を消す意味',
    body: '発電の多くは化石燃料に頼っているから、使っていない電気を消すだけでも間接的にCO2排出を減らせるよ。' },
  { id: 'i8', category: 'meal',
    title: '牛肉はCO2排出量が特に多い食材',
    body: '牛は消化の過程でメタンガスを出す上、飼育に広い土地や飼料が必要だから、牛肉はCO2排出量が特に多いんだ。' },
  { id: 'i9', category: 'meal',
    title: '地元産を選ぶと「フードマイレージ」が減る',
    body: '食べ物を遠くから運ぶほど輸送にCO2がかかるよ。地元で作られたものを選ぶだけでも輸送分のCO2を減らせるんだ。' },
  { id: 'i10', category: 'meal',
    title: 'フードロスもCO2の無駄づかい',
    body: '食べ物を作って運んで捨てるまでの全プロセスにCO2がかかっているから、食品ロスを減らすことは大きな削減につながるよ。' },
  { id: 'i11', category: 'waste',
    title: 'リサイクルで採取と焼却のCO2を削減',
    body: 'リサイクルすれば新たに原料を採掘・製造する必要が減り、焼却するゴミも減るので、CO2排出を抑えられるよ。' },
  { id: 'i12', category: 'waste',
    title: '古着・中古品は「作らない選択」',
    body: '新しい服や製品を作るには原料の生産や製造工程でCO2が発生するから、リユースはその分をまるごと削減できるよ。' },
  { id: 'i13', category: 'waste',
    title: 'マイバッグはプラスチックの削減に直結',
    body: 'レジ袋は石油から作られていて、生産にも廃棄（焼却）にもCO2が発生するから、マイバッグはその両方を減らせるよ。' },
  { id: 'i14', category: 'general',
    title: '「カーボンニュートラル」の本当の意味',
    body: 'CO2の排出をゼロにするのではなく、植林などの吸収量と相殺して差し引きゼロを目指す考え方のことだよ。' }
];

/* =========================================================
   出題（表示）履歴の管理（localStorage）
   すべて見終わるまでは同じ内容を繰り返さない。
   ========================================================= */
const INSIGHT_STATE_KEY = 'co2compass-insight-state';

function loadInsightState(){
  try {
    const raw = localStorage.getItem(INSIGHT_STATE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { seen: Array.isArray(parsed.seen) ? parsed.seen : [] };
  } catch (e){
    console.error('quiz.loadInsightState failed', e);
    return { seen: [] };
  }
}

function saveInsightState(state){
  try {
    localStorage.setItem(INSIGHT_STATE_KEY, JSON.stringify(state));
  } catch (e){
    console.error('quiz.saveInsightState failed', e);
  }
}

window.lastInsightIndex = null; // 直前に出した内容のid（連続で同じものを避ける）

window.pickInsight = function(preferredCategory){
  const bank = window.CO2_INSIGHTS;
  if (!bank || bank.length === 0) return null;

  const state = loadInsightState();
  const notLast = bank.filter(i => i.id !== window.lastInsightIndex);
  const pool = notLast.length ? notLast : bank;

  const inCategory = i => !preferredCategory || i.category === preferredCategory;
  const isUnseen = i => !state.seen.includes(i.id);

  let candidates = pool.filter(i => inCategory(i) && isUnseen(i));
  if (candidates.length === 0) candidates = pool.filter(isUnseen);
  if (candidates.length === 0){
    state.seen = [];
    saveInsightState(state);
    const fresh = pool.filter(inCategory);
    candidates = fresh.length ? fresh : pool;
  }

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  window.lastInsightIndex = picked.id;

  if (!state.seen.includes(picked.id)) state.seen.push(picked.id);
  saveInsightState(state);

  console.debug('quiz.pickInsight', { preferredCategory, pickedId: picked.id, category: picked.category });

  return {
    id: picked.id,
    category: picked.category,
    title: picked.title,
    body: picked.body
  };
};