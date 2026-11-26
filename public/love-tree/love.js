/* ============================================================
 *  爱心树 · 2026 现代版
 *  ----------------------------------------------------------
 *  改编自经典的「爱心树」表白网页,保留原版动画主线:
 *  爱心种子落下 → 点击 → 长出树枝 → 满树开花 → 情书浮现 → 计时
 *
 *  技术升级:
 *   - 移除 jQuery / Jscex 等 10 年前的库,原生 ES2020 重写,零依赖
 *   - 高清屏(Retina)适配 + 手机端响应式布局
 *   - 预渲染渐变爱心精灵 + 光晕,告别生硬纯色
 *   - 粒子爆炸 / 漂浮爱心 / 树梢星芒 / 鼠标视差等新交互
 *
 *  自定义:直接修改下方 CONFIG 即可
 * ============================================================ */
'use strict';

/* ----------------------------- 配置 ----------------------------- */
const CONFIG = {
  // 对方的称呼
  name: '嘉旋',
  // 计时起点(2026-09-12 是第 999 天)
  togetherDate: '2023-12-18T00:00:00',
  // 背景音乐文件路径
  music: 'renxi.mp3',
  // 计时器前的那句话,{name} 会替换成对方名字
  clockPrefix: '{name}，我告白已经是',
  // 情书正文,{name} 会替换成对方名字
  lines: [
    '{name}，最初让我心动的，是你的可爱与温柔；后来让我确信爱上你的，是你的认真、善良和藏在细节里的体贴。你让我更向往以后的生活，也让我想成为更好的自己。我爱的不只是你的模样，更是完整而真实的你，不管你是什么样的，都是最好的你，最爱的你。',
    '{name}，我喜欢你，跟我走吧，我偷电动车养你！ฅ՞•ﻌ•՞ฅ',
  ],
  // 落款
  signature: '—— 闪耀',
  // 在这些句(从 1 开始数)后面换行
  breakAfter: [1, 2],
};

const INTENTIONS = {
  understand: {
    title: '我懂你',
    copy: '我懂你的认真、辛苦和偶尔的小情绪，也愿意一直站在你这边。',
  },
  remember: {
    title: '我记得',
    copy: '你随口说过的小事，我都愿意认真记住。',
  },
  promise: {
    title: '我答应',
    copy: '我答应把爱落进每一天，多一点陪伴，多一点体谅，认真走好往后的日子。',
  },
};

/* ----------------------------- 工具 ----------------------------- */
const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

let NAME = CONFIG.name || '亲爱的';
const t = (s) => s.replaceAll('{name}', NAME);

/* --------------------------- 心形图形 --------------------------- */
// 参数方程: x = 16 sin³t, y = 13 cost - 5 cos2t - 2 cos3t - cos4t
const HEART_FIGURE = (() => {
  const pts = [];
  for (let i = 10; i < 30; i += 0.2) {
    const tt = i / Math.PI;
    pts.push({
      x: 16 * Math.pow(Math.sin(tt), 3),
      y: 13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt),
    });
  }
  return pts;
})();

function inheart(x, y, r) {
  const X = x / r, Y = y / r;
  const z = Math.pow(X * X + Y * Y - 1, 3) - X * X * Y * Y * Y;
  return z < 0;
}

function bezierPt(x1, y1, x2, y2, x3, y3, k) {
  const u = 1 - k;
  return {
    x: u * u * x1 + 2 * u * k * x2 + k * k * x3,
    y: u * u * y1 + 2 * u * k * y2 + k * k * y3,
  };
}

/* ------------------------- 舞台与视口 ------------------------- */
const VW = 1100, VH = 680; // 与原版一致的虚拟舞台坐标系

const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
const dpr = Math.min(devicePixelRatio || 1, 2);

