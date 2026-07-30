/* =========================================================
   通学・通勤距離の一度だけ設定
   「近い/普通/遠い」を毎回選び直すのは実際の生活だと非効率
   （距離は基本的に毎日変わらないため）。初回に選んだ距離を
   保存しておき、2回目以降は distance ステップを自動スキップして
   質問数を1つ減らす。いつでもリセットして選び直せるようにする。
   ========================================================= */

window.COMMUTE_KM_KEY = 'co2compass_commute_km_v1';

window.getCommuteKm = function(){
  try {
    const raw = localStorage.getItem(window.COMMUTE_KM_KEY);
    if (raw === null) return null;
    const km = parseFloat(raw);
    return Number.isFinite(km) ? km : null;
  } catch (e){
    return null;
  }
};

window.saveCommuteKm = function(km){
  try { localStorage.setItem(window.COMMUTE_KM_KEY, String(km)); } catch (e){ /* storage unavailable */ }
};

window.resetCommuteKm = function(){
  try { localStorage.removeItem(window.COMMUTE_KM_KEY); } catch (e){ /* storage unavailable */ }
};

/* 実績・設定モーダル内に「登録済みの距離」の状態表示とリセットボタンを描画する。
   要素が存在しない画面では何もしない（他画面から呼ばれても安全）。 */
window.renderCommuteStatus = function(){
  const note = document.getElementById('commuteStatusNote');
  const resetBtn = document.getElementById('resetCommuteBtn');
  if (!note || !resetBtn) return;

  const km = window.getCommuteKm();
  note.textContent = km !== null
    ? `📍 通学・通勤距離を片道${km}kmで記憶しています。次回の診断では距離の質問をスキップします。`
    : '📍 まだ距離は登録されていません。次回の診断で選んだ距離を自動で覚えます。';

  resetBtn.style.display = km !== null ? '' : 'none';
  resetBtn.onclick = () => {
    window.resetCommuteKm();
    window.renderCommuteStatus();
  };
};