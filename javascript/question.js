const categories = ["日常生活", "科学・自然", "社会・仕組み", "技術・EV", "未来・対策"];

const qaData = [
    { cat: 0, title: "1. CO2濃度が高くなるとどうなる？", q: "部屋のCO2濃度が高くなると、体や環境にどんな影響があるの？", a: "室内では1000ppmを超えると眠気や集中力低下が起き、2000ppm超えで頭痛を感じることもあります。\n地球全体では温暖化の原因になります。" },
    { cat: 0, title: "2. 生活で一番CO2が出るタイミングは？", q: "普段の生活で、どんな時にCO2がたくさん排出されているの？", a: "電気・ガスの使用とガソリン車の運転です。\n特にエアコンや給湯器の使用時のエネルギー消費が大きな割合を占めます。" },
    { cat: 0, title: "3. 個人でできる最高の削減方法は？", q: "日常ですぐにできる、一番効果的なCO2削減方法は？", a: "「節電」と「移動手段の見直し」です。\nエアコン温度を1℃調整したり、近い距離は徒歩や自転車にするだけで年間数十kgの削減になります。" },
    { cat: 0, title: "4. 食品の選び方で削減できる？", q: "食べ物の選び方でもCO2削減になるって本当？", a: "本当です！「地産地消」で輸送時のCO2を削減できます。\nまた「食品ロス」を減らすこともゴミ焼却時の排出削減に直結します。" },
    { cat: 0, title: "5. 洋服もCO2を出しているの？", q: "服を買うことがCO2に関係しているの？", a: "製造・染色・輸送・廃棄の全工程で大量のCO2が出ます。\n1着を長く大切に着ることが手軽で効果的なエコ活動です。" },
    { cat: 0, title: "6. 家の断熱を変えるとCO2が減る？", q: "窓や壁の断熱リフォームって効果あるの？", a: "非常に大きな効果があります！\n冷暖房の効率が劇的に上がり、電気代とCO2の両方を大きく削減できます。" },
    { cat: 0, title: "7. デジタル利用でもCO2は出る？", q: "スマホやネットを使うだけでもCO2が出る？", a: "出ます！データセンターや通信設備が大量の電気を使うためです。\n不要なメール削除や動画画質の調整もエコにつながります。" },
    { cat: 0, title: "8. 水道水とペットボトルの違いは？", q: "水を買うのと水道水を使うのでCO2は違う？", a: "ペットボトル水は容器の製造・輸送・廃棄で水道水の数百倍のCO2を出します。\nマイボトル活用が非常に効果的です。" },

    { cat: 1, title: "1. 森林（木）のCO2吸収量は？", q: "木は1本で年間どれくらいCO2を吸ってくれるの？", a: "スギの大木1本で年間約14kg吸収します。\n人が1年に出すCO2（約2トン）を相殺するには約140本の木が必要です。" },
    { cat: 1, title: "2. 他の温室効果ガスとの違いは？", q: "メタンやフロンガスとCO2の違いは何？", a: "メタンなどは1分子あたりの温室効果が強力ですが、排出される絶対量が圧倒的に多いのは「CO2」です。" },
    { cat: 1, title: "3. 海もCO2を吸収している？", q: "海がCO2を吸うことで問題はあるの？", a: "人間が出したCO2の約30%を海が吸っていますが、吸いすぎると「海洋酸性化」が進みサンゴ等に悪影響が出ます。" },
    { cat: 1, title: "4. 現在の地球のCO2濃度は？", q: "地球のCO2濃度は今どれくらい？昔と比べてどう？", a: "現在は約420ppmです。\n産業革命前（約280ppm）と比べて1.5倍以上に急増しています。" },
    { cat: 1, title: "5. ブルーカーボンって何？", q: "ブルーカーボンってどういう意味？", a: "浅瀬の海草や湿地など「海の生態系」が吸収・蓄積する炭素のことです。" },
    { cat: 1, title: "6. 1.5℃目標を超えるとどうなる？", q: "気温が1.5℃上がると何が危険なの？", a: "サンゴ礁の9割以上が死滅し、異常気象や干ばつ、海面上昇が壊滅的なレベルになると懸念されています。" },
    { cat: 1, title: "7. 温室効果自体は悪ものなの？", q: "温室効果ガスって全く無い方が良いの？", a: "全くなければ地球の平均気温は-18℃の極寒になります。\n適度な温室効果は必要ですが、増えすぎたことが問題です。" },
    { cat: 1, title: "8. 永久凍土が溶けるとヤバい？", q: "北極などの永久凍土が溶けると何が起きる？", a: "凍土の中に閉じ込められていた大量のメタンガスやCO2が放出し、温暖化がさらに加速します。" },

    { cat: 2, title: "1. カーボンニュートラルの意味は？", q: "「カーボンニュートラル」って簡単に言うと何？", a: "「CO2排出量」と「植林等の吸収量」を同じにして、全体で実質ゼロにすることです。" },
    { cat: 2, title: "2. 炭素税（カーボンプライシング）とは？", q: "炭素税の仕組みについて教えて！", a: "CO2を多く出す企業にお金を払わせることで、「CO2を出すと損をする」状況を作り省エネを促す仕組みです。" },
    { cat: 2, title: "3. パリ協定ってどんな約束？", q: "パリ協定の世界目標は何を目指しているの？", a: "気温上昇を産業革命前より「1.5℃以内」に抑えることを目指す世界共通の協定です。" },
    { cat: 2, title: "4. Scope 1, 2, 3 の違いは？", q: "企業が言うScope1, 2, 3って何のこと？", a: "Scope1:自社での直接排出、Scope2:買った電気による排出、Scope3:サプライチェーン全体での排出です。" },
    { cat: 2, title: "5. カーボンオフセットとは？", q: "カーボンオフセットってどうやって相殺するの？", a: "減らしきれないCO2分を、他の場所の削減・植林活動にお金を出すことで埋め合わせる仕組みです。" },
    { cat: 2, title: "6. 排出量取引（J-クレジット）って？", q: "CO2の排出量を売買できるって本当？", a: "本当です！省エネで削減したCO2量を「クレジット」として権利化し、他の企業に売買する制度があります。" },
    { cat: 2, title: "7. ESG投資って何？", q: "最近投資でよく聞くESGって環境に関係ある？", a: "環境(E)・社会(S)・ガバナンス(G)に配慮している企業を選んで優先的に投資する仕組みです。" },
    { cat: 2, title: "8. 世界で一番CO2を出している国は？", q: "世界でCO2排出量が最も多い国はどこ？", a: "1位は中国、2位はアメリカ、3位はインドです。日本は世界5位前後となっています。" },

    { cat: 3, title: "1. EV（電気自動車）でCO2は減る？", q: "EVにすると本当にCO2は減らせるの？", a: "走行時に出さないため大きく減らせます！\n発電時の排出を含めてもガソリン車より約半減〜それ以上の削減効果があります。" },
    { cat: 3, title: "2. 再エネを使うとなぜCO2が減る？", q: "太陽光や風力発電がCO2削減になる理由は？", a: "火力発電のように燃料を燃やさないからです！\n発電時にCO2を一切排出しないクリーンなエネルギーです。" },
    { cat: 3, title: "3. CO2を捕まえて埋める技術（CCS）とは？", q: "出ちゃったCO2を回収して固める技術があるって本当？", a: "本当です！「CCS」と呼ばれ、工場等から出たCO2を集めて地下深くに封じ込める技術の開発が進んでいます。" },
    { cat: 3, title: "4. 水素エネルギーってCO2を出さない？", q: "次世代燃料の「水素」ってなんでエコなの？", a: "水素は燃やしても「水」しか出ず、CO2を一切出さないからです！" },
    { cat: 3, title: "5. 太陽光パネル製造時のCO2は相殺できる？", q: "パネルを作る時もCO2が出るけど、トータルで得なの？", a: "得になります！\n製造時のCO2は発電開始から約1〜2年で回収でき、残りの20年以上はCO2ゼロ電力を生み出します。" },
    { cat: 3, title: "6. プラスチックとCO2の関係は？", q: "プラごみを減らすことがCO2削減になるのはなぜ？", a: "プラスチックは石油から作られており、製造や焼却時に大量のCO2が発生するからです。" },
    { cat: 3, title: "7. 飛行機と電車のCO2の違いは？", q: "乗り物によって排出量はどれくらい変わる？", a: "1人を1km運ぶ排出量は、電車に比べて飛行機は約5倍、自家用車は約6倍以上にもなります。" },
    { cat: 3, title: "8. 人工光合成ってどんな技術？", q: "「人工光合成」でCO2を減らせるって本当？", a: "植物のように太陽光とCO2と水からプラスチック原料などを作る未来の技術です。" },

    { cat: 4, title: "1. CO2センサーの効果的な置き場所は？", q: "部屋でCO2センサーを使う時、どこに置くのが正しい？", a: "人の頭の高さや部屋の中央付近です。\n窓際やエアコンの風が直接当たる場所は避けて設置します。" },
    { cat: 4, title: "2. 部屋の換気でCO2はすぐ下がる？", q: "部屋のCO2濃度を下げる一番手軽な方法は？", a: "窓を2箇所開けて空気の通り道を作ることです。\n数分間の換気で2000ppmから正常値まで下がります。" },
    { cat: 4, title: "3. これから先の未来、CO2は減る？", q: "地球の未来はどうなる？CO2は本当に減らせるのかな？", a: "世界中で再エネへの移行や脱炭素技術が進んでいます。\n一人ひとりの行動と技術革新で未来を変えていくことができます！" },
    { cat: 4, title: "4. ネガティブエミッション技術とは？", q: "大気中のCO2を直接減らす技術ってあるの？", a: "大気から直接CO2を回収する「DAC」など、大気中のCO2を直接減らす技術の研究が進んでいます。" },
    { cat: 4, title: "5. 食料問題とCO2はどう関係する？", q: "温暖化が進むとご飯が食べられなくなる？", a: "干ばつや大雨で農作物の収穫量が減り、世界的な食料不足や価格高騰を引き起こすリスクがあります。" },
    { cat: 4, title: "6. サーキュラーエコノミーとは？", q: "循環型社会（サーキュラーエコノミー）って何？", a: "ゴミを出さず、資源を何度も循環させて使い続ける経済仕組みのことです。" },
    { cat: 4, title: "7. 気候正義（クライメート・ジャスティス）とは？", q: "気候正義という言葉はどういう意味？", a: "CO2をあまり出していない途上国が、温暖化の深刻な被害を一番受けている不平等を正そうという考え方です。" },
    { cat: 4, title: "8. 私たちに今すぐできる一番の行動は？", q: "個人として今すぐ始められることは何？", a: "環境に関心を持ち「知ること」「周りと話すこと」、そしてできる節電やマイボトル活用から一歩を踏み出すことです！" }
];

