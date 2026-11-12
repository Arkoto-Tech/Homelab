/* 3D rack model — all dimensions in inches. Rack-space origin: floor centre, +z = front. */
(() => {
const stage = document.getElementById('stage'), canvas = document.getElementById('c'), tip = document.getElementById('tip'), fb = document.getElementById('fb');
if (!window.THREE) { fb.style.display = 'flex'; return; }
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
catch (e) { fb.style.display = 'flex'; return; }
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const ANISO = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 1, 800);
const TARGET = new THREE.Vector3(0, 12, 0);

/* ---------- environment (soft studio reflections) ---------- */
(() => {
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  const geo = new THREE.SphereGeometry(100, 32, 16), pos = geo.attributes.position, cols = [];
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 100; const c = new THREE.Color().setHSL(.09, .06, THREE.MathUtils.clamp(.5 + y * .42, .2, .95)); cols.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  es.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = (x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
  box(45, 55, 45, 55, 30); box(-65, 30, -10, 30, 45); box(0, 85, -30, 60, 25);
  scene.environment = pm.fromScene(es, .04).texture;
})();

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight(0xdfe7f2, 0x3a4250, .45));
const key = new THREE.DirectionalLight(0xffffff, 1.35);
key.position.set(40, 70, 50); key.target.position.copy(TARGET); scene.add(key, key.target);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 10, far: 200 });
key.shadow.bias = -0.0004; key.shadow.normalBias = .03;
const fill = new THREE.DirectionalLight(0xfff3e6, .35); fill.position.set(-50, 30, 25); scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, .45); rim.position.set(0, 40, -60); scene.add(rim);

/* ---------- canvas texture helpers (draw in inches) ---------- */
function tex(w, h, ppi, draw) {
  const c = document.createElement('canvas');
  c.width = Math.max(4, Math.round(w * ppi)); c.height = Math.max(4, Math.round(h * ppi));
  const g = c.getContext('2d'); g.scale(c.width / w, c.height / h); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = ANISO; return t;
}
const R = Math.random;
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function fillRR(g, c, x, y, w, h, r) { g.fillStyle = c; rr(g, x, y, w, h, r); g.fill(); }
function circ(g, c, x, y, r) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function brushed(g, w, h, n, a, vertical) {
  for (let i = 0; i < n; i++) {
    g.strokeStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${R() * a})`; g.lineWidth = Math.min(w, h) * .004 + R() * .01;
    g.beginPath();
    if (vertical) { const x = R() * w; g.moveTo(x, 0); g.lineTo(x, h); } else { const y = R() * h; g.moveTo(0, y); g.lineTo(w, y); }
    g.stroke();
  }
}
function speck(g, w, h, n, a, s) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${R() * a})`; g.fillRect(R() * w, R() * h, s, s); } }
function holes(g, x, y, w, h, step, r, col) { for (let j = 0, yy = y; yy < y + h; j++, yy += step * .87) for (let xx = x + (j % 2) * step / 2; xx < x + w; xx += step) circ(g, col, xx, yy, r); }
function slots(g, x, y, w, h, sx, sy, sw, sh, col, stagger) {
  g.fillStyle = col;
  for (let j = 0, yy = y; yy + sh <= y + h; j++, yy += sy) for (let xx = x + (stagger && j % 2 ? sx / 2 : 0); xx + sw <= x + w; xx += sx) { rr(g, xx, yy, sw, sh, Math.min(sw, sh) / 2); g.fill(); }
}
function rj45(g, x, y, w, h, up) {
  fillRR(g, '#0b0c0d', x, y, w, h, .03);
  g.fillStyle = '#020202'; g.fillRect(x + w * .1, y + h * .14, w * .8, h * .72);
  g.fillRect(x + w * .34, up ? y + h * .02 : y + h * .84, w * .32, h * .14);
  g.fillStyle = '#9c7d44'; for (let k = 0; k < 8; k++) g.fillRect(x + w * .2 + k * w * .081, up ? y + h * .62 : y + h * .22, w * .03, h * .14);
}
function usb(g, x, y, w, h, vertical, tongue) {
  fillRR(g, '#a9adb1', x, y, w, h, .02); g.fillStyle = '#0a0a0a'; g.fillRect(x + w * .1, y + h * .1, w * .8, h * .8);
  g.fillStyle = tongue || '#2c6fd8';
  if (vertical) g.fillRect(x + w * .52, y + h * .16, w * .22, h * .68); else g.fillRect(x + w * .16, y + h * .5, w * .68, h * .24);
}
function c14(g, x, y, w, h) {
  fillRR(g, '#0d0e10', x, y, w, h, .06); fillRR(g, '#1d1f22', x + w * .12, y + h * .14, w * .76, h * .72, .05);
  g.fillStyle = '#b9b9b9'; g.fillRect(x + w * .25, y + h * .45, w * .08, h * .18); g.fillRect(x + w * .67, y + h * .45, w * .08, h * .18); g.fillRect(x + w * .46, y + h * .25, w * .08, h * .18);
}
function screwHole(g, x, y, r) { circ(g, '#050505', x, y, r); }

/* ---------- materials ---------- */
const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: .55, metalness: .2 }, o));
const mapMat = (t, o) => std(Object.assign({ map: t }, o));

