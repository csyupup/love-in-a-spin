const assets = { mcd: { src:'./icons/mcdonalds.svg', label:'麦当劳' } };
export function prizeIconAsset(value) { return Object.hasOwn(assets,value) ? assets[value].src : null; }
export function prizeIconLabel(value) { return Object.hasOwn(assets,value) ? assets[value].label : value; }
export function prizeIconHtml(value) {
  const asset=prizeIconAsset(value);
  if(asset) return `<img class="prize-brand-icon" src="${asset}" alt="" aria-hidden="true">`;
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