let currentTab = 0;

function getCurrentTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

function appendMessage(text, isUser = false) {
    const chatBox = document.getElementById("chat-box");
    const rowDiv = document.createElement("div");
    rowDiv.className = `message-row ${isUser ? 'user' : 'ai'}`;

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "message-content-wrapper";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    if (!isUser) {
        const label = document.createElement("div");
        label.className = "speaker-label-inside";
        label.textContent = "AI";
        bubble.appendChild(label);
    }

    const textSpan = document.createElement("div");
    textSpan.textContent = text;
    bubble.appendChild(textSpan);

    contentWrapper.appendChild(bubble);

    const meta = document.createElement("div");
    meta.className = "message-meta";

    if (isUser) {
        const readSpan = document.createElement("span");
        readSpan.className = "read-status";
        readSpan.textContent = "既読";
        meta.appendChild(readSpan);
    }

    const timeSpan = document.createElement("span");
    timeSpan.textContent = getCurrentTime();
    meta.appendChild(timeSpan);

    contentWrapper.appendChild(meta);
    rowDiv.appendChild(contentWrapper);
    chatBox.appendChild(rowDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function toggleModal(isOpen) {
    const modal = document.getElementById('modal-menu');
    if (modal) {
        modal.hidden = !isOpen;
    }
}

function closeApp() {
    history.back();
}

function attachStaticHandlers() {
    const closeAppBtn = document.getElementById('closeAppBtn');
    const openBtn = document.getElementById('openQuestionModalBtn');
    const closeModalBtn = document.getElementById('closeQuestionModalBtn');
    if (closeAppBtn) closeAppBtn.onclick = closeApp;
    if (openBtn) openBtn.onclick = () => toggleModal(true);
    if (closeModalBtn) closeModalBtn.onclick = () => toggleModal(false);
}

function renderTabs() {
    const container = document.getElementById("tab-container");
    container.innerHTML = "";
    categories.forEach((catName, idx) => {
        const btn = document.createElement("button");
        btn.className = `tab-btn ${idx === currentTab ? 'active' : ''}`;
        btn.textContent = catName;
        btn.onclick = () => {
            currentTab = idx;
            renderTabs();
            renderQuestions();
        };
        container.appendChild(btn);
    });
}

function renderQuestions() {
    const container = document.getElementById("options-container");
    container.innerHTML = "";
    const filtered = qaData.filter(item => item.cat === currentTab);
    filtered.forEach((qa) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = qa.title;
        btn.onclick = () => askQuestion(qa);
        container.appendChild(btn);
    });
}

function askQuestion(qa) {
    toggleModal(false);
    appendMessage(qa.q, true);
    setTimeout(() => { appendMessage(qa.a, false); }, 400);
}

attachStaticHandlers();
appendMessage("こんにちは！CO2や環境問題について気になることはありますか？クイズや解説をチェックしてみよう！", false);
renderTabs();
renderQuestions();