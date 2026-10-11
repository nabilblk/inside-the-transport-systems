// ============================================================== core: renderer, camera, helpers
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = t => 1 - Math.pow(1 - t, 3);
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);

// The 3D palette matches the workbook: coral = oxygen-rich, indigo = oxygen-poor, teal = plant, sky blue = water, mango = sugar.
const C = {
  oxy: '#EE5A52', oxyDeep: '#B9312B', deoxy: '#5552DA', deoxyDeep: '#2F2C9B', oxyT: '#F7B8B2', deoxyT: '#C4C2F7',
  muscle: '#CF5B53', muscleCut: '#F0A49B', valve: '#FFF1E6',
  coat: '#EFE6EA', lining: '#FFE2DA', elastic: '#FFF4D6', tissue: '#F2C2B7', tissueDeep: '#D99A8E', nucleus: '#8B5CC2',
  plasma: '#F6C44B', wbc: '#ECEAFF', platelet: '#F5A93A',
  leaf: '#16A088', leafDeep: '#0B6F60', stem: '#2AA68E', root: '#D9C49C', soil: '#8D6B49', soilDeep: '#5C452F',
  xylem: '#2E9BF0', phloem: '#F5A514', water: '#2E9BF0', vapour: '#CFEAFF', sugar: '#FFB81F', chloro: '#2DB34A',
};
const col = h => new THREE.Color(h);

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  document.getElementById('loadMsg').textContent = 'This device could not start 3D graphics (WebGL). Try another browser, or turn on hardware acceleration.';
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 900);
camera.position.set(0, 2, 30);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.085; controls.enablePan = false;
controls.rotateSpeed = 0.65; controls.zoomSpeed = 0.8;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;
const hemi = new THREE.HemisphereLight('#FFFFFF', '#AEB8D4', 0.85); scene.add(hemi);
const keyLight = new THREE.DirectionalLight('#FFFFFF', 2.1); keyLight.position.set(7, 11, 10); scene.add(keyLight);
const rimLight = new THREE.DirectionalLight('#CFDAFF', 1.1); rimLight.position.set(-9, 5, -10); scene.add(rimLight);

const labelRenderer = new CSS2DRenderer({ element: document.getElementById('labels') });
// screen tint for the experiment (dark, hot). Faded by the render loop, so it never sticks half-way on a slow device.
const TINT = { el: document.getElementById('tint'), k: 0, target: 0, bg: 'transparent',
  set(bg, on) { if (bg !== this.bg) { this.bg = bg; if (on) this.el.style.background = bg; } this.target = on ? 1 : 0; },
  update(dt) { this.k += (this.target - this.k) * (1 - Math.exp(-dt * 5)); if (this.k < 0.003 && this.target === 0) this.k = 0; this.el.style.opacity = this.k.toFixed(3); } };

// ---------------------------------------------------------------- framing: keep the subject centred in the free space
const cardEl = document.getElementById('card'), barEl = document.getElementById('bar');
const VIEW = { w: 1, h: 1, freeW: 1, freeH: 1 };
function layout() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  const c = cardEl.getBoundingClientRect(), b = barEl.getBoundingClientRect();
  const wide = w >= 900, lg = document.getElementById('legend').getBoundingClientRect();
  let x0 = 0, x1 = w, y0 = (wide || !lg.height ? b.bottom : Math.max(b.bottom, lg.bottom)) + 6, y1 = h;
  if (wide) x0 = c.right + 8; else y1 = c.top - 6;
  VIEW.w = w; VIEW.h = h; VIEW.freeW = Math.max(120, x1 - x0); VIEW.freeH = Math.max(120, y1 - y0);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  camera.setViewOffset(w, h, w / 2 - cx, h / 2 - cy, w, h);
  camera.updateProjectionMatrix();
}
// distance at which a box of world size (fw, fh) fills the free space with a small margin
function fitDistance(fw, fh, margin = 1.12) {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const fracH = VIEW.freeH / VIEW.h, fracW = VIEW.freeW / VIEW.w;
  const dh = (fh * margin) / (2 * t * fracH);
  const dw = (fw * margin) / (2 * t * camera.aspect * fracW);
  return Math.max(dh, dw);
}