// 分层离屏画布:地面 / 树干 / 整树,任意时刻缩放重排都不会丢画面
const groundC = document.createElement('canvas');
groundC.width = VW; groundC.height = VH;
const trunkC = document.createElement('canvas');
trunkC.width = VW; trunkC.height = VH;
const treeC = document.createElement('canvas');
treeC.width = VW; treeC.height = VH;
const gctx = groundC.getContext('2d');
const tctx = trunkC.getContext('2d');
const sctx = treeC.getContext('2d');

const view = { s: 1, tx: 0, ty: 0, offset: 0, parX: 0, parY: 0, mobile: false };

function resize() {
  const W = innerWidth, H = innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';

  view.mobile = W / H < 1.2;
  document.body.classList.toggle('mobile', view.mobile);

  if (view.mobile) {
    // 手机上:树按宽度缩放,开场时垂直居中,情书出现后自动让位到上方
    view.s = Math.min(W / 540, (H * 0.55) / 575);
    view.tx = W / 2 - 540 * view.s; // 树中心正对屏幕中心
    const treeH = 575 * view.s;
    const panelH = Math.min(340, H * 0.45);
    view.tyCenter = Math.max(8 - 105 * view.s, (H - treeH) / 2 - 105 * view.s);
    const space = H - panelH - 8;
    view.tyPanel = space > treeH ? (space - treeH) / 2 + 8 - 105 * view.s : view.tyCenter;
    view.ty = panelShown ? view.tyPanel : view.tyCenter;
  } else {
    // 桌面上:按高度适配,整体居中
    view.s = H / VH;
    view.tx = (W - VW * view.s) / 2;
    view.ty = 0;
    const desktopTreeCenter = view.tx + (540 + 260) * view.s;
    intentions.style.setProperty('--tree-center-x', `${desktopTreeCenter}px`);
  }

  // 屏幕尺寸变化后,解锁并重锁面板高度(打字完成后才重锁,避免打字中测量不准)
  if (panelShown) {
    panel.style.height = '';
    if (phase === 'idle') panel.style.height = panel.offsetHeight + 'px';
  }
}
addEventListener('resize', resize);

function render() {
  const { s, tx, ty, offset } = view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 地面层(不随树滑动)
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (tx + view.parX * s), dpr * (ty + view.parY * s));
  ctx.drawImage(groundC, 0, 0);

  // 树层(含滑动偏移)+ 粒子 + 星芒
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (tx + (offset + view.parX) * s), dpr * (ty + view.parY * s));
  ctx.drawImage(treeC, 0, 0);
  for (const p of particles) drawHeart(ctx, p.sprite, p.x, p.y, p.size, p.angle, p.alpha);
  if (sparks.length) {
    ctx.globalCompositeOperation = 'lighter';
    for (const sp of sparks) drawHeart(ctx, sparkSprite, sp.x, sp.y, sp.size, 0, sp.alpha);
    ctx.globalCompositeOperation = 'source-over';
  }
}

function toVirtual(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) / view.s - view.tx / view.s - view.offset - view.parX,
    y: (e.clientY - r.top) / view.s - view.ty / view.s - view.parY,
  };
}

/* ------------------------- 爱心精灵工厂 ------------------------- */
const PALETTE = [
  ['#ff6b81', '#d63031'],
  ['#ff8fa3', '#ff4d6d'],
  ['#ff9e9e', '#e5383b'],
  ['#ffb3c1', '#fb6f92'],
  ['#f72585', '#b5179e'],
  ['#ff5d8f', '#c9184a'],
  ['#ff758f', '#c9184a'],
  ['#ffa8c5', '#f2688e'],
];

function traceHeart(g) {
  g.beginPath();
  g.moveTo(0, 0);
  for (const p of HEART_FIGURE) g.lineTo(p.x, -p.y);
  g.closePath();
}

