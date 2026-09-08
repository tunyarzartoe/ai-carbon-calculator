(function(){
  const LEGACY_NICKNAME_KEY = 'co2-compass-nickname'; // 移行用（旧バージョンの保存先）
  const MIN_LOADING_MS = 900;   // 一瞬で消えてチカチカしないよう最低表示時間を設ける
  const FADE_MS = 380;          // nickname.css の transition (.35s) に余裕を足した値

  /* ---------- 保存・取得（gamify.jsの実装に委譲する） ---------- */
  function getNickname(){
    if (typeof window.loadCertName === 'function'){
      return window.loadCertName() || null;
    }
    // gamify.jsが万一読み込まれていない場合の保険
    try{ return localStorage.getItem('co2compass_cert_name') || null; }
    catch(e){ return null; }
  }

  function saveNickname(name){
    const trimmed = (name || '').trim();
    if (!trimmed) return; // 空・スキップの場合は既存の保存値を消さない
    if (typeof window.saveCertName === 'function'){
      window.saveCertName(trimmed);
    } else {
      try{ localStorage.setItem('co2compass_cert_name', trimmed.slice(0, 20)); }
      catch(e){ console.error('onboarding.saveNickname failed', e); }
    }
    // gamify.js の状態にも同じ名前を残しておく（他の画面で使われる場合に備えて）
    if (typeof window.setUserName === 'function') window.setUserName(trimmed);
  }

  /* 旧バージョンで co2-compass-nickname に保存されていた名前を、
     gamify.js の正式な保存先へ一度だけ移行する */
  function migrateLegacyNickname(){
    try{
      const legacy = localStorage.getItem(LEGACY_NICKNAME_KEY);
      if (legacy && !getNickname()) saveNickname(legacy);
    } catch(e){ /* ignore */ }
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

  function showOverlay(el, instant){
    if (!el) return;
    el.hidden = false;
    if (instant){
      requestAnimationFrame(() => el.classList.add('visible'));
      return;
    }
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

    showOverlay(screen, true);
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
        const needsNickname = !getNickname();

        if (needsNickname) {
          // loading をゆっくり消すより、nickname を先に見せてから
          // loading は即座に隠す。chat が一瞬でも見えるのを防ぐ。
          startNicknameStep();
          if (loadingScreen){
            loadingScreen.classList.remove('visible');
            loadingScreen.hidden = true;
          }
          return;
        }

        // ローディングが完全にフェードアウトし終わってから次に進む
        // （2つの画面が同時に重なって見えることがないようにする）
        hideOverlay(loadingScreen, runRealInitAppNow);
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
  migrateLegacyNickname();
  beginOnboarding();
})();