function woodTex(vertical) {
  const t = tex(vertical ? 3 : 24, vertical ? 24 : 3, 40, (g, w, h) => {
    g.fillStyle = '#a57a4c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(${R() < .7 ? '110,70,35' : '235,200,150'},${.08 + R() * .22})`; g.lineWidth = .02 + R() * .06;
      g.beginPath();
      if (vertical) { let x = R() * w; g.moveTo(x, 0); for (let y = 0; y <= h; y += 1) { x += (R() - .5) * .08; g.lineTo(x, y); } }
      else { let y = R() * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 1) { y += (R() - .5) * .08; g.lineTo(x, y); } }
      g.stroke();
    }
    speck(g, w, h, 400, .08, .05);
  });
  return t;
}
const woodV = mapMat(woodTex(true), { roughness: .82, metalness: 0 });
const woodH = mapMat(woodTex(false), { roughness: .82, metalness: 0 });
const plyTop = mapMat(tex(22.25, 30, 20, (g, w, h) => {
  g.fillStyle = '#c4a67a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(160,115,65,${.05 + R() * .12})`; g.lineWidth = .1 + R() * .35; g.beginPath(); let x = R() * w; g.moveTo(x, 0); for (let y = 0; y <= h; y += 2) { x += Math.sin(y * .2 + i) * .25; g.lineTo(x, y); } g.stroke(); }
  speck(g, w, h, 800, .06, .08);
}), { roughness: .85, metalness: 0 });
const plyEdge = mapMat(tex(30, .75, 40, (g, w, h) => {
  const c = ['#e2c99d', '#a77d4e', '#dcc293', '#a77d4e', '#e2c99d']; c.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * h / 5, w, h / 5); });
}), { roughness: .85, metalness: 0 });
const railTex = tex(.75, 21, 40, (g, w, h) => {
  g.fillStyle = '#8d9297'; g.fillRect(0, 0, w, h); brushed(g, w, h, 60, .12, true);
  for (let u = 0; u < 12; u++) for (const off of [.25, .875, 1.5]) { const y = h - (.25 + u * 1.75 + off) ; g.fillStyle = '#121314'; g.fillRect(w / 2 - .19, y - .19, .38, .38); }
});
const railMat = mapMat(railTex, { roughness: .45, metalness: .65 });
const steel = std({ color: 0x9aa0a6, roughness: .42, metalness: .65 });
const darkMetal = std({ color: 0x1f2124, roughness: .5, metalness: .35 });
const silverScrew = std({ color: 0xc9ccd0, roughness: .3, metalness: .9 });

/* ---------- geometry helpers ---------- */
const rack = new THREE.Group(); scene.add(rack);
function mesh(geo, mat, parent, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = m.receiveShadow = true; (parent || rack).add(m); return m; }
function box(w, h, d, mat, parent, x, y, z) { return mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z); }
// faces: [ +x, -x, +y(top), -y, +z(front), -z(back) ]
function faced(w, h, d, f, parent, x, y, z) { return box(w, h, d, [f.side, f.sideL || f.side, f.top, f.bottom || f.side, f.front, f.back], parent, x, y, z); }
function screw(parent, x, y, z) { const s = mesh(new THREE.CylinderGeometry(.13, .13, .08, 16), silverScrew, parent, x, y, z); s.rotation.x = Math.PI / 2; return s; }

/* ---------- LEDs ---------- */
const leds = [];
function led(parent, x, y, z, color, mode, r) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r || .045, 16), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  m.position.set(x, y, z); parent.add(m);
  m.userData = { on: new THREE.Color(color), off: new THREE.Color(0x1a1d1a), mode, phase: R() * 6, speed: 1 + R() * 3, t: 0 };
  leds.push(m); return m;
}

/* ================= FRAME: 22.25 W × 24 H × 30 D, 2×2 lumber, plywood top + base ================= */
const W = 22.25, H = 24, D = 30, P = 1.5, Y0 = .75;
box(W, .75, D, [plyEdge, plyEdge, plyTop, plyTop, plyEdge, plyEdge], rack, 0, .375, 0);
box(W, .75, D, [plyEdge, plyEdge, plyTop, plyTop, plyEdge, plyEdge], rack, 0, Y0 + H + .375, 0);
for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(P, H, P, woodV, rack, sx * (W / 2 - P / 2), Y0 + H / 2, sz * (D / 2 - P / 2));
for (const y of [Y0 + P / 2, Y0 + H - P / 2]) {
  for (const s of [-1, 1]) {
    box(W - 2 * P, P, P, woodH, rack, 0, y, s * (D / 2 - P / 2));
    box(P, P, D - 2 * P, woodH, rack, s * (W / 2 - P / 2), y, 0);
  }
}
// wood screws at joints
for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [Y0 + P / 2, Y0 + H - P / 2]) { const s = screw(rack, sx * (W / 2 - P / 2), y, sz * (D / 2 + .01)); }
// 19" mounting rails, front and rear (EIA hole pattern)
const RAIL_LO = Y0 + P, RAIL_HI = Y0 + H - P, RAIL_H = RAIL_HI - RAIL_LO, RAIL_Y = (RAIL_LO + RAIL_HI) / 2;
for (const s of [-1, 1]) for (const sz of [-1, 1]) {
  box(.75, RAIL_H, .12, [steel, steel, steel, steel, railMat, railMat], rack, s * 9.25, RAIL_Y, sz * 14.8);
  box(.12, RAIL_H, 1.3, steel, rack, s * 9.56, RAIL_Y, sz * 14.15);
}
const FRONT = 14.86;                     // front face of mounted equipment
const uBottom = (u) => 2.5 + (u - 1) * 1.75;

const devices = [];
function outline(group, w, h, d, zc) {
  const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w + .4, h + .3, d + .4)), new THREE.LineBasicMaterial({ color: 0x7fe0c4, transparent: true, opacity: 0 }));
  l.position.z = zc; group.add(l); group.userData.outline = l;
}
function register(group, name, info, target) { group.traverse(o => { if (o.isMesh) o.userData.device = group; }); group.userData.name = name; group.userData.info = info; group.userData.target = target; devices.push(group); }

