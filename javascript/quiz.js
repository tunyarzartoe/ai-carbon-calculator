/* =========================================================
   quiz.js → CO2 豆知識・ニュース機能（アプリ内完結版）
   ------------------------------------------------------------
   「3択に答えて正解/不正解」をやめ、短い豆知識または
   実際のニュース要約を読んでもらう形にする。外部リンクは
   一切開かず、要約はすべてアプリ内でその場で表示する。

   kind: 'tip'  → いつでも通用する評価軸で編集した基礎知識
   kind: 'news' → 実際の統計・発表をもとにした要約（source/date付き）
   ※ news の内容は編集部が要約したものであり、原文の引用ではない。
   ※ news は日付が入っているため、半年〜1年に一度は内容を
      見直して差し替えることをおすすめする（evergreenなtipは
      差し替え不要）。

   使い方（flow.js 側）:
     window.pickInsight(preferredCategory)
   → { id, category, kind, title, body, source, date } を1件返す
   ========================================================= */

window.CO2_INSIGHTS = [
  /* ---- evergreen tips ---- */
  { id: 'i1', category: 'transport', kind: 'tip',
    title: '電車は「みんなで乗るから」エコになる',
    body: '同じ距離を移動しても、電車は一度に大勢を運べるため、1人あたりのCO2排出量は車よりずっと少なくなるよ。' },
  { id: 'i2', category: 'transport', kind: 'tip',
    title: '飛行機は距離の割にCO2が多い',
    body: '飛行機は高高度で燃料を大量に燃やすため、同じ距離でも電車の何倍ものCO2を出すと言われているよ。' },
  { id: 'i3', category: 'transport', kind: 'tip',
    title: '自転車移動はほぼゼロ排出',
    body: '自転車は燃料を使わないから、走行中のCO2排出はほぼゼロ。健康にもいいから一石二鳥だね。' },
  { id: 'i4', category: 'electricity', kind: 'tip',
    title: '設定温度1℃で消費電力が変わる',
    body: '環境省によると、夏の冷房の設定温度を1℃上げるだけで、消費電力を約10%減らせると言われているよ。' },
  { id: 'i5', category: 'electricity', kind: 'tip',
    title: 'LED電球は白熱電球の5分の1の電力',
    body: 'LED電球は白熱電球よりずっと少ない電力で同じ明るさを出せるから、電気代もCO2も大きく減らせるよ。' },
  { id: 'i6', category: 'electricity', kind: 'tip',
    title: '冷蔵庫は詰め込みすぎると損する',
    body: '冷蔵庫は庫内に冷気を循環させて冷やしているから、詰め込みすぎると効率が落ちて余分な電力を使ってしまうよ。' },
  { id: 'i7', category: 'meal', kind: 'tip',
    title: '牛肉はCO2排出量が特に多い食材',
    body: '牛は消化の過程でメタンガスを出す上、飼育に広い土地や飼料が必要だから、牛肉はCO2排出量が特に多いんだ。' },
  { id: 'i8', category: 'meal', kind: 'tip',
    title: '地元産を選ぶと「フードマイレージ」が減る',
    body: '食べ物を遠くから運ぶほど輸送にCO2がかかるよ。地元で作られたものを選ぶだけでも輸送分のCO2を減らせるんだ。' },
  { id: 'i9', category: 'waste', kind: 'tip',
    title: 'リサイクルで採取と焼却のCO2を削減',
    body: 'リサイクルすれば新たに原料を採掘・製造する必要が減り、焼却するゴミも減るので、CO2排出を抑えられるよ。' },
  { id: 'i10', category: 'waste', kind: 'tip',
    title: '古着・中古品は「作らない選択」',
    body: '新しい服や製品を作るには原料の生産や製造工程でCO2が発生するから、リユースはその分をまるごと削減できるよ。' },
  { id: 'i11', category: 'general', kind: 'tip',
    title: '「カーボンニュートラル」の本当の意味',
    body: 'CO2の排出をゼロにするのではなく、植林などの吸収量と相殺して差し引きゼロを目指す考え方のことだよ。' },

  /* ---- 実際の統計・発表にもとづく要約（編集部パラフレーズ、原文の引用ではない）---- */
  { id: 'n1', category: 'electricity', kind: 'news',
    title: '日本の電源構成、再エネが約26.6%に',
    body: '2026年時点の日本の発電量は火力が約65%を占める一方、再生可能エネルギーは太陽光・水力・バイオマスなどを合わせて約26.6%まで伸びてきているよ。',
    source: '経済産業省関連データ', date: '2026年' },
  { id: 'n2', category: 'electricity', kind: 'news',
    title: '2026年度、企業の「炭素コスト」が本格化',
    body: '2026年度からGX-ETS（排出量取引制度）が本格運用され、企業がCO2排出にかかるコストを経営判断に組み込む動きが進んでいるよ。',
    source: '経済産業省', date: '2026年' },
  { id: 'n3', category: 'meal', kind: 'news',
    title: '日本の食品ロス、3年連続で減少',
    body: '令和6年度の食品ロス発生量は461万トンで前年から3万トン減少。ただし内訳を見ると、事業系は減った一方、家庭からのロスはやや増えているんだ。',
    source: '環境省・消費者庁', date: '2026年6月発表' },
  { id: 'n4', category: 'meal', kind: 'news',
    title: '食品ロス半減目標、日本はすでに達成',
    body: '日本は2030年までに食品ロスを半減させる目標を先んじて達成し、国連環境計画（UNEP）にも紹介される水準に。ただし家庭からのロス削減は依然として課題として残っているよ。',
    source: '環境省', date: '2026年4月発表' },
  { id: 'n5', category: 'waste', kind: 'news',
    title: '世界のプラスチック、リサイクル率はまだ9%',
    body: 'OECDの調査によると、これまで世界で生産されたプラスチックのうち実際にリサイクルされたのはわずか9%で、残りの大半は焼却・埋立・環境への流出だったんだ。',
    source: 'OECD', date: '調査時点' },
  { id: 'n6', category: 'waste', kind: 'news',
    title: '日本は2035年までにプラ100%有効利用を目標',
    body: 'プラスチック資源循環戦略では、2035年までに使用済みプラスチックをリユース・リサイクルなどで100%有効活用することが目標として掲げられているよ。',
    source: '環境省', date: '2021年策定・進行中' }
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

/* preferredCategory（今日いちばんCO2が多かったカテゴリ）に合わせて
   豆知識/ニュースを1件選ぶ。優先順位:
   1. そのカテゴリ × まだ見ていないもの
   2. カテゴリ問わず、まだ見ていないもの
   3. 全部見終えていたら履歴をリセットして最初から */
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

  console.debug('quiz.pickInsight', { preferredCategory, pickedId: picked.id, category: picked.category, kind: picked.kind });

  return {
    id: picked.id,
    category: picked.category,
    kind: picked.kind,
    title: picked.title,
    body: picked.body,
    source: picked.source || null,
    date: picked.date || null
  };
};