// 预渲染一颗渐变爱心(带光晕可选),之后只做 drawImage,性能远好于逐帧描边
function makeHeart(S, colors, glow) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.scale((S * 0.72) / 34, (S * 0.72) / 34);
  const grad = g.createRadialGradient(-5, -9, 3, 0, 0, 19);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1]);
  g.fillStyle = grad;
  if (glow) {
    g.shadowColor = colors[0];
    g.shadowBlur = glow;
  }
  traceHeart(g);
  g.fill();
  if (glow) g.fill();
  return c;
}

// size 传的是爱心图形本身的像素尺寸
function drawHeart(g, sprite, x, y, size, angle = 0, alpha = 1) {
  const D = size / 0.72;
  g.save();
  g.translate(x, y);
  if (angle) g.rotate(angle);
  g.globalAlpha = alpha;
  g.drawImage(sprite, -D / 2, -D / 2, D, D);
  g.restore();
}

const heartSprites = PALETTE.map((p) => makeHeart(120, p, 14));
const softSprites = PALETTE.map((p) => makeHeart(64, p, 0));
const sparkSprite = (() => {
  const S = 96, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, S / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 8 : 46;
    const a = (i * Math.PI) / 4;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  return c;
})();

/* ------------------------- 动态元素 ------------------------- */
const particles = []; // 点击爆开的爱心粒子
const ambient = [];   // 缓缓上升的漂浮爱心
const sparks = [];    // 树梢闪动的星芒

function burst(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(1.5, 6.5);
    particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 1.5,
      size: rand(8, 20),
      alpha: 1,
      decay: rand(0.012, 0.026),
      angle: rand(0, Math.PI * 2),
      spin: rand(-0.15, 0.15),
      sprite: heartSprites[randInt(0, heartSprites.length - 1)],
    });
  }
}

function spawnAmbient() {
  if (phase !== 'idle' || REDUCED || ambient.length > 24) return;
  ambient.push({
    x: rand(0, VW), y: VH + 30,
    vy: rand(0.5, 1.1),
    sway: rand(0.6, 1.6),
    swayPhase: rand(0, Math.PI * 2),
    sprite: softSprites[randInt(0, softSprites.length - 1)],
    size: rand(7, 15),
    alpha: rand(0.35, 0.75),
    angle: rand(0, Math.PI * 2),
    spin: rand(-0.01, 0.01),
  });
}

function addSpark() {
  if (!blooms.length) return;
  const b = blooms[randInt(0, blooms.length - 1)];
  sparks.push({ x: b.x, y: b.y, size: rand(16, 30), alpha: 1, born: Date.now() });
}

/* ------------------------- 爱心种子 ------------------------- */
const SEED = { x: 530, y: 340, scale: 2 };
let hovered = false, hoverT = 0;

function drawSeedFrame(now) {
  sctx.clearRect(0, 0, VW, VH);
  sctx.drawImage(trunkC, 0, 0);

  const waiting = phase === 'waiting';
  const pulse = waiting ? 1 + Math.sin((now || Date.now()) / 260) * 0.06 : 1;
  const size = 34 * SEED.scale * pulse * (1 + hoverT * 0.08);

  // 呼吸光环
  if (waiting) {
    const k = ((now || Date.now()) / 900) % 1;
    sctx.beginPath();
    sctx.arc(SEED.x, SEED.y, 44 + k * 30, 0, Math.PI * 2);
    sctx.strokeStyle = `rgba(255,77,109,${0.55 * (1 - k)})`;
    sctx.lineWidth = 2;
    sctx.stroke();
  }

  drawHeart(sctx, heartSprites[0], SEED.x, SEED.y, size);

  // “点我”标签(沿用原版位置)
  sctx.save();
  sctx.translate(SEED.x, SEED.y);
  sctx.scale(SEED.scale, SEED.scale);
  sctx.beginPath();
  sctx.moveTo(15, 15);
  sctx.lineTo(60, 15);
  sctx.strokeStyle = 'rgba(255,77,109,0.7)';
  sctx.lineWidth = 1.5;
  sctx.stroke();
  sctx.scale(0.75, 0.75);
  sctx.font = '600 16px "PingFang SC","Microsoft YaHei",sans-serif';
  sctx.textAlign = 'left';
  sctx.textBaseline = 'middle';
  sctx.lineWidth = 4;
  sctx.lineJoin = 'round';
  sctx.strokeStyle = 'rgba(255,255,255,0.85)';
  sctx.strokeText('点我', 23, 10);
  sctx.fillStyle = '#d63031';
  sctx.fillText('点我', 23, 10);
  sctx.restore();

  render();
}