/* ================= CISCO UCS C240 M3 — 2U, 17.1 × 3.43 × 28.4 in ================= */
const U = { w: 17.1, h: 3.43, d: 28.4 };
const ucsFront = tex(U.w, U.h, 120, (g, w, h) => {
  g.fillStyle = '#25282c'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#8f9499'; g.fillRect(0, 0, w, .2); brushed(g, w, .2, 40, .2);
  for (let x = .3; x < w; x += .45) circ(g, '#3a3e42', x, .1, .035);
  g.fillStyle = '#6f7479'; g.fillRect(0, h - .1, w, .1);
  for (let i = 0; i < 24; i++) {
    const x0 = .15 + i * .7;
    if (i < 15) {
      g.fillStyle = '#0a0b0c'; g.fillRect(x0 + .04, .24, .62, 3.06);
      g.fillStyle = '#1e2124'; g.fillRect(x0 + .04, .24, .07, 3.06); g.fillRect(x0 + .59, .24, .07, 3.06);
      g.fillStyle = '#16181a'; g.fillRect(x0 + .14, 2.95, .42, .26);
      for (let y = .6; y < 2.8; y += .35) { g.fillStyle = '#25292d'; g.fillRect(x0 + .1, y, .03, .12); g.fillRect(x0 + .57, y, .03, .12); }
    } else {
      fillRR(g, '#7d8287', x0 + .03, .24, .64, 3.07, .03);
      g.save(); g.beginPath(); g.rect(x0 + .03, .24, .64, 3.07); g.clip(); brushed(g, w, h, 140, .15, true); g.restore();
      circ(g, '#141618', x0 + .18, .36, .045); circ(g, '#141618', x0 + .52, .36, .045);
      fillRR(g, '#dcdedf', x0 + .12, .5, .46, .5, .02); g.fillStyle = '#9a9c9e'; for (let k = 0; k < 4; k++) g.fillRect(x0 + .16, .58 + k * .1, .3 - k * .04, .025);
      fillRR(g, '#5a5f64', x0 + .1, 1.12, .5, 2.02, .05);
      g.fillStyle = '#3a3e42'; g.fillRect(x0 + .3, 1.2, .1, 1.82);
      for (let y = 1.25; y < 2.8; y += .16) { g.fillStyle = '#2a2d30'; g.fillRect(x0 + .15, y, .1, .07); g.fillRect(x0 + .45, y, .1, .07); }
      fillRR(g, '#2b2e31', x0 + .17, 2.86, .36, .24, .04);
    }
    g.fillStyle = '#141619'; g.fillRect(x0, .2, .03, h - .3);
  }
});
const ucsEarL = tex(.95, U.h, 120, (g, w, h) => {
  g.fillStyle = '#1c1e21'; g.fillRect(0, 0, w, h); speck(g, w, h, 300, .08, .02);
  screwHole(g, w / 2, .42, .12); screwHole(g, w / 2, h - .42, .12);
  fillRR(g, '#9aa0a6', .2, .95, .55, 1.5, .1); fillRR(g, '#2a2d31', .27, 1.03, .41, 1.34, .08);
  for (let r = 0; r < 13; r++) circ(g, '#c9cdd2', .4 + (r % 2) * .15, 1.12 + r * .095, .025);
});
const ucsEarR = tex(.95, U.h, 120, (g, w, h) => {
  g.fillStyle = '#1c1e21'; g.fillRect(0, 0, w, h); speck(g, w, h, 300, .08, .02);
  screwHole(g, w / 2, .42, .12); screwHole(g, w / 2, h - .42, .12);
  circ(g, '#3b3f44', w / 2, 1.0, .22); circ(g, '#121315', w / 2, 1.0, .15);
  for (let k = 0; k < 4; k++) circ(g, '#0e0f10', w / 2, 1.45 + k * .22, .05);
  circ(g, '#2f4f78', w / 2, 2.55, .12);
});
const ucsTop = tex(U.w, U.d, 30, (g, w, h) => {
  g.fillStyle = '#b8bcc0'; g.fillRect(0, 0, w, h); brushed(g, w, h, 500, .06);
  g.fillStyle = '#aeb2b6'; g.fillRect(0, h - 6.6, w, 6.6);
  g.fillStyle = '#80858a'; g.fillRect(0, h - 6.62, w, .06); g.fillRect(0, h - 10.7, w, .05);
  for (let x = 1; x < w; x += 1.8) for (let y = h - 6; y < h - .5; y += 1.6) circ(g, '#55595d', x + (y % 2), y, .07);
  g.fillStyle = '#2b2e31'; for (let y = h - 10.3; y < h - 8.9; y += .28) for (let x = 1; x < w - 1; x += .3) g.fillRect(x, y, .2, .12);
  fillRR(g, '#e9e8e3', 11.4, h - 14.6, 4.3, 2.9, .05);
  g.fillStyle = '#b3b2ad'; for (let k = 0; k < 7; k++) g.fillRect(11.65, h - 14.3 + k * .32, 2.4 - (k % 3) * .3, .08);
  g.fillStyle = '#f0c93a'; g.fillRect(14.3, h - 14.35, 1.15, 1.05); g.fillStyle = '#1b1b1b'; g.fillRect(14.45, h - 14.2, .85, .75);
  g.fillStyle = '#2b2e31'; for (let y = .4; y < 1.6; y += .3) for (let x = 1.2; x < w - 1; x += .5) g.fillRect(x, y, .3, .1);
  for (const x of [.25, w - .25]) for (let y = 1; y < h; y += 3) circ(g, '#6d7176', x, y, .06);
});
const ucsSide = tex(U.d, U.h, 30, (g, w, h) => {
  g.fillStyle = '#a7abb0'; g.fillRect(0, 0, w, h); brushed(g, w, h, 160, .07);
  g.fillStyle = '#868a8f'; g.fillRect(0, .12, w, .04);
  for (let x = 1; x < w; x += 4.5) circ(g, '#6c7075', x, h - .4, .07);
});
const ucsBack = tex(U.w, U.h, 100, (g, w, h) => {
  g.fillStyle = '#8f9499'; g.fillRect(0, 0, w, h); brushed(g, w, h, 150, .1);
  for (let k = 0; k < 5; k++) {
    const x = .35 + k * 1.15;
    if (k === 1) {
      fillRR(g, '#2b2d30', x, .25, .85, 2.15, .03);
      [[.45, 'dp'], [.9, 'dp'], [1.35, 'dp'], [1.8, 'hd']].forEach(([y, t]) => { fillRR(g, '#0b0b0c', x + .25, y, .35, t === 'hd' ? .38 : .32, .03); g.fillStyle = '#c7c7c7'; g.fillRect(x + .31, y + .1, .23, .03); });
    } else {
      fillRR(g, '#a7abb0', x, .25, .85, 2.15, .03); slots(g, x + .12, .45, .6, 1.7, .16, .22, .09, .14, '#3a3e42', true);
    }
    circ(g, '#5c6065', x + .42, .35, .06);
  }
  fillRR(g, '#7a7f84', 6.3, 2.45, 4.8, .85, .03);
  fillRR(g, '#2f5aa8', 6.45, 2.62, .78, .45, .07); for (let k = 0; k < 5; k++) circ(g, '#0e1d36', 6.6 + k * .12, 2.78, .025);
  usb(g, 7.4, 2.68, .52, .22); usb(g, 7.4, 2.95, .52, .22);
  rj45(g, 8.4, 2.6, .6, .55, false); rj45(g, 9.1, 2.6, .6, .55, false); rj45(g, 9.8, 2.6, .6, .55, false);
  g.fillStyle = '#e5e5e5'; g.font = '0.11px sans-serif'; g.fillText('M', 8.62, 2.55); g.fillText('1', 9.35, 2.55); g.fillText('2', 10.05, 2.55);
  holes(g, 6.4, .35, 4.6, 1.9, .2, .07, '#2a2d30');
  for (const x of [11.35, 14.2]) {
    fillRR(g, '#2b2e32', x, 1.35, 2.75, 1.95, .05);
    circ(g, '#111214', x + .85, 2.32, .66); for (let r = .6; r > .05; r -= .12) { g.strokeStyle = '#3c4046'; g.lineWidth = .025; g.beginPath(); g.arc(x + .85, 2.32, r, 0, 7); g.stroke(); }
    g.strokeStyle = '#3c4046'; g.beginPath(); g.moveTo(x + .2, 2.32); g.lineTo(x + 1.5, 2.32); g.moveTo(x + .85, 1.67); g.lineTo(x + .85, 2.97); g.stroke();
    c14(g, x + 1.75, 1.85, .7, .55);
    fillRR(g, '#76b947', x + 2.5, 1.5, .17, 1.65, .05);
    circ(g, '#0f1010', x + 2.1, 2.75, .05);
  }
  holes(g, 11.4, .35, 5.5, .85, .2, .07, '#2a2d30');
});
const ucs = new THREE.Group(); rack.add(ucs);
ucs.position.set(0, uBottom(8) + U.h / 2, FRONT);
const ucsMetal = { roughness: .42, metalness: .55 };
faced(U.w, U.h, U.d, { front: mapMat(ucsFront, { roughness: .5, metalness: .35 }), back: mapMat(ucsBack, ucsMetal), top: mapMat(ucsTop, ucsMetal), side: mapMat(ucsSide, ucsMetal), bottom: steel }, ucs, 0, 0, -U.d / 2);
faced(.95, U.h, .14, { front: mapMat(ucsEarL, { roughness: .5, metalness: .3 }), back: darkMetal, top: darkMetal, side: darkMetal }, ucs, -(U.w / 2 + .475), 0, .07);
faced(.95, U.h, .14, { front: mapMat(ucsEarR, { roughness: .5, metalness: .3 }), back: darkMetal, top: darkMetal, side: darkMetal }, ucs, (U.w / 2 + .475), 0, .07);
for (const sx of [-1, 1]) for (const y of [U.h / 2 - .42, -U.h / 2 + .42]) screw(ucs, sx * (U.w / 2 + .475), y, .18);
// green touch points on the lid
const green = std({ color: 0x8ccf3f, roughness: .6, metalness: 0 });
for (const x of [-4.6, 4.6]) { const b = box(1.6, .08, 1.0, green, ucs, x, U.h / 2 + .04, -8.2); }
// slide rails
for (const s of [-1, 1]) box(.3, 1.4, 28.2, steel, rack, s * 8.72, ucs.position.y, FRONT - 14.1 - .2);
// LEDs: drives, ear
for (let i = 15; i < 24; i++) {
  const x = -U.w / 2 + .15 + i * .7;
  led(ucs, x + .18, U.h / 2 - .36, .01, 0x46e36a, 'flicker');
  led(ucs, x + .52, U.h / 2 - .36, .01, 0x46e36a, 'steady');
}
const earRX = U.w / 2 + .475;
led(ucs, earRX, U.h / 2 - 1.0, .15, 0x46e36a, 'steady', .17).scale.set(1, 1, 1);
led(ucs, earRX, U.h / 2 - 1.0, .151, 0x121315, 'steady', .12);
for (let k = 0; k < 4; k++) led(ucs, earRX, U.h / 2 - 1.45 - k * .22, .15, k === 3 ? 0x4aa3ff : 0x46e36a, k === 1 ? 'blink' : 'steady');
for (const x of [11.35, 14.2]) led(ucs, U.w / 2 - (x + 2.1), U.h / 2 - 2.75, -U.d - .01, 0x46e36a, 'steady').rotation.y = Math.PI;
outline(ucs, U.w + 1.9, U.h, U.d, -U.d / 2);
register(ucs, 'Server 1 · Cisco UCS C240 M3', '2× Xeon E5-2680 v2 · 32 GB ECC · 6 TB · RX 590', '#server1');

