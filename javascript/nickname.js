// 起動時のオンボーディング演出:
//  - ローディング画面を出す（最低表示時間＋アイコンの脈動＋3点ドットで
//    「読み込み中」であることをはっきり伝える）
//  - ローディングが完全にフェードアウトし終わってから、初回起動時
//    （historyが空）だけニックネーム入力画面をフェードインで表示する
//    （2つの画面が重なって同時に表示されることがないよう、必ず順番に切り替える）
//  - チャットの「AIが打ち込む」演出を、オーバーレイの裏側で先に
//    終わらせてしまわないよう、window.initApp の実行をオンボーディングが
//    完全に終わるまで遅らせる。main.js は変更しなくてよい
//    （initAppという名前で呼べば動く前提の薄いラッパーに差し替えるだけ）。
//  - 保存したニックネームは、認定証タブ（#certNameInput）を開くたびに
//    自動入力する。証明書欄を手動編集した場合もそれを覚えておく。
//
// 重要な既知の不具合の修正:
//  hidden属性とdisplay:flexを持つクラスを併用すると、ブラウザの
//  デフォルトスタイル [hidden]{display:none} と .onboarding-overlay
//  の詳細度が同じため、あとから読み込まれるCSSが勝ってしまい
//  「hidden指定でも実際には非表示になっていない」ことがあった
//  （nickname.css側で `!important` により明示的に修正済み）。
//  この状態だと、ボタンを押しても何も起きないように見える
//  （そもそも該当ステップのイベントハンドラがまだ付いていないタイミングで
//  画面が誤って先に表示されてしまっていたため）。
(function(){
  const NICKNAME_KEY = 'co2-compass-nickname';
  const MIN_LOADING_MS = 900;   // 一瞬で消えてチカチカしないよう最低表示時間を設ける
  const FADE_MS = 380;          // nickname.css の transition (.35s) に余裕を足した値

  /* ---------- 保存・取得 ---------- */
  function getNickname(){
    try{ return localStorage.getItem(NICKNAME_KEY) || null; }
    catch(e){ return null; }
  }

  function saveNickname(name){
    const trimmed = (name || '').trim();
    if (!trimmed) return; // 空・スキップの場合は既存の保存値を消さない
    try{ localStorage.setItem(NICKNAME_KEY, trimmed); }
    catch(e){ console.error('onboarding.saveNickname failed', e); }
  }

  /* ---------- 証明書欄との同期 ---------- */
  function fillCertNameInput(){
    const input = document.getElementById('certNameInput');
    if (!input) return;
    const saved = getNickname();
    if (saved) input.value = saved;
  }

  function attachCertSync(){
    const certInput = document.getElementById('certNameInput');
    if (certInput){
      certInput.addEventListener('change', () => saveNickname(certInput.value));
    }
    if (typeof window.openAchievementsModal === 'function'){
      const original = window.openAchievementsModal;
      window.openAchievementsModal = function(...args){
        // renderAchievements等の描画タイミングに左右されず必ず反映されるよう、
        // 呼ぶ前・呼んだ直後・少し遅れての3段構えで名前を埋め直す
        fillCertNameInput();
        const result = original.apply(this, args);
        fillCertNameInput();
        setTimeout(fillCertNameInput, 50);
        return result;
      };
    }
  }

  /* ---------- チャット初期化の遅延実行 ----------
     main.js が読み込み時点で window.initApp() を呼んでしまうと、
     オーバーレイの裏側でチャットの入力演出が一瞬で終わり、
     オーバーレイを外した瞬間には何も動かない静止画になってしまう。
     window.initApp を「呼ばれたことだけ覚えておく」薄いラッパーに
     差し替え、オンボーディングが完全に終わったタイミングで本来の
     初期化を実行することで、演出を利用者の目の前で再生させる。 */
  let realInitApp = (typeof window.initApp === 'function') ? window.initApp : null;
  if (realInitApp){
    window.initApp = function(){ /* オンボーディング完了まで待つ。何もしない */ };
  }
  function runRealInitAppNow(){
    if (realInitApp){
      const fn = realInitApp;
      realInitApp = null; // 二重実行防止
      fn();
    }
  }

  /* ---------- オーバーレイの表示・非表示 ---------- */
  function hideOverlay(el, onDone){
    if (!el){ if (onDone) onDone(); return; }
    el.classList.remove('visible');
    setTimeout(() => {
      el.hidden = true;
      if (onDone) onDone();
    }, FADE_MS);
  }

  function showOverlay(el){
    if (!el) return;
    el.hidden = false;
    // hidden解除直後にすぐclassを付けるとtransitionが発火しないブラウザが
    // あるため、1回描画を確定させてからvisibleを付ける
    setTimeout(() => el.classList.add('visible'), 20);
  }

  /* ---------- ニックネーム入力画面（初回のみ） ---------- */
  function startNicknameStep(){
    const screen = document.getElementById('nicknameScreen');
    const input = document.getElementById('onboardingNicknameInput');
    const submitBtn = document.getElementById('onboardingNicknameSubmit');
    const skipBtn = document.getElementById('onboardingNicknameSkip');
    if (!screen){ runRealInitAppNow(); return; }

    showOverlay(screen);
    if (input) setTimeout(() => input.focus(), FADE_MS);

    const finish = () => hideOverlay(screen, runRealInitAppNow);
    const submit = () => {
      if (input) saveNickname(input.value);
      finish();
    };
    if (submitBtn) submitBtn.onclick = submit;
    if (input) input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
    if (skipBtn) skipBtn.onclick = finish;
  }

  /* ---------- ローディング画面 → 分岐 ---------- */
  function beginOnboarding(){
    const loadingScreen = document.getElementById('loadingScreen');
    const startedAt = Date.now();

    const proceed = () => {
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_LOADING_MS - elapsed);
      setTimeout(() => {
        // ローディングが完全にフェードアウトし終わってから次に進む
        // （2つの画面が同時に重なって見えることがないようにする）
        hideOverlay(loadingScreen, () => {
          const isFirstTime = !window.loadHistory || window.loadHistory().length === 0;
          if (isFirstTime) startNicknameStep();
          else runRealInitAppNow();
        });
      }, wait);
    };

    proceed();
  }

  window.getNickname = getNickname;
  window.saveNickname = saveNickname;

  // このファイルはHTML内で他の主要スクリプトより後・main.jsより前に
  // 読み込まれる想定。呼び出し時点で対象要素はすでにパース済みのため、
  // DOMContentLoadedを待たずに即座に実行してよい（待つとinitAppの
  // 差し替えがmain.jsの呼び出しに間に合わない可能性がある）。
  attachCertSync();
  beginOnboarding();
})();