/* ------------------------- 地面与树干 ------------------------- */
async function growGround() {
  const y = 677;
  for (let len = 0; len <= 610; len += 15) {
    gctx.clearRect(0, 0, VW, VH);
    const grad = gctx.createLinearGradient(530 - len, 0, 530 + len, 0);
    grad.addColorStop(0, 'rgba(74,43,51,0)');
    grad.addColorStop(0.5, '#4a2b33');
    grad.addColorStop(1, 'rgba(74,43,51,0)');
    gctx.strokeStyle = grad;
    gctx.lineWidth = 5;
    gctx.lineCap = 'round';
    gctx.beginPath();
    gctx.moveTo(530 - len, y);
    gctx.lineTo(530 + len, y);
    gctx.stroke();
    render();
    await sleep(REDUCED ? 2 : 10);
  }
}

// 树枝结构(与原版完全一致):[x1,y1, x2,y2, x3,y3, 半径, 长度, [子枝...]]
const BRANCH = [
  [535, 680, 570, 250, 500, 200, 30, 100, [
    [540, 500, 455, 417, 340, 400, 13, 100, [
      [450, 435, 434, 430, 394, 395, 2, 40],
    ]],
    [550, 445, 600, 356, 680, 345, 12, 100, [
      [578, 400, 648, 409, 661, 426, 3, 80],
    ]],
    [539, 281, 537, 248, 534, 217, 3, 40],
    [546, 397, 413, 247, 328, 244, 9, 80, [
      [427, 286, 383, 253, 371, 205, 2, 40],
      [498, 345, 435, 315, 395, 330, 4, 60],
    ]],
    [546, 357, 608, 252, 678, 221, 6, 100, [
      [590, 293, 646, 277, 648, 271, 2, 80],
    ]],
  ]],
];

function makeBranch(b) {
  return {
    x1: b[0], y1: b[1], x2: b[2], y2: b[3], x3: b[4], y3: b[5],
    r: b[6], len: b[7], kids: (b[8] || []).map(makeBranch), t: 0,
  };
}

async function growTree() {
  tctx.shadowColor = 'rgba(120,60,70,0.25)';
  tctx.shadowBlur = 3;
  let active = BRANCH.map(makeBranch);
  while (active.length) {
    const next = [];
    for (const b of active) {
      const p = bezierPt(b.x1, b.y1, b.x2, b.y2, b.x3, b.y3, b.t);
      tctx.beginPath();
      tctx.arc(p.x, p.y, b.r, 0, Math.PI * 2);
      tctx.fillStyle = '#3a2a2e';
      tctx.fill();
      b.t += 1 / (b.len - 1);
      b.r *= 0.97;
      if (b.t <= 1) next.push(b);
      else next.push(...b.kids);
    }
    active = next;
    sctx.clearRect(0, 0, VW, VH);
    sctx.drawImage(trunkC, 0, 0);
    render();
    await sleep(REDUCED ? 2 : 10);
  }
}

/* ------------------------- 满树开花 ------------------------- */
const blooms = [];

function initBlooms() {
  for (let i = 0; i < 700; i++) {
    let x, y;
    do {
      x = randInt(20, 1060);
      y = randInt(20, 630);
    } while (!inheart(x - 540, 345 - y, 240));
    blooms.push({
      x, y,
      sprite: heartSprites[randInt(0, heartSprites.length - 1)],
      size: rand(10, 24),
      alpha: rand(0.6, 1),
      angle: rand(0, Math.PI * 2),
      delay: rand(0, 0.8),
      bobPhase: rand(0, Math.PI * 2),
      bobAmp: rand(0.4, 1.4),
    });
  }
}