/* ================= CATALYST 2960G — 1U, 17.5 × 1.73 × 13 in ================= */
const S = { w: 17.5, h: 1.73, d: 13 };
const portXY = (n) => { const col = Math.floor((n - 1) / 2), row = (n - 1) % 2; return { x: 2.6 + col * .82 + (col >= 6 ? .45 : 0) + .33, y: row ? 1.21 : .53, row }; };
const swFront = tex(S.w, S.h, 120, (g, w, h) => {
  g.fillStyle = '#39414b'; g.fillRect(0, 0, w, h); speck(g, w, h, 1500, .06, .015);
  g.fillStyle = '#2a3038'; g.fillRect(0, 0, w, .06); g.fillRect(0, h - .06, w, .06);
  g.fillStyle = '#cfd5dc'; g.font = '0.12px sans-serif';
  ['SYST', 'RPS', 'STAT', 'DUPLX', 'SPEED'].forEach((t, i) => { circ(g, '#15181b', .45, .3 + i * .27, .045); g.fillText(t, .58, .34 + i * .27); });
  fillRR(g, '#1d2126', 1.35, 1.25, .5, .24, .05); g.fillText('MODE', 1.38, 1.18);
  for (let n = 1; n <= 24; n++) { const p = portXY(n); rj45(g, p.x - .33, p.y - .25, .66, .5, p.row === 0); circ(g, '#15181b', p.x, p.row ? 1.6 : .13, .035); }
  g.strokeStyle = '#5d6670'; g.lineWidth = .015; rr(g, 2.5, .2, 12 * .82 + .45 + .2, 1.33, .05); g.stroke();
  for (let k = 0; k < 2; k++) {
    const x = 13.25 + k * .75;
    fillRR(g, '#a9b0b7', x, .28, .6, .42, .03); g.fillStyle = '#0c0d0e'; g.fillRect(x + .06, .33, .48, .32);
    rj45(g, x - .03, .96, .66, .5, false);
  }
  g.fillStyle = '#cfd5dc'; g.font = '0.19px sans-serif'; g.fillText('Catalyst 2960G Series', 15.0, .78);
  g.font = '0.11px sans-serif'; g.fillText('24 × 10/100/1000', 15.0, 1.02);
});
const swEar = tex(.75, S.h, 120, (g, w, h) => { g.fillStyle = '#2f353c'; g.fillRect(0, 0, w, h); screwHole(g, w / 2, .35, .11); screwHole(g, w / 2, h - .35, .11); });
const swTop = tex(S.w, S.d, 30, (g, w, h) => {
  g.fillStyle = '#4a5058'; g.fillRect(0, 0, w, h); speck(g, w, h, 2500, .05, .04);
  slots(g, .5, h - 5, 1.6, 4, .3, .45, .12, .3, '#25292e'); slots(g, w - 2.1, h - 5, 1.6, 4, .3, .45, .12, .3, '#25292e');
  fillRR(g, '#d9dad6', 6, 3, 4, 2, .05); g.fillStyle = '#9fa09b'; for (let k = 0; k < 5; k++) g.fillRect(6.3, 3.3 + k * .3, 3 - k * .3, .08);
});
const swSide = tex(S.d, S.h, 30, (g, w, h) => { g.fillStyle = '#434951'; g.fillRect(0, 0, w, h); slots(g, 1, .3, w - 2, 1.1, .32, .4, .14, .28, '#1e2226'); });
const swBack = tex(S.w, S.h, 100, (g, w, h) => {
  g.fillStyle = '#3d434a'; g.fillRect(0, 0, w, h); speck(g, w, h, 900, .05, .02);
  rj45(g, 1.4, .58, .6, .55, false); g.strokeStyle = '#4c8fd6'; g.lineWidth = .03; rr(g, 1.36, .54, .68, .63, .04); g.stroke();
  g.fillStyle = '#cfd5dc'; g.font = '0.1px sans-serif'; g.fillText('CONSOLE', 1.36, .45);
  for (const cx of [5.2, 8.2]) { circ(g, '#15181b', cx, .86, .62); for (let r = .55; r > .05; r -= .1) { g.strokeStyle = '#3d434a'; g.lineWidth = .03; g.beginPath(); g.arc(cx, .86, r, 0, 7); g.stroke(); } }
  fillRR(g, '#15181b', 11.6, .5, 1.6, .7, .05); g.fillText('RPS', 11.6, .42);
  c14(g, 15.2, .58, .7, .55);
});
const sw = new THREE.Group(); rack.add(sw);
sw.position.set(0, uBottom(11) + S.h / 2, FRONT);
const swM = { roughness: .5, metalness: .4 };
faced(S.w, S.h, S.d, { front: mapMat(swFront, swM), back: mapMat(swBack, swM), top: mapMat(swTop, swM), side: mapMat(swSide, swM), bottom: darkMetal }, sw, 0, 0, -S.d / 2);
for (const s of [-1, 1]) { faced(.75, S.h, .12, { front: mapMat(swEar, swM), back: darkMetal, top: darkMetal, side: darkMetal }, sw, s * (S.w / 2 + .375), 0, .06); screw(sw, s * (S.w / 2 + .375), S.h / 2 - .35, .14); screw(sw, s * (S.w / 2 + .375), -S.h / 2 + .35, .14); }
const swPX = (n) => { const p = portXY(n); return { x: -S.w / 2 + p.x, y: S.h / 2 - p.y, ledY: S.h / 2 - (p.row ? 1.6 : .13) }; };
led(sw, -S.w / 2 + .45, S.h / 2 - .3, .01, 0x46e36a, 'steady');
led(sw, -S.w / 2 + .45, S.h / 2 - .84, .01, 0x46e36a, 'steady');
[1, 2, 3, 24].forEach(n => { const p = swPX(n); led(sw, p.x, p.ledY, .01, 0x46e36a, 'flicker', .04); });
outline(sw, S.w + 1.5, S.h, S.d, -S.d / 2);
register(sw, 'Cisco Catalyst 2960G', 'Managed Gigabit switch', '#switch');

