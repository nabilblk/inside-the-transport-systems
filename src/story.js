// ============================================================== the story engine
const ui = {
  nav: $('#chapters'), kicker: $('#kicker'), dots: $('#dots'), title: $('#stepTitle'), text: $('#stepText'), ctl: $('#stepCtl'),
  back: $('#back'), next: $('#next'), legend: $('#legend'), flash: $('#flash'), hint: $('#hint'), loading: $('#loading'), tint: $('#tint'),
};
const store = {
  get() { try { return JSON.parse(localStorage.getItem('ts3d') || '{}'); } catch (e) { return {}; } },
  set(v) { try { localStorage.setItem('ts3d', JSON.stringify(v)); } catch (e) { /* storage may be blocked: the page works without it */ } },
};
const saved = store.get();
const doneSet = new Set(saved.done || []);
let chapters = [], cur = null, ci = -1, si = -1, cleanup = null, check = null, stepCount = 0;

function flash(fn) {
  return new Promise(res => {
    ui.flash.classList.add('on');
    setTimeout(() => { fn(); requestAnimationFrame(() => requestAnimationFrame(() => { ui.flash.classList.remove('on'); res(); })); }, REDUCED ? 60 : 300);
  });
}
function showLabel(l, on) {
  if (!l) return;
  if (on) { l.visible = true; requestAnimationFrame(() => l.userData.el.classList.add('on')); }
  else { l.userData.el.classList.remove('on'); l.visible = false; }
}
function setLabels(keys = []) { if (!cur) return; for (const [k, l] of Object.entries(cur.labels)) showLabel(l, keys.includes(k)); }
const API = { flash, labels: setLabels };

function renderNav() {
  ui.nav.innerHTML = chapters.map((c, i) => `<button data-i="${i}" aria-current="${i === ci}" class="${doneSet.has(c.id) ? 'done' : ''}"><i>${doneSet.has(c.id) ? '✓' : i + 1}</i><span>${c.name}</span></button>`).join('');
  ui.nav.querySelectorAll('button').forEach(b => (b.onclick = () => goChapter(+b.dataset.i)));
  const curBtn = ui.nav.querySelector('[aria-current="true"]'); if (curBtn) curBtn.scrollIntoView({ block: 'nearest', inline: 'center' });
}
function renderLegend() {
  const k = cur.legend, step = cur.steps[si];
  if (step && step.legend) { ui.legend.innerHTML = step.legend.map(([c, t]) => `<div class="key"><i style="background:${c}"></i>${t}</div>`).join(''); blockCache = null; return; }
  blockCache = null;
  ui.legend.innerHTML = k === 'blood'
    ? '<div class="key"><i style="background:var(--oxy)"></i>rich in oxygen</div><div class="key"><i style="background:var(--deoxy)"></i>low in oxygen</div><div class="key note">blue is only a diagram colour</div>'
    : k === 'plant'
      ? '<div class="key"><i style="background:var(--water)"></i>water</div><div class="key"><i style="background:var(--sugar)"></i>sugar</div>'
      : '';
}
function renderDots() {
  ui.dots.innerHTML = cur.steps.map((s, i) => `<button role="tab" aria-label="Step ${i + 1}: ${s.title}" aria-selected="${i === si}" class="${i === si ? 'on' : i < si ? 'seen' : ''}" data-i="${i}"></button>`).join('');
  ui.dots.querySelectorAll('button').forEach(b => (b.onclick = () => goStep(+b.dataset.i)));
}
function nextLabel() {
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
  if (si < cur.steps.length - 1) return 'Next' + arrow;
  if (ci < chapters.length - 1) return `Next: ${chapters[ci + 1].name}` + arrow;
  return 'Back to the start' + arrow;
}
function leaveStep() {
  if (!cur || si < 0) return;
  const s = cur.steps[si];
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  try { s.exit?.(); } catch (e) { console.error(e); }
  check = null; canvas.classList.remove('pickable');
}
function goStep(j, instant = false) {
  j = clamp(j, 0, cur.steps.length - 1);
  leaveStep();
  si = j; const s = cur.steps[j];
  if (stepCount++ > 0) ui.hint.classList.add('gone');
  ui.kicker.textContent = `${cur.name} · step ${j + 1} of ${cur.steps.length}`;
  ui.title.textContent = s.title; ui.text.innerHTML = s.text;
  renderDots();
  ui.back.disabled = ci === 0 && j === 0;
  ui.next.innerHTML = nextLabel();
  setLabels(s.labels || []); cur.glow.set(s.focus || []); renderLegend();
  ui.ctl.innerHTML = '';
  try { s.enter?.(); } catch (e) { console.error(e); }
  if (s.ctl) { try { cleanup = s.ctl(ui.ctl, API) || null; } catch (e) { console.error(e); } }
  if (s.check) startCheck(s);
  layout();
  if (!s.follow) flyTo(s.cam, 1.35, instant);
  store.set({ ci, si, done: [...doneSet] });
}
async function goChapter(i, step = 0, instant = false) {
  if (i === ci) { goStep(step, instant); return; }
  const doSwitch = () => {
    if (cur) {
      leaveStep(); try { cur.exit?.(); } catch (e) { console.error(e); }
      cur.group.visible = false; for (const l of Object.values(cur.labels)) showLabel(l, false);
    }
    ci = i; cur = chapters[i]; cur.group.visible = true; si = -1;
    renderNav(); renderLegend();
    try { cur.enter?.(); } catch (e) { console.error(e); }
    goStep(step, true);
  };
  if (instant || !cur) doSwitch(); else await flash(doSwitch);
}
function next() { if (si < cur.steps.length - 1) goStep(si + 1); else goChapter((ci + 1) % chapters.length); }
function back() { if (si > 0) goStep(si - 1); else if (ci > 0) goChapter(ci - 1, chapters[ci - 1].steps.length - 1); }
ui.next.onclick = next; ui.back.onclick = back;
$('#resetView').onclick = () => { const s = cur.steps[si]; if (s.follow) return; flyTo(CAM.home || s.cam, 1.0); };