let bloomStart = 0;

function redrawTree(now) {
  sctx.clearRect(0, 0, VW, VH);
  sctx.drawImage(trunkC, 0, 0);
  const el = (now - bloomStart) / 1000;
  for (const b of blooms) {
    let sc = 1;
    if (phase === 'bloom') sc = easeOutCubic(clamp(el / 1.6 - b.delay, 0, 1));
    const bob = phase === 'idle' && !REDUCED ? Math.sin(now / 1300 + b.bobPhase) * b.bobAmp : 0;
    drawHeart(sctx, b.sprite, b.x, b.y + bob, b.size * sc, b.angle, b.alpha);
  }
  for (const a of ambient) drawHeart(sctx, a.sprite, a.x, a.y, a.size, a.angle, a.alpha);
}

/* ------------------------- 情书与计时 ------------------------- */
const panel = $('#panel');
const linesEl = $('#lines');
const clockBox = $('#clock-box');
const clockEl = $('#clock');
const intentions = $('#intentions');
const intentionNote = $('#intention-note');
const intentionNoteTitle = $('#intention-note-title');
const intentionNoteCopy = $('#intention-note-copy');
const intentionButtons = [...document.querySelectorAll('.intention-heart')];
let panelShown = false;
let activeIntention = null;

for (const intentionButton of intentionButtons) {
  intentionButton.addEventListener('click', () => {
    const isOpen = intentionButton === activeIntention;
    const active = isOpen ? null : intentionButton;
    intentionButtons.forEach((button) => {
      button.setAttribute('aria-expanded', isOpen ? 'false' : String(button === active));
    });
    activeIntention = active;

    if (!active) {
      intentionNote.classList.remove('show');
      intentionNote.hidden = true;
      return;
    }

    const item = INTENTIONS[active.dataset.intention];
    intentionNoteTitle.textContent = item.title;
    intentionNoteCopy.textContent = item.copy;
    intentionNote.hidden = false;
    requestAnimationFrame(() => intentionNote.classList.add('show'));
  });
}

function buildItems() {
  const items = CONFIG.lines.map((s) => ({ text: t(s), hl: s.includes('{name}'), cls: '' }));
  items.push({ text: t(CONFIG.signature), hl: false, cls: 'sig' });
  return items;
}

// 渲染全部行(用于预排版量高,也是打字完成后的最终形态)
function renderItems(items) {
  return items
    .map((it, i) => {
      const cls = 'say' + (it.hl ? ' hl' : '') + (it.cls ? ' ' + it.cls : '') + (CONFIG.breakAfter.includes(i + 1) ? ' brk' : '');
      const text = it.hl ? it.text.replaceAll(NAME, `<b class="nm">${NAME}</b>`) : it.text;
      return `<p class="${cls}">${text}</p>`;
    })
    .join('');
}

async function typeLines(items) {  linesEl.innerHTML = items.map(() => '<p class="say"></p>').join('');
  const ps = linesEl.querySelectorAll('.say');

  for (let i = 0; i < items.length; i++) {
    const it = items[i], p = ps[i];
    const brk = CONFIG.breakAfter.includes(i + 1) ? ' brk' : '';
    p.className = 'say' + (it.hl ? ' hl' : '') + (it.cls ? ' ' + it.cls : '') + brk;
    const caret = document.createElement('span');
    caret.className = 'caret';
    p.appendChild(caret);
    for (const ch of it.text) {
      p.insertBefore(document.createTextNode(ch), caret);
      await sleep(REDUCED ? 4 : 32 + Math.random() * 36);
    }
    caret.remove();
    if (it.hl) p.innerHTML = it.text.replaceAll(NAME, `<b class="nm">${NAME}</b>`);
    await sleep(300);
  }
}