/* ================= SERVER 2 — 2U case 16.9 × 3.5 × 15 in ================= */
const C = { w: 16.9, h: 3.5, d: 15, bez: .35 };
const s2Front = tex(C.w, C.h, 120, (g, w, h) => {
  g.fillStyle = '#121315'; g.fillRect(0, 0, w, h); speck(g, w, h, 1200, .05, .02);
  for (const [a, b] of [[.45, 5.55], [6.75, 11.25], [11.55, 16.45]]) { fillRR(g, '#17181b', a - .1, .25, b - a + .2, 3.0, .06); slots(g, a, .38, b - a, 2.8, .2, .5, .085, .4, '#020203', true); }
  usb(g, 5.88, .42, .32, .6, true); usb(g, 5.88, 2.55, .32, .6, true);
  circ(g, '#060607', 6.12, 1.3, .055); circ(g, '#060607', 6.12, 1.55, .055);
  circ(g, '#2a2c30', 6.04, 1.98, .1); circ(g, '#0d0d0f', 6.04, 1.98, .06);
  circ(g, '#2a2c30', 6.04, 2.32, .12); circ(g, '#0d0d0f', 6.04, 2.32, .08);
  g.strokeStyle = '#7d8085'; g.lineWidth = .02; g.beginPath(); g.arc(6.35, 2.32, .06, -1.1, 4.2); g.moveTo(6.35, 2.24); g.lineTo(6.35, 2.32); g.stroke();
});
const s2Ear = tex(1.05, C.h, 120, (g, w, h) => { g.fillStyle = '#141517'; g.fillRect(0, 0, w, h); screwHole(g, w / 2 - .1, .3, .12); screwHole(g, w / 2 - .1, h - .3, .12); });
const s2Top = tex(C.w, C.d, 30, (g, w, h) => {
  g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, w, h); brushed(g, w, h, 400, .06);
  g.fillStyle = '#6a6e73'; for (let y = 1.0; y < 2.6; y += .22) g.fillRect(2.5, y, 5.2, .1);
  for (let x = .5; x < w; x += 2.5) circ(g, '#8a8e93', x, h - .25, .06);
});
const s2Side = tex(C.d, C.h, 30, (g, w, h) => { g.fillStyle = '#c3c6ca'; g.fillRect(0, 0, w, h); brushed(g, w, h, 150, .06); slots(g, .8, .5, 1.5, 2.6, .25, .3, .1, .2, '#45484c'); slots(g, w - 2.3, .5, 1.5, 2.6, .25, .3, .1, .2, '#45484c'); });
const s2Back = tex(C.w, C.h, 100, (g, w, h) => {
  g.fillStyle = '#b6b9bd'; g.fillRect(0, 0, w, h); brushed(g, w, h, 160, .08);
  holes(g, .4, .35, 6.1, 1.05, .2, .07, '#3a3d41');
  fillRR(g, '#c9ccd0', .3, 1.58, 6.25, 1.75, .02);
  usb(g, .6, 1.75, .5, .2); usb(g, .6, 2.05, .5, .2); usb(g, 1.25, 1.75, .5, .2); usb(g, 1.25, 2.05, .5, .2);
  fillRR(g, '#2f5aa8', 1.95, 1.75, .75, .42, .06);
  fillRR(g, '#0c0c0d', 2.9, 1.8, .55, .22, .03); fillRR(g, '#0c0c0d', 3.55, 1.8, .45, .22, .03);
  rj45(g, 4.15, 1.72, .6, .55, false); usb(g, 4.2, 2.42, .5, .2); usb(g, 4.2, 2.7, .5, .2);
  [['#4a7fd0', 5.35], ['#69b04a', 5.75], ['#d06b9a', 6.15]].forEach(([c, x]) => { circ(g, c, x, 2.35, .14); circ(g, '#111', x, 2.35, .06); });
  for (let k = 0; k < 4; k++) {
    const x = 6.85 + k * .68;
    if (k === 0) { fillRR(g, '#26282b', x, .3, .55, 2.9, .02); [[.55, .36], [1.05, .36], [1.55, .36], [2.1, .4]].forEach(([y, hh]) => { fillRR(g, '#090909', x + .12, y, .3, hh, .03); g.fillStyle = '#bdbdbd'; g.fillRect(x + .17, y + .1, .2, .03); }); }
    else { fillRR(g, '#a9adb1', x, .3, .55, 2.9, .02); slots(g, x + .1, .6, .4, 2.3, .14, .2, .08, .13, '#4a4d51', true); }
    circ(g, '#7c8085', x + .27, .2, .05);
  }
  slots(g, 9.75, .35, .6, 2.9, .15, .15, .09, .09, '#3a3d41');
  fillRR(g, '#2a2c2f', 10.7, .3, 5.3, 2.95, .05);
  holes(g, 10.9, .5, 3.4, 2.6, .18, .07, '#121314');
  c14(g, 14.7, 1.0, .7, .55);
  fillRR(g, '#0f0f10', 14.82, 1.9, .46, .62, .04); fillRR(g, '#1d1d1f', 14.88, 1.96, .34, .5, .03);
});
const s2 = new THREE.Group(); rack.add(s2);
s2.position.set(0, uBottom(5) + C.h / 2, FRONT);
const s2M = { roughness: .38, metalness: .55 };
const bezel = mapMat(s2Front, { roughness: .6, metalness: .25 });
faced(C.w, C.h, C.bez, { front: bezel, back: darkMetal, top: darkMetal, side: darkMetal }, s2, 0, 0, -C.bez / 2);
faced(C.w, C.h - .05, C.d - C.bez, { front: darkMetal, back: mapMat(s2Back, s2M), top: mapMat(s2Top, s2M), side: mapMat(s2Side, s2M), bottom: steel }, s2, 0, -.025, -C.bez - (C.d - C.bez) / 2);
const handleMat = std({ color: 0x18191b, roughness: .45, metalness: .2 });
for (const s of [-1, 1]) {
  const ex = s * (C.w / 2 + .525);
  faced(1.05, C.h, .12, { front: mapMat(s2Ear, { roughness: .6, metalness: .2 }), back: darkMetal, top: darkMetal, side: darkMetal }, s2, ex, 0, .06);
  screw(s2, ex - s * .1, C.h / 2 - .3, .14); screw(s2, ex - s * .1, -C.h / 2 + .3, .14);
  const hx = ex + s * .18;
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(hx, -1.15, .1), new THREE.Vector3(hx, -1.15, .75), new THREE.Vector3(hx, -.9, 1.0), new THREE.Vector3(hx, .9, 1.0), new THREE.Vector3(hx, 1.15, .75), new THREE.Vector3(hx, 1.15, .1)]);
  mesh(new THREE.TubeGeometry(curve, 40, .17, 12, false), handleMat, s2);
}
led(s2, -C.w / 2 + 6.12, C.h / 2 - 1.3, .01, 0x46e36a, 'steady', .05);
led(s2, -C.w / 2 + 6.12, C.h / 2 - 1.55, .01, 0xff7a2f, 'flicker', .05);
for (const s of [-1, 1]) box(.3, .8, 28.2, steel, rack, s * 8.62, s2.position.y - C.h / 2 - .4, FRONT - 14.1 - .2);
outline(s2, C.w + 2.1, C.h, C.d, -C.d / 2);
register(s2, 'Server 2 · 2U chassis', 'i5-6500 · 16 GB · RX 580 · Jellyfin', '#server2');

