/* =========================================================
   CO2 → 円換算
   「CO2◯kg」は実感しにくいが「◯円」はすぐ伝わる。
   電気使用量(kWh)を、地域別の電力CO2係数から逆算し、
   目安の電気料金単価をかけて概算コストを出す。
   ========================================================= */

window.YEN_PER_KWH = 31; // 家庭用電力量料金の目安単価（円/kWh）

window.co2ToYenHtml = function(breakdown){
  if (!breakdown || !breakdown.electricity) return '';
  const grid = window.getRegionalGridIntensity ? window.getRegionalGridIntensity() : { value: window.GRID_INTENSITY };
  if (!grid.value) return '';

  const kwh = breakdown.electricity / grid.value;
  const yen = Math.round(kwh * window.YEN_PER_KWH);
  if (!Number.isFinite(yen) || yen <= 0) return '';

  return `<p class="cost-estimate">💴 今日の電気使用の目安コスト: 約<strong>${yen}円</strong></p>`;
};