// ---------------------------------------------------------------- tweens and camera flights
const tweens = new Set();
function tween(dur, fn, ease = easeIO) {
  return new Promise(res => { tweens.add({ t: 0, dur: Math.max(1e-4, REDUCED ? dur * 0.4 : dur), fn, ease, res }); });
}
function runTweens(dt) {
  for (const tw of tweens) {
    tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(tw.ease(k));
    if (k >= 1) { tweens.delete(tw); tw.res(); }
  }
}
const CAM = { token: 0, busy: false, follow: null, home: null };
const _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion(), _qk = new THREE.Quaternion(), _fwd = V3(0, 0, 1);
function frameSpec(spec) {
  const t = V3(...spec.t), dir = V3(...(spec.dir || [0, 0.12, 1])).normalize();
  const d = fitDistance(spec.w, spec.h, spec.margin || 1.12);
  return { target: t, pos: t.clone().addScaledVector(dir, d), dist: d };
}
function flyTo(spec, dur = 1.35, instant = false) {
  const tok = ++CAM.token; CAM.follow = null; CAM.home = spec;
  const { target, pos, dist } = frameSpec(spec);
  controls.minDistance = dist * (spec.minK || 0.32); controls.maxDistance = dist * (spec.maxK || 2.3);
  if (instant) { camera.position.copy(pos); controls.target.copy(target); controls.update(); return Promise.resolve(); }
  const t0 = controls.target.clone(), p0 = camera.position.clone();
  const d0 = p0.distanceTo(t0), d1 = pos.distanceTo(target);
  const dir0 = p0.clone().sub(t0).normalize(), dir1 = pos.clone().sub(target).normalize();
  _q0.setFromUnitVectors(_fwd, dir0); _q1.setFromUnitVectors(_fwd, dir1);
  CAM.busy = true;
  return tween(dur, k => {
    if (tok !== CAM.token) return;
    controls.target.lerpVectors(t0, target, k);
    _qk.slerpQuaternions(_q0, _q1, k);
    const dd = lerp(d0, d1, k) * (1 + 0.18 * Math.sin(Math.PI * k) * (d0 > 0 ? 1 : 0));
    camera.position.copy(_fwd).applyQuaternion(_qk).multiplyScalar(dd).add(controls.target);
  }).then(() => { if (tok === CAM.token) CAM.busy = false; });
}