/* ================= CABLES ================= */
const v = (x, y, z) => new THREE.Vector3(x, y, z);
function cable(points, color, r) {
  const m = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'catmullrom', .5), 160, r, 10, false), std({ color, roughness: .55, metalness: 0 }));
  return m;
}
function plug(x, y, z, color, w, h, d) { box(w || .46, h || .4, d || .8, std({ color, roughness: .4, metalness: 0, transparent: true, opacity: .92 }), rack, x, y, z); }
const swWorld = (n) => { const p = swPX(n); return { x: p.x, y: sw.position.y + p.y }; };
const UCS_BACK = FRONT - U.d, S2_BACK = FRONT - C.d, SW_BACK = FRONT - S.d;
const ucsY = (canvasY) => ucs.position.y + U.h / 2 - canvasY;
const ucsX = (canvasX) => U.w / 2 - canvasX;     // rear canvas is drawn as seen from behind
const s2Y = (canvasY) => s2.position.y + C.h / 2 - canvasY;
const s2X = (canvasX) => C.w / 2 - canvasX;

function patch(n, tx, ty, tz, color, o, viaY) {
  const p = swWorld(n), lx = -9.05 - o;
  plug(p.x, p.y, FRONT + .42, color);
  const pts = [v(p.x, p.y, FRONT + .8), v(p.x, p.y - .3, FRONT + 1.5), v(p.x * .82, 19.45 - o * .5, FRONT + 1.2), v(p.x * .55, 19.2 - o * .5, FRONT - 1.5), v(lx + 1.2, 19.05, 10.5), v(lx, 18.6, 7)];
  if (viaY !== undefined) pts.push(v(lx, viaY + 1.2, 2), v(lx, viaY, -4));
  return pts;
}
// port 1 → UCS LOM 1 (blue)
{
  const tx = ucsX(9.4), ty = ucsY(2.875);
  const pts = patch(1, tx, ty, UCS_BACK, 0x2f6fd8, 0, ty);
  pts.push(v(-9.1, ty, -13.9), v(-6, ty, -14.5), v(tx, ty, -14.55), v(tx, ty, UCS_BACK - .8));
  cable(pts, 0x2f6fd8, .11); plug(tx, ty, UCS_BACK - .42, 0x2f6fd8);
}
// port 3 → UCS CIMC management (yellow)
{
  const tx = ucsX(8.7), ty = ucsY(2.875);
  const pts = patch(3, tx, ty, UCS_BACK, 0xe2b93b, .14, ty + .05);
  pts.push(v(-9.24, ty + .05, -13.7), v(-5, ty + .05, -14.35), v(tx, ty, -14.45), v(tx, ty, UCS_BACK - .8));
  cable(pts, 0xe2b93b, .11); plug(tx, ty, UCS_BACK - .42, 0xe2b93b);
}
// port 2 → Server 2 LAN (blue)
{
  const tx = s2X(4.45), ty = s2Y(2.0);
  const pts = patch(2, tx, ty, S2_BACK, 0x2f6fd8, .28);
  pts.push(v(-9.33, 13.8, 3), v(-9.3, ty + .4, -2.6), v(-5, ty + .1, -2.4), v(tx - 1, ty, -1.9), v(tx, ty, -1.5), v(tx, ty, S2_BACK - .8));
  cable(pts, 0x2f6fd8, .11); plug(tx, ty, S2_BACK - .42, 0x2f6fd8);
}
// port 24 → uplink, leaves the rack at the back bottom
{
  const pts = patch(24, 0, 0, 0, 0xb9bec4, .42);
  pts.push(v(-9.47, 8, 2), v(-9.4, 3.3, -6), v(-9.2, 3.0, -13.3), v(-8.4, 2.9, -15.6), v(-7.6, 1.2, -18), v(-6, .15, -23), v(-3, .15, -32));
  cable(pts, 0xb9bec4, .11);
}
// power cords
function cord(x, y, zBack, pts) {
  plug(x, y, zBack - .6, 0x111214, .9, .7, 1.2);
  cable([v(x, y, zBack - 1.2), ...pts], 0x161718, .17);
}
for (const px of [11.35, 14.2]) { const x = ucsX(px + 2.1), y = ucsY(2.125); cord(x, y, UCS_BACK, [v(x, y - .3, -15.9), v(x - .3, y - 3, -16.8), v(x - .5, 4, -17.4), v(x - .4, .17, -19.5), v(x + 1, .17, -26), v(x + 4, .17, -34)]); }
{ const x = s2X(15.05), y = s2Y(1.275); cord(x, y, S2_BACK, [v(x, y - .4, -3), v(x + .2, y - .8, -10), v(x + .2, y - .9, -14), v(x + .3, y - 1.5, -16.2), v(x + .2, 3, -17.6), v(x + .6, .17, -20.5), v(x + 2, .17, -29)]); }
{ const y = sw.position.y + S.h / 2 - .855; const xx = S.w / 2 - 15.55; cord(xx, y, SW_BACK, [v(xx, y - .3, -1.5), v(xx, 19.3, -5), v(xx, 19.3, -13.2), v(xx + .3, 18.6, -16.1), v(xx + .5, 10, -17.6), v(xx + .4, 1.5, -18), v(xx + .8, .17, -21), v(xx + 3, .17, -31)]); }

