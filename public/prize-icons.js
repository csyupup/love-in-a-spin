const assets = {
  mcd: { src:'./icons/mcdonalds.svg', label:'麦当劳' },
  kfc: { src:'./icons/kfc.png', label:'肯德基' },
  dominos: { src:'./icons/dominos.png', label:'达美乐' },
  pizzahut: { src:'./icons/pizza-hut.png', label:'必胜客' },
  luckin: { src:'./icons/luckin.ico', label:'瑞幸咖啡' },
  sbux: { src:'./icons/starbucks.svg', label:'星巴克' },
  guming: { src:'./icons/guming.png', label:'古茗' },
  mixue: { src:'./icons/mixue.ico', label:'蜜雪冰城' }
};
export function prizeIconAsset(value) { return Object.hasOwn(assets,value) ? assets[value].src : null; }
export function prizeIconLabel(value) { return Object.hasOwn(assets,value) ? assets[value].label : value; }
export function prizeIconHtml(value) {
  const asset=prizeIconAsset(value);
  if(asset) return `<img class="prize-brand-icon brand-${value}" src="${asset}" alt="" aria-hidden="true">`;
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

// Native emoji keep the picker small and available without external image services.
export const iconGroups = [
  {id:'faces',label:'笑脸',icons:'😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😋 😛 😜 🤪 🤗 🤭 🫣 🤫 🤔 🥺 🥹 😎 🤩 🥳 😴 😪 🤤 😭 😤 😱 🫠 🫶 👏 👍 🙌 🤝 🫂 💋'.split(' ')},
  {id:'animals',label:'动物',icons:'🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦉 🦄 🐝 🦋 🐌 🐞 🐢 🐙 🦑 🦀 🐬 🐳 🐟 🦈 🐘 🦒 🦌 🦦 🐾 💐 🌷 🌹 🌻 🌸 🌼 🍀 🌿 🌵 🌳'.split(' ')},
  {id:'food',label:'食物',icons:['mcd','kfc','dominos','pizzahut','luckin','sbux','guming','mixue',...'🍔 🍟 🍗 🍕 🌭 🥪 🌮 🌯 🥟 🍜 🍝 🍣 🍱 🍚 🍙 🍲 🍢 🥘 🥩 🍤 🥓 🍳 🥐 🍞 🥯 🥞 🧇 🧀 🥗 🌽 🥔 🍓 🍒 🍉 🍇 🍑 🥭 🍍 🍌 🥝 🥑 🍰 🎂 🧁 🍦 🍧 🍨 🍩 🍪 🍫 🍬 🍭 🍮 🥧 🧋 ☕️ 🍵 🥛 🥤 🧃 🍹 🍷 🥂 🍺 🧊 🍯 🥜 🌰'.split(' ')]},
  {id:'activities',label:'活动',icons:'🎬 🎤 🎧 🎵 🎶 🎹 🎸 🥁 🎺 🎻 🎨 🎭 🎪 🎫 🎟️ 🎮 🕹️ 🎲 🧩 ♟️ 🎯 🎳 🏀 ⚽️ 🏸 🏓 🎾 🏐 🏊 🏄 🚴 🧘 🏕️ 🎣 🎈 🎉 🎊 🎀 🏆 🥇 💆🏻‍♀️'.split(' ')},
  {id:'travel',label:'旅行',icons:'🚗 🚕 🚌 🚎 🚲 🛵 🏍️ 🚂 🚄 🚇 ✈️ 🚁 🚀 ⛵️ 🚢 🧳 🗺️ 🧭 🏠 🏡 🏨 🏰 🗼 🎡 🎢 🎠 ⛲️ 🏖️ 🏝️ 🏔️ ⛰️ 🌋 🌊 🌅 🌄 🌉 🌌 🌠 ☀️ 🌤️ ☁️ 🌈 🌙 ⭐️'.split(' ')},
  {id:'objects',label:'物体',icons:'🎁 🧧 🧸 🛍️ 💄 🧴 🪞 🖌️ 🖊️ 👑 💍 💎 👜 👛 🎒 👗 👠 🥿 👟 🧣 🕶️ ☂️ 📷 📸 📱 💻 ⌚️ 📖 📚 📓 ✏️ 🖍️ 💌 ✉️ 📮 🕯️ 💡 🪄 🔮 🧿 🛁 🛌 🧹 🪴 🧺 🧼 🪥 🧽 🧵 🪡 🧶 🧷 🔑 🛋️'.split(' ')},
  {id:'symbols',label:'符号',icons:'❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 🩷 🩵 🩶 💕 💞 💓 💗 💖 💘 💝 💟 ❣️ 💔 ❤️‍🔥 ❤️‍🩹 ✨ 💫 🌟 🔥 💯 ✅ ☑️ ✔️ ➕ ➖ ➡️ ⬅️ ⬆️ ⬇️ ♾️ ☮️ ☯️ ♡ ★ ☆ ☀︎ ☽'.split(' ')}
];
export function iconCategory(value) {
  return iconGroups.find(group=>group.icons.includes(value))?.id||'objects';
}
export function categoryIcons(category,selected) {
  const icons=iconGroups.find(group=>group.id===category)?.icons||[];
  if(category==='objects'&&selected&&!iconGroups.some(group=>group.icons.includes(selected)))return [selected,...icons];
  return icons;
}