// ---------------------------------------------------------------- materials
function tissue(color, o = {}) {
  const c = col(color);
  return new THREE.MeshPhysicalMaterial(Object.assign({
    color: c, roughness: 0.46, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.32,
    sheen: 0.55, sheenRoughness: 0.5, sheenColor: c.clone().lerp(col('#ffffff'), 0.55),
  }, o));
}
// x-ray glass: transparent in the middle, bright at grazing angles, so what flows inside stays readable
const GLASS_VS = `
  varying vec3 vN; varying vec3 vV;
  #ifdef BEAT
  uniform float uA; uniform float uV;
  #endif
  void main(){
    vec3 p = position;
    #ifdef BEAT
    { float am = smoothstep(-3.0, 3.0, p.y); vec2 ac = vec2(sign(p.x) * 23.0, 15.0); vec2 vc = vec2(0.0, -22.0);
      vec2 pa = ac + (p.xy - ac) * (1.0 - 0.10 * uA); vec2 pv = vc + (p.xy - vc) * (1.0 - 0.075 * uV); p.xy = mix(pv, pa, am); }
    #endif
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const GLASS_FS = `
  uniform vec3 uColor; uniform float uOpacity; uniform float uPower; uniform float uBase; uniform float uGlow;
  varying vec3 vN; varying vec3 vV;
  void main(){
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
    float a = uOpacity * (uBase + (1.0 - uBase) * f) + uGlow * 0.35 * f;
    vec3 c = uColor * (0.78 + 0.5 * f) + vec3(uGlow) * 0.55 * f;
    gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
function glass(color, o = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: col(color) }, uOpacity: { value: o.opacity ?? 0.55 }, uPower: { value: o.power ?? 2.0 }, uBase: { value: o.base ?? 0.12 }, uGlow: { value: 0 },
                uA: o.beat ? o.beat.uA : { value: 0 }, uV: o.beat ? o.beat.uV : { value: 0 } },
    vertexShader: GLASS_VS, fragmentShader: GLASS_FS, transparent: true, depthWrite: false, side: o.side ?? THREE.DoubleSide,
    defines: o.beat ? { BEAT: '' } : {},
  });
  m.isGlass = true; return m;
}
// heartbeat squeeze, injected into standard materials (same maths as GLASS_VS so walls and glass move together)
function beatify(mat, beat) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uA = beat.uA; sh.uniforms.uV = beat.uV;
    sh.vertexShader = 'uniform float uA; uniform float uV;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      { float am = smoothstep(-3.0, 3.0, transformed.y); vec2 ac = vec2(sign(transformed.x) * 23.0, 15.0); vec2 vc = vec2(0.0, -22.0);
        vec2 pa = ac + (transformed.xy - ac) * (1.0 - 0.10 * uA); vec2 pv = vc + (transformed.xy - vc) * (1.0 - 0.075 * uV);
        transformed.xy = mix(pv, pa, am); }`);
  };
  mat.customProgramCacheKey = () => 'beat';
  return mat;
}
function squeezePoint(p, uA, uV) {   // CPU twin of the shader above, for particles inside the chambers
  const am = sstep(-3, 3, p.y);
  const acx = Math.sign(p.x) * 23, acy = 15, vcx = 0, vcy = -22;
  const pax = acx + (p.x - acx) * (1 - 0.10 * uA), pay = acy + (p.y - acy) * (1 - 0.10 * uA);
  const pvx = vcx + (p.x - vcx) * (1 - 0.075 * uV), pvy = vcy + (p.y - vcy) * (1 - 0.075 * uV);
  p.x = lerp(pvx, pax, am); p.y = lerp(pvy, pay, am);
}
const invisible = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
function hull(geo, key, parent, pos) { const m = new THREE.Mesh(geo, invisible); m.userData.pick = key; if (pos) m.position.copy(pos); parent.add(m); return m; }

// highlight registry: materials glow gently when their key is in focus
class Glow {
  constructor() { this.map = new Map(); this.focus = new Set(); }
  add(key, ...mats) { if (!this.map.has(key)) this.map.set(key, { mats: [], k: 0 }); this.map.get(key).mats.push(...mats); }
  set(keys = []) { this.focus = new Set(keys); }
  update(dt, t) {
    for (const [key, e] of this.map) {
      const target = this.focus.has(key) ? 1 : 0;
      e.k += (target - e.k) * (1 - Math.exp(-dt * 6));
      const pulse = e.k * (0.55 + 0.45 * Math.sin(t * 4.2));
      for (const m of e.mats) {
        if (m.isGlass) m.uniforms.uGlow.value = pulse * 0.9;
        else if (m.emissive) { m.emissive.setRGB(1, 1, 1); m.emissiveIntensity = pulse * 0.32; }
      }
    }
  }
}

// ---------------------------------------------------------------- labels pinned to the model
const LABELS = [];
function label(text, o = {}) {
  const el = document.createElement('div');
  el.className = 'lab ' + (o.tone || '');
  const dx = o.dx ?? 0, dy = o.dy ?? -40;
  el.innerHTML = `<i class="dot"></i><i class="ln"></i><span class="pill">${text}${o.sub ? `<small>${o.sub}</small>` : ''}</span>`;
  const obj = new CSS2DObject(el); obj.visible = false;
  Object.assign(obj.userData, { el, dx, dy, ox: dx, oy: dy, pill: el.querySelector('.pill'), ln: el.querySelector('.ln'), fresh: true, free: !o.fixed });
  placeLabel(obj, dx, dy);
  if (o.pos) obj.position.copy(o.pos);
  LABELS.push(obj);
  return obj;
}
function placeLabel(obj, x, y) {
  const u = obj.userData, L = Math.hypot(x, y);
  u.pill.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
  u.ln.style.width = `${Math.max(0, L).toFixed(1)}px`; u.ln.style.transform = `rotate(${Math.atan2(y, x).toFixed(4)}rad)`;
  u.ln.style.display = L > 14 ? '' : 'none';
}
function setLabelText(obj, text, sub) { const p = obj.userData.pill; p.innerHTML = text + (sub ? `<small>${sub}</small>` : ''); obj.userData.pw = 0; }

// Keep every visible label on screen and clear of the card, the bars and each other. Runs after each render.
const _lv = new THREE.Vector3();
function layoutLabels(blockers) {
  const W = VIEW.w, H = VIEW.h, M = 8, placed = blockers.slice();
  for (const obj of LABELS) {
    const u = obj.userData;
    if (!u.free || u.el.style.display === 'none' || !u.el.classList.contains('on')) { u.fresh = true; continue; }
    if (!u.pw) { u.pw = u.pill.offsetWidth; u.ph = u.pill.offsetHeight; }
    obj.getWorldPosition(_lv).project(camera);
    const ax = (_lv.x * 0.5 + 0.5) * W, ay = (-_lv.y * 0.5 + 0.5) * H, hw = u.pw / 2 + 3, hh = u.ph / 2 + 3;
    let cx = ax + u.dx, cy = ay + u.dy;
    for (let it = 0; it < 6; it++) {
      cx = clamp(cx, hw + M, W - hw - M); cy = clamp(cy, hh + M, H - hh - M);
      let moved = false;
      for (const r of placed) {
        const ox = Math.min(cx + hw, r.x1) - Math.max(cx - hw, r.x0), oy = Math.min(cy + hh, r.y1) - Math.max(cy - hh, r.y0);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        const rcx = (r.x0 + r.x1) / 2, rcy = (r.y0 + r.y1) / 2;
        if (oy <= ox || W < 700) cy += cy < rcy ? -oy : oy; else cx += cx < rcx ? -ox : ox;   // narrow screens: stack, there is no room sideways
      }
      if (!moved) break;
    }
    cx = clamp(cx, hw + M, W - hw - M); cy = clamp(cy, hh + M, H - hh - M);
    const tx = cx - ax, ty = cy - ay;
    if (u.fresh) { u.ox = tx; u.oy = ty; u.fresh = false; } else { u.ox += (tx - u.ox) * 0.4; u.oy += (ty - u.oy) * 0.4; }
    placeLabel(obj, u.ox, u.oy);
    placed.push({ x0: ax + u.ox - hw, x1: ax + u.ox + hw, y0: ay + u.oy - hh, y1: ay + u.oy + hh });
  }
}

// ---------------------------------------------------------------- paths and flowing particles
class Path {
  constructor(pts, o = {}) {
    const v = pts.map(p => (p.isVector3 ? p.clone() : V3(p[0], p[1], p[2] ?? 0)));
    this.curve = new THREE.CatmullRomCurve3(v, false, 'centripetal');
    this.len = Math.max(1e-4, this.curve.getLength()); const n = this.n = o.n || Math.max(24, Math.min(240, Math.round(this.len * (o.density || 6))));
    const fr = this.curve.computeFrenetFrames(n, false);
    this.P = []; for (let i = 0; i <= n; i++) this.P.push(this.curve.getPointAt(i / n));
    this.T = fr.tangents; this.N = fr.normals; this.B = fr.binormals;
    if (o.planeN) { // keep the 'normal' in a chosen plane (useful for flat diagrams)
      const up = V3(...o.planeN);
      for (let i = 0; i <= n; i++) { this.B[i].copy(up); this.N[i].crossVectors(this.B[i], this.T[i]).normalize(); this.B[i].crossVectors(this.T[i], this.N[i]).normalize(); }
    }
  }
  at(t, out) { const f = clamp(t, 0, 1) * this.n, i = Math.min(Math.floor(f), this.n - 1), k = f - i; return out.lerpVectors(this.P[i], this.P[i + 1], k); }
  frame(t, T, N, B) {
    const f = clamp(t, 0, 1) * this.n, i = Math.min(Math.floor(f), this.n - 1), k = f - i;
    T.lerpVectors(this.T[i], this.T[i + 1], k).normalize(); N.lerpVectors(this.N[i], this.N[i + 1], k).normalize(); B.lerpVectors(this.B[i], this.B[i + 1], k).normalize();
  }
}
const _P = V3(), _T = V3(), _N = V3(), _B = V3(), _Q = new THREE.Quaternion(), _S = V3(), _M = new THREE.Matrix4(), _C = new THREE.Color();
class Flow {
  // segs: [{paths:[Path], rn, rb}]; hooks decide speed, routing, colour, size and any final position tweak
  constructor(o) {
    this.mesh = new THREE.InstancedMesh(o.geometry, o.material, o.count);
    this.mesh.frustumCulled = false; this.mesh.castShadow = false;
    if (o.pick) this.mesh.userData.pick = o.pick;
    o.parent.add(this.mesh);
    Object.assign(this, { segs: o.segs, next: o.next, speed: o.speed, color: o.color, scale: o.scale, pos: o.pos, size: o.size ?? 1, tumble: o.tumble ?? 1 });
    const R = this.R = rng(o.seed || 1);
    this.cells = Array.from({ length: o.count }, (_, i) => ({
      i, seg: 0, br: 0, t: 0, ox: 0, oy: 0, ax: V3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), rot: R() * TAU,
      spin: (R() - 0.5) * 2.4, j: 0.8 + R() * 0.4, slot: 0.12 + 0.82 * R(), k: R(), d: {},
    }));
    for (const c of this.cells) { this.lateral(c); o.init(c, R); }
    for (let i = 0; i < o.count; i++) this.mesh.setColorAt(i, _C.set('#ffffff'));
    this.update(0, 0);
  }
  lateral(c) { const a = TAU * this.R(), d = Math.sqrt(this.R()); c.ox = Math.cos(a) * d; c.oy = Math.sin(a) * d; }
  update(dt, time) {
    for (const c of this.cells) {
      let s = this.segs[c.seg], path = s.paths[c.br];
      const v = this.speed(c, s, time);
      c.t += (v * dt) / path.len;
      let guard = 0;
      while (c.t >= 1 && guard++ < 4) { c.t -= 1; this.next(c, this.R); if (!c.keepLateral) this.lateral(c); s = this.segs[c.seg]; path = s.paths[c.br]; if (s.clampT) c.t = Math.min(c.t, 0.02); }
      path.at(c.t, _P); path.frame(c.t, _T, _N, _B);
      _P.addScaledVector(_N, c.ox * (s.rn ?? 0)).addScaledVector(_B, c.oy * (s.rb ?? s.rn ?? 0));
      if (this.pos) this.pos(c, s, _P, time);
      c.rot += c.spin * dt * this.tumble;
      _Q.setFromAxisAngle(c.ax, c.rot);
      const sc = this.size * (this.scale ? this.scale(c, s, time) : 1);
      _S.set(sc, sc, sc); _M.compose(_P, _Q, _S); this.mesh.setMatrixAt(c.i, _M);
      if (this.color) { this.color(c, s, _C, time); this.mesh.setColorAt(c.i, _C); }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- geometry helpers
function rbcGeometry(seg = 34) {   // biconcave disc (Evans–Fung profile), radius 1
  const pts = [], N = 18;
  const h = x => 0.5 * Math.sqrt(Math.max(0, 1 - x * x)) * (0.207 + 2.003 * x * x - 1.123 * x ** 4);
  for (let i = 0; i <= N; i++) { const x = Math.sin((i / N) * Math.PI / 2); pts.push(new THREE.Vector2(Math.max(1e-3, x), h(x) + (i === N ? 0 : 0))); }
  for (let i = N - 1; i >= 0; i--) { const x = Math.sin((i / N) * Math.PI / 2); pts.push(new THREE.Vector2(Math.max(1e-3, x), -h(x))); }
  const g = new THREE.LatheGeometry(pts, seg); g.computeVertexNormals(); return g;
}
function rbcProfileShape(R = 1) {    // the dumbbell cross-section, for the cut-open cell
  const h = x => 0.5 * Math.sqrt(Math.max(0, 1 - x * x)) * (0.207 + 2.003 * x * x - 1.123 * x ** 4);
  const s = new THREE.Shape(), N = 40;
  for (let i = 0; i <= N; i++) { const x = -1 + 2 * i / N; (i ? s.lineTo.bind(s) : s.moveTo.bind(s))(x * R, h(Math.abs(x)) * R); }
  for (let i = N; i >= 0; i--) { const x = -1 + 2 * i / N; s.lineTo(x * R, -h(Math.abs(x)) * R); }
  return s;
}
function blobGeometry(r, detail, amp, freq, seed = 1) {   // organic bumpy sphere
  const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, v = V3();
  const R = rng(seed), ph = [R() * 9, R() * 9, R() * 9];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const n = v.clone().normalize();
    const d = Math.sin(n.x * freq + ph[0]) * Math.sin(n.y * freq * 1.3 + ph[1]) * Math.sin(n.z * freq * 0.9 + ph[2]);
    v.addScaledVector(n, d * amp); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
// half of a thick-walled tube along +x, open towards the viewer (+z), so its inside and its wall layers show
function halfShell(rIn, rOut, x0, x1, nx = 72, nth = 28) {
  const pos = [], nor = [], idx = [];
  const rI = typeof rIn === 'function' ? rIn : () => rIn, rO = typeof rOut === 'function' ? rOut : () => rOut;
  const ring = (r, inward) => {
    const base = pos.length / 3;
    for (let i = 0; i <= nx; i++) {
      const x = lerp(x0, x1, i / nx), rr = r(x);
      for (let j = 0; j <= nth; j++) {
        const th = Math.PI * j / nth, y = Math.cos(th) * rr, z = -Math.sin(th) * rr;
        pos.push(x, y, z); const s = inward ? -1 : 1; nor.push(0, s * Math.cos(th), -s * Math.sin(th));
      }
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < nth; j++) {
      const a = base + i * (nth + 1) + j, b = a + nth + 1;
      if (inward) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  };
  ring(rO, false); ring(rI, true);
  // cut faces in the z = 0 plane (top strip y>0 and bottom strip y<0)
  for (const sgn of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= nx; i++) { const x = lerp(x0, x1, i / nx); pos.push(x, sgn * rI(x), 0.0, x, sgn * rO(x), 0.0); nor.push(0, 0, 1, 0, 0, 1); }
    for (let i = 0; i < nx; i++) { const a = base + 2 * i; if (sgn > 0) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  // end caps (half annuli)
  for (const [x, sx] of [[x0, -1], [x1, 1]]) {
    const base = pos.length / 3;
    for (let j = 0; j <= nth; j++) { const th = Math.PI * j / nth; pos.push(x, Math.cos(th) * rI(x), -Math.sin(th) * rI(x), x, Math.cos(th) * rO(x), -Math.sin(th) * rO(x)); nor.push(sx, 0, 0, sx, 0, 0); }
    for (let j = 0; j < nth; j++) { const a = base + 2 * j; if (sx < 0) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}
function tubeColors(geo, fn) {   // vertex colours along a TubeGeometry: fn(t) -> THREE.Color
  const n = geo.parameters.tubularSegments, r = geo.parameters.radialSegments, cols = [];
  for (let i = 0; i <= n; i++) { const c = fn(i / n); for (let j = 0; j <= r; j++) cols.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); return geo;
}
// soft round sprite texture drawn on a canvas (mist, glow)
function softTexture(inner = 'rgba(255,255,255,0.9)') {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, inner); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