/* ---------- floor shadow ---------- */
const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.ShadowMaterial({ opacity: .42 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

/* ---------- camera + controls ---------- */
const VIEWS = { angle: v(46, 30, 66), front: v(0, 15, 84), side: v(86, 18, 6), back: v(-38, 26, -72) };
camera.position.copy(VIEWS.angle).multiplyScalar(1.5);
let controls = null;
if (THREE.OrbitControls) {
  controls = new THREE.OrbitControls(camera, canvas);
  controls.target.copy(TARGET); controls.enableDamping = true; controls.dampingFactor = .08;
  controls.enablePan = false; controls.enableZoom = false; controls.rotateSpeed = .65;
  controls.minPolarAngle = .25; controls.maxPolarAngle = 1.5;
  controls.autoRotate = !reduce; controls.autoRotateSpeed = .45;
  let idleT;
  controls.addEventListener('start', () => { controls.autoRotate = false; tween = null; clearTimeout(idleT); setView(null); });
  controls.addEventListener('end', () => { clearTimeout(idleT); idleT = setTimeout(() => { controls.autoRotate = !reduce; }, 8000); });
} else {
  // minimal fallback orbit
  let drag = false, lx = 0, ly = 0; const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(TARGET));
  canvas.addEventListener('pointerdown', e => { drag = true; lx = e.clientX; ly = e.clientY; tween = null; });
  addEventListener('pointerup', () => drag = false);
  canvas.addEventListener('pointermove', e => { if (!drag) return; sph.setFromVector3(camera.position.clone().sub(TARGET)); sph.theta -= (e.clientX - lx) * .008; sph.phi = THREE.MathUtils.clamp(sph.phi - (e.clientY - ly) * .006, .25, 1.5); lx = e.clientX; ly = e.clientY; camera.position.copy(TARGET).add(new THREE.Vector3().setFromSpherical(sph)); camera.lookAt(TARGET); });
}
camera.lookAt(TARGET);

let tween = null;
function flyTo(pos, dur) {
  const a = new THREE.Spherical().setFromVector3(camera.position.clone().sub(TARGET));
  const b = new THREE.Spherical().setFromVector3(pos.clone().sub(TARGET));
  let dt = b.theta - a.theta; while (dt > Math.PI) dt -= Math.PI * 2; while (dt < -Math.PI) dt += Math.PI * 2;
  tween = { a, b: { radius: b.radius, phi: b.phi, theta: a.theta + dt }, t: 0, dur: reduce ? .01 : (dur || 1.2) };
}
const viewBtns = [...document.querySelectorAll('.views button')];
function setView(name) { viewBtns.forEach(b => b.classList.toggle('on', b.dataset.v === name)); }
viewBtns.forEach(b => b.addEventListener('click', () => { if (controls) controls.autoRotate = false; flyTo(VIEWS[b.dataset.v]); setView(b.dataset.v); }));
flyTo(VIEWS.angle, 2.2); setView('angle');

/* ---------- hover + click ---------- */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
let hovered = null, downX = 0, downY = 0;
const pickables = []; devices.forEach(d => d.traverse(o => { if (o.isMesh) pickables.push(o); }));
function pick(e) {
  const r = canvas.getBoundingClientRect();
  mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(pickables, false)[0];
  return hit ? hit.object.userData.device : null;
}
canvas.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; });
canvas.addEventListener('pointermove', e => {
  if (e.buttons) { tip.style.opacity = 0; return; }
  const d = pick(e), r = canvas.getBoundingClientRect();
  hovered = d;
  if (d) { tip.innerHTML = '<b>' + d.userData.name + '</b><span>' + d.userData.info + '</span>'; tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.style.opacity = 1; canvas.style.cursor = 'pointer'; }
  else { tip.style.opacity = 0; canvas.style.cursor = ''; }
});
canvas.addEventListener('pointerleave', () => { hovered = null; tip.style.opacity = 0; });
canvas.addEventListener('pointerup', e => {
  if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 5) return;
  const d = pick(e); if (d) document.querySelector(d.userData.target).scrollIntoView({ behavior: 'smooth' });
});