function startClock() {
  const start = new Date(CONFIG.togetherDate).getTime();
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    let s = Math.floor((Date.now() - start) / 1000);
    if (s < 0) s = 0;
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    clockEl.innerHTML = `第 <span class="digit">${d}</span> 天 <span class="digit">${pad(h)}</span> 小时 <span class="digit">${pad(m)}</span> 分钟 <span class="digit">${pad(sec)}</span> 秒`;
  };
  tick();
  setInterval(tick, 1000);
}

/* ------------------------- 动画编排 ------------------------- */
let phase = 'intro';
let clickResolve = null;
let begun = false;

const waitClick = () => new Promise((res) => (clickResolve = res));

async function seedDrop() {
  for (let i = 1; i <= 42; i++) {
    SEED.y = lerp(-90, 340, easeOutCubic(i / 42));
    drawSeedFrame();
    await sleep(REDUCED ? 2 : 10);
  }
}

async function slideTree() {
  const target = view.mobile ? 0 : 260;
  const from = view.offset;
  const dur = 1500;
  const startT = Date.now();
  for (;;) {
    const el = Date.now() - startT;
    view.offset = from + (target - from) * easeInOut(Math.min(1, el / dur));
    render();
    if (el > dur) break;
    await sleep(16);
  }
}

async function showPanel() {
  // 预排版:把全文(含时钟占位)先渲染一遍,量出面板最终高度并锁定,
  // 这样逐字打字过程中面板高度始终不变,不会一下一下地跳动
  const items = buildItems();
  linesEl.innerHTML = renderItems(items);
  clockBox.classList.add('show');
  clockEl.innerHTML = '第 <span class="digit">9999</span> 天 <span class="digit">99</span> 小时 <span class="digit">99</span> 分钟 <span class="digit">99</span> 秒';
  panel.style.height = panel.offsetHeight + 'px';
  clockBox.classList.remove('show');
  clockEl.innerHTML = '';
  linesEl.innerHTML = '';

  panel.classList.add('show');
  // 手机上:树平滑上移,给情书让位
  if (view.mobile) {
    panelShown = true;
    const from = view.ty, to = view.tyPanel;
    const t0 = Date.now();
    while (Date.now() - t0 < 800) {
      view.ty = from + (to - from) * easeInOut(Math.min(1, (Date.now() - t0) / 800));
      await sleep(16);
    }
    view.ty = to;
  }
  panelShown = true;
  await sleep(700);
  await typeLines(items);
  clockBox.classList.add('show');
  startClock();
}

async function runSequence() {
  // 1. 爱心种子落下
  phase = 'drop';
  await seedDrop();

  // 2. 等待点击
  phase = 'waiting';
  await waitClick();

  // 3. 点击:爆开粒子,种子收缩后落到地面
  phase = 'burst';
  burst(SEED.x, SEED.y, 30);
  const fromScale = SEED.scale;
  for (let i = 1; i <= 22; i++) {
    SEED.scale = lerp(fromScale, 0.22, easeInOut(i / 22));
    drawSeedFrame();
    await sleep(REDUCED ? 2 : 14);
  }
  const fall = (async () => {
    const fromY = SEED.y;
    for (let i = 1; i <= 40; i++) {
      const k = i / 40;
      SEED.y = fromY + (657 - fromY) * k * k; // 重力加速
      drawSeedFrame();
      await sleep(REDUCED ? 2 : 10);
    }
  })();
  await Promise.all([fall, growGround()]);
  sctx.clearRect(0, 0, VW, VH);
  render();

  // 4. 树枝生长
  phase = 'grow';
  await growTree();

  // 5. 满树开花
  phase = 'bloom';
  bloomStart = Date.now();
  await sleep(REDUCED ? 600 : 3000);

  // 6. 树滑向右侧,给情书让位
  phase = 'slide';
  await slideTree();

  // 三颗心意随盛开的树一起出现
  intentions.classList.add('show');
  await sleep(REDUCED ? 100 : 450);

  // 7. 情书打字 + 计时
  phase = 'type';
  await showPanel();

  phase = 'idle';
}