// ---- quick checks: tap the model
function startCheck(s) {
  check = { s, done: false };
  ui.ctl.innerHTML = '<div class="tap"><i></i>Tap your answer on the model</div>';
  canvas.classList.add('pickable');
}
function answer(key) {
  const s = check.s, ok = key === s.check.answer;
  ui.ctl.innerHTML = `<div class="check ${ok ? 'good' : 'bad'}"><span class="ck">${ok ? 'Correct' : 'Not quite'}</span>${ok ? s.check.yes : s.check.no}</div>`
    + (ok ? '' : '<div class="row"><button class="btn small" id="retry">Try again</button></div>');
  setLabels(s.labelsAfter || []);
  if (ok) { check.done = true; canvas.classList.remove('pickable'); doneSet.add(cur.id); renderNav(); store.set({ ci, si, done: [...doneSet] }); }
  else { check.done = true; canvas.classList.remove('pickable'); ui.ctl.querySelector('#retry').onclick = () => { setLabels([]); startCheck(s); layout(); }; }
  layout();
}

// ---- tapping the model
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; canvas.classList.add('grabbing'); ui.hint.classList.add('gone'); });
window.addEventListener('pointerup', e => {
  canvas.classList.remove('grabbing');
  if (!down) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
  if (d > 7 || dt > 700 || e.target !== canvas) return;
  const s = cur && cur.steps[si]; if (!s) return;
  const objs = check && !check.done ? (s.check.pick || s.check.pickFn()) : s.pickAny ? s.pickAny() : null;
  if (!objs) return;
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(objs, false)[0];
  if (!hit) return;
  const key = hit.object.userData.pick;
  if (check && !check.done) answer(key); else if (cur.onPick) cur.onPick(key);
});
window.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input')) return;
  if (e.key === 'ArrowRight') { next(); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { back(); e.preventDefault(); }
  else if (/^[1-5]$/.test(e.key)) goChapter(+e.key - 1);
});
window.addEventListener('resize', () => { layout(); const s = cur && cur.steps[si]; if (s && !s.follow && !CAM.busy) flyTo(CAM.home || s.cam, 0, true); });
new ResizeObserver(() => layout()).observe(cardEl);
setTimeout(() => ui.hint.classList.add('gone'), 12000);