/* ---------- resize + loop ---------- */
function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 640 ? 40 : 30; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
let visible = true, running = false; const clock = new THREE.Clock();
new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }).observe(stage);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function start() {
  if (running) return; running = true; clock.getDelta();
  (function frame() {
    if (!visible) { running = false; return; }
    const dt = Math.min(clock.getDelta(), .05), T = clock.elapsedTime;
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.dur); const k = ease(tween.t);
      const s = new THREE.Spherical(THREE.MathUtils.lerp(tween.a.radius, tween.b.radius, k), THREE.MathUtils.lerp(tween.a.phi, tween.b.phi, k), THREE.MathUtils.lerp(tween.a.theta, tween.b.theta, k));
      camera.position.copy(TARGET).add(new THREE.Vector3().setFromSpherical(s)); camera.lookAt(TARGET);
      if (tween.t >= 1) tween = null;
    } else if (controls) controls.update();
    for (const l of leds) {
      const u = l.userData; let on = true;
      if (u.mode === 'blink') on = Math.sin(T * u.speed + u.phase) > 0;
      else if (u.mode === 'flicker') { u.t -= dt; if (u.t <= 0) { u.state = R() < .55; u.t = .03 + R() * .18; } on = u.state; }
      if (!reduce || u.mode === 'steady') l.material.color.copy(on ? u.on : u.off);
    }
    for (const d of devices) { const o = d.userData.outline.material; o.opacity += ((d === hovered ? .9 : 0) - o.opacity) * .2; }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  })();
}
start();
})();