/* ------------------------- 交互 ------------------------- */
canvas.addEventListener('pointermove', (e) => {
  if (view.mobile) return;
  targetParX = (e.clientX / innerWidth - 0.5) * -14;
  targetParY = (e.clientY / innerHeight - 0.5) * -8;
  if (phase === 'waiting') {
    const v = toVirtual(e);
    hovered = Math.hypot(v.x - SEED.x, v.y - SEED.y) < 46 * SEED.scale;
  } else {
    hovered = false;
  }
});

// 这些阶段点哪儿都会爆出碎心花
const BURST_PHASES = ['waiting', 'grow', 'bloom', 'slide', 'type', 'idle'];

canvas.addEventListener('pointerdown', (e) => {
  const v = toVirtual(e);
  if (phase === 'waiting' && Math.hypot(v.x - SEED.x, v.y - SEED.y) < 46 * SEED.scale) {
    if (clickResolve) {
      clickResolve();
      clickResolve = null;
    }
  } else if (BURST_PHASES.includes(phase)) {
    burst(v.x, v.y, 20); // 树生长、看信、闲时点哪儿,哪儿就开花
  }
});

/* ------------------------- 开场与音乐 ------------------------- */
const intro = $('#intro');
const startBtn = $('#start');
const musicBtn = $('#music');
const audio = $('#bgm');
audio.src = CONFIG.music;

function begin() {
  if (begun) return;
  begun = true;
  $('#clock-label').textContent = t(CONFIG.clockPrefix);
  intro.classList.add('hide');
  musicBtn.classList.add('show');
  audio.play().catch(() => {});
  runSequence();
}
startBtn.addEventListener('click', begin);

musicBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play().catch(() => {});
    musicBtn.classList.add('playing');
    musicBtn.textContent = '♫';
  } else {
    audio.pause();
    musicBtn.classList.remove('playing');
    musicBtn.textContent = '♪';
  }
});

/* ------------------------- 主循环 ------------------------- */
let targetParX = 0, targetParY = 0;
let lastAmbient = 0, lastSpark = 0;

function frame() {
  const now = Date.now();

  // 视差跟随
  if (!REDUCED) {
    view.parX = lerp(view.parX, targetParX, 0.06);
    view.parY = lerp(view.parY, targetParY, 0.06);
  }

  // 粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.09;
    p.angle += p.spin; p.alpha -= p.decay;
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  // 漂浮爱心
  if (now - lastAmbient > 380) {
    lastAmbient = now;
    spawnAmbient();
  }
  for (let i = ambient.length - 1; i >= 0; i--) {
    const a = ambient[i];
    a.y -= a.vy;
    a.x += Math.sin((now / 1000) * a.sway + a.swayPhase) * 0.5;
    a.angle += a.spin;
    if (a.y < -40) ambient.splice(i, 1);
  }

  // 树梢星芒
  if (phase === 'idle' && now - lastSpark > 650) {
    lastSpark = now;
    addSpark();
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    const sp = sparks[i];
    const age = now - sp.born;
    sp.alpha = 1 - age / 850;
    sp.size += 0.03;
    if (age > 850) sparks.splice(i, 1);
  }

  // 悬停反馈
  hoverT = lerp(hoverT, hovered && phase === 'waiting' ? 1 : 0, 0.15);
  canvas.style.cursor = hoverT > 0.5 ? 'pointer' : 'default';

  // 按阶段重绘
  if (phase === 'waiting') drawSeedFrame(now);
  else if (phase === 'bloom' || phase === 'idle') redrawTree(now);

  render();
  requestAnimationFrame(frame);
}

/* ------------------------- 启动 ------------------------- */
resize();
initBlooms();
requestAnimationFrame(frame);