// ---- boot
const pad = (r, p = 6) => ({ x0: r.left - p, x1: r.right + p, y0: r.top - p, y1: r.bottom + p });
let blockCache = null, blockAt = 0;
function blockers() {   // screen areas labels must not cover (refreshed a few times a second)
  const now = performance.now();
  if (blockCache && now - blockAt < 250) return blockCache;
  blockAt = now;
  blockCache = [cardEl, ui.nav, $('#resetView'), ...ui.legend.children].filter(e => e && e.offsetParent !== null).map(e => pad(e.getBoundingClientRect()));
  return blockCache;
}
window.addEventListener('resize', () => { for (const l of LABELS) l.userData.pw = 0; blockCache = null; });
document.fonts?.ready.then(() => { for (const l of LABELS) l.userData.pw = 0; blockCache = null; });   // label sizes change when the web fonts arrive
const clock = new THREE.Clock();
let fpsT = 0, fpsN = 0; const quality = { ups: 0 };
function frame() {
  requestAnimationFrame(frame);
  const real = Math.min(0.1, clock.getDelta());           // camera moves keep real time, even on a slow device
  const dt = Math.min(0.05, real) * (REDUCED ? 0.6 : 1), t = clock.elapsedTime;
  runTweens(real); TINT.update(real);
  if (cur) { try { cur.update(dt, t); } catch (e) { console.error(e); } cur.glow.update(dt, t); }
  controls.enabled = !CAM.follow;
  controls.update();
  renderer.render(scene, camera); labelRenderer.render(scene, camera);
  layoutLabels(blockers());
  fpsN++; fpsT += real;
  if (fpsT > 1.5) {
    const fps = fpsN / fpsT; window.__fps = Math.round(fps); fpsN = 0; fpsT = 0;
    // keep it smooth on modest laptops: render fewer pixels when frames drop, more when there is headroom
    const pr = renderer.getPixelRatio(), maxPr = Math.min(devicePixelRatio || 1, 2);
    if (!document.hidden && fps < 38 && pr > 0.75) { renderer.setPixelRatio(Math.max(0.75, pr - 0.25)); layout(); }
    else if (fps > 57 && pr < maxPr && quality.ups < 3) { renderer.setPixelRatio(Math.min(maxPr, pr + 0.25)); quality.ups++; layout(); }
  }
}
function boot() {
  chapters = [chLoop(), chBlood(), chVessels(), chHeart(), chPlants()];
  for (const c of chapters) {
    scene.add(c.group); c.group.visible = false;
    c.showLabel = (k, on) => { if (c === cur) showLabel(c.labels[k], on); };
    c.bindApi?.(API);
  }
  layout();
  const fromHash = chapters.findIndex(c => '#' + c.id === location.hash);
  const startCh = fromHash >= 0 ? fromHash : clamp(saved.ci ?? 0, 0, chapters.length - 1);
  const startSt = fromHash >= 0 ? 0 : clamp(saved.si ?? 0, 0, chapters[startCh].steps.length - 1);
  goChapter(startCh, startSt, true);
  renderer.compile(scene, camera);
  frame();
  setTimeout(() => ui.loading.classList.add('gone'), 120);
  setTimeout(() => { ui.loading.hidden = true; }, 900);   // gone for good, even if the fade could not run
  window.__ready = true;
}
// #region dev-only test hooks: used by the headless test bench, removed by `npm run build`
window.__go = (c, s) => goChapter(c, s, true);
window.__notrans = () => document.head.insertAdjacentHTML('beforeend', '<style>*{transition:none!important}</style>');   // test hook
window.__ff = secs => { let t = clock.elapsedTime; for (let i = 0; i < secs / 0.05; i++) { t += 0.05; runTweens(0.05); cur.update(0.05, t); cur.glow.update(0.05, t); } };   // test hook: fast-forward the animations
window.__step = s => goStep(s, true);
window.__state = () => ({ ci, si });
window.__tapAt = key => {   // test hook: where on screen is a quick-check answer?
  const s = cur.steps[si], objs = s.check ? (s.check.pick || s.check.pickFn()) : [];
  const o = objs.find(m => m.userData.pick === key); if (!o) return null;
  const v = new THREE.Vector3(); new THREE.Box3().setFromObject(o).getCenter(v); v.project(camera);
  const r = canvas.getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
};
window.__tap = (x, y) => { for (const t of ['pointerdown', 'pointerup']) canvas.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, pointerId: 1 })); };
window.CAMDBG = () => JSON.stringify({tok: CAM.token, busy: CAM.busy, follow: CAM.follow, tw: tweens.size, cam: camera.position.toArray().map(v=>+v.toFixed(2)), tgt: controls.target.toArray().map(v=>+v.toFixed(2)), en: controls.enabled});
// #endregion dev-only test hooks
try { boot(); } catch (e) { console.error(e); document.getElementById('loadMsg').textContent = 'Something went wrong while building the 3D models: ' + e.message; }
