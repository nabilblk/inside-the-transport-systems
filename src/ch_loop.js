// ============================================================== chapter 1: the big picture (double circulation)
function chLoop() {
  const ch = { id: 'loop', name: 'Big picture', group: new THREE.Group(), glow: new Glow(), legend: 'blood', labels: {} };
  const G = ch.group, S = 0.07;
  const H = heartModel(); H.group.scale.setScalar(S); H.group.position.set(0, 0, -5 * S); G.add(H.group);
  const hw = p => V3((p[0] - 40) * S, (45 - p[1]) * S, (p[2] - 5) * S);
  ch.heart = H;

  // ---- organs
  const lungMat = glass('#F49CA3', { opacity: 0.34, power: 1.6, base: 0.22 });
  const lobes = [];
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(blobGeometry(1, 4, 0.05, 7, sx > 0 ? 3 : 5), lungMat);
    m.scale.set(1.9, 2.35, 1.25); m.position.set(sx * 2.15, 8.95, -0.6); G.add(m); lobes.push(m);
  }
  const airMat = glass('#E9EEF7', { opacity: 0.5, power: 1.4, base: 0.3 });
  const trachea = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 12.7, -0.6), V3(0, 10.9, -0.6), V3(0, 10.5, -0.6)]), 12, 0.2, 14), airMat); G.add(trachea);
  for (const sx of [-1, 1]) G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 10.6, -0.6), V3(sx * 0.7, 10.1, -0.6), V3(sx * 1.5, 9.7, -0.6)]), 12, 0.13, 12), airMat));
  ch.glow.add('lungs', lungMat);

  const bodyShell = glass('#F1B9AD', { opacity: 0.3, power: 1.7, base: 0.18 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(9.8, 3.3, 2.5, 4, 0.6), bodyShell); body.position.set(0, -8.15, -0.25); G.add(body);
  const cellMat = tissue(C.tissue, { roughness: 0.55, clearcoat: 0.3, emissive: col('#FF8A5C'), emissiveIntensity: 0 });
  const bodyCells = new THREE.InstancedMesh(new RoundedBoxGeometry(0.66, 0.66, 0.5, 2, 0.16), cellMat, 36);
  { let i = 0; const m = new THREE.Matrix4(); for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) { m.makeTranslation(-4.4 + c * 0.8 + (r % 2) * 0.25, -9.2 + r * 0.95, -1.05); bodyCells.setMatrixAt(i++, m); } }
  G.add(bodyCells);
  ch.glow.add('body', bodyShell);

  // ---- vessel paths in world units
  const L0 = V3(-3.6, 8.45, -0.55), L1 = V3(3.6, 8.45, -0.55), B0 = V3(3.7, -8.05, -0.15), B1 = V3(-3.7, -8.05, -0.15);
  const P = {
    vcOut: [B1, V3(-4.45, -6.6, -0.1), V3(-4.95, -3.6, 0), V3(-4.85, -0.5, 0), V3(-4.5, 0.85, 0), hw([-18, 29.5, 5])],
    paOut: [hw([12, 6, 5]), V3(-3.4, 2.86, 0), V3(-4.55, 3.6, -0.2), V3(-5.0, 5.6, -0.4), V3(-4.6, 7.4, -0.5), L0],
    pvOut: [L1, V3(4.6, 7.4, -0.5), V3(5.0, 5.6, -0.5), V3(4.95, 3.3, -0.4), V3(4.6, 1.6, -0.15), hw([98, 29.5, 5])],
    aoOut: [hw([82, 11, 5]), V3(3.1, 2.0, -0.9), V3(2.4, 1.3, -2.15), V3(1.6, -0.4, -2.35), V3(1.2, -2.2, -2.2), V3(1.9, -3.6, -1.6), V3(3.2, -5.0, -1.0), V3(4.0, -6.5, -0.55), B0],
  };
  const R = rng(11);
  const lungBranches = [], bodyBranches = [];
  for (let k = 0; k < 9; k++) {
    const a = -1.45 + 2.9 * (k / 8), z = -1.2 + R() * 1.2;
    lungBranches.push(new Path([L0, V3(-2.5, 8.6 + a * 0.9, z), V3(-1.1, 9.1 + a * 1.05, z - 0.15), V3(1.1, 9.1 + a * 1.05, z - 0.15), V3(2.5, 8.6 + a * 0.9, z), L1]));
  }
  for (let k = 0; k < 9; k++) {
    const a = -1.0 + 2.0 * (k / 8), z = -0.25 + R() * 0.6;
    bodyBranches.push(new Path([B0, V3(2.6, -8.1 + a * 1.1, z), V3(0.9, -8.1 + a * 1.25, z + 0.1), V3(-0.9, -8.1 + a * 1.25, z + 0.1), V3(-2.6, -8.1 + a * 1.1, z), B1]));
  }
  const seg = (pts, rn, rb, o = {}) => ({ paths: [new Path(pts, o)], rn, rb: rb ?? rn, ...o });
  const SEG = [
    seg(P.vcOut, 0.13), seg(HP.vc.map(hw), 0.13),
    seg(HP.ra.map(hw), 0.38, 0.19), seg(HP.rv.map(hw), 0.36, 0.19),
    seg(HP.pa.map(hw), 0.12), seg(P.paOut, 0.12),
    { paths: lungBranches, rn: 0, rb: 0 },
    seg(P.pvOut, 0.13), seg(HP.pv.map(hw), 0.13),
    seg(HP.la.map(hw), 0.38, 0.19), seg(HP.lv.map(hw), 0.36, 0.19),
    seg(HP.ao.map(hw), 0.12), seg(P.aoOut, 0.12),
    { paths: bodyBranches, rn: 0, rb: 0 },
  ];
  const KIND = ['v', 'v', 'h', 'h', 'a', 'a', 'c', 'v', 'v', 'h', 'h', 'a', 'a', 'c'];
  const STOP = [0, 0, 1, 2, 3, 3, 4, 5, 5, 6, 7, 8, 8, 9];
  SEG.forEach((s, i) => { s.kind = KIND[i]; s.i = i; });

  // ---- vessel tubes
  const vesR = H.mats.vesR.clone(), vesL = H.mats.vesL.clone();
  const tube = (pts, m, r = 0.245) => { const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 80, r, 16), m); t.renderOrder = 3; G.add(t); return t; };
  tube(P.vcOut, vesR); tube(P.paOut, vesR); tube(P.pvOut, vesL); tube(P.aoOut, vesL);
  const chevGeo = new THREE.ConeGeometry(0.2, 0.42, 18); chevGeo.translate(0, 0.21, 0);
  const chevMat = { R: tissue(C.deoxy, { roughness: 0.35, clearcoat: 0.8 }), L: tissue(C.oxy, { roughness: 0.35, clearcoat: 0.8 }) };
  for (const [pts, side, ts] of [[P.vcOut, 'R', [0.3, 0.68]], [P.paOut, 'R', [0.55]], [P.pvOut, 'L', [0.45]], [P.aoOut, 'L', [0.8]]]) {
    const cv = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    for (const t of ts) { const m = new THREE.Mesh(chevGeo, chevMat[side]); m.position.copy(cv.getPointAt(t)); m.quaternion.setFromUnitVectors(V3(0, 1, 0), cv.getTangentAt(t)); m.renderOrder = 4; G.add(m); }
  }
  ch.glow.add('vR', vesR, H.mats.vesR); ch.glow.add('vL', vesL, H.mats.vesL);
  const capMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, clearcoat: 0.6, transparent: true, opacity: 0.55, depthWrite: false });
  const cD = col(C.deoxy), cO = col(C.oxy), tmpC = new THREE.Color();
  for (const p of lungBranches) { const g = new THREE.TubeGeometry(p.curve, 64, 0.075, 8); tubeColors(g, t => tmpC.lerpColors(cD, cO, sstep(0.15, 0.6, t)).clone()); const m = new THREE.Mesh(g, capMat); m.renderOrder = 2; G.add(m); }
  for (const p of bodyBranches) { const g = new THREE.TubeGeometry(p.curve, 64, 0.075, 8); tubeColors(g, t => tmpC.lerpColors(cO, cD, sstep(0.3, 0.75, t)).clone()); const m = new THREE.Mesh(g, capMat); m.renderOrder = 2; G.add(m); }

  // ---- the blood itself
  const SPEED = { a: 2.5, v: 1.6, h: 1.15, c: 0.7 };
  const st = { hr: 72, flowK: 1, p: 0, breath: 0, follow: false, slow: 1 };
  const sv = h => 70 + clamp((h - 72) * 0.45, 0, 48);
  const oxyOf = (s, t) => (s.i <= 5 ? 0 : s.i === 6 ? sstep(0.15, 0.6, t) : s.i <= 12 ? 1 : 1 - sstep(0.3, 0.75, t));
  const speedOf = (s, c) => {
    let v = SPEED[s.kind] * st.flowK * st.slow * (c ? c.j : 1);
    if (s.kind === 'a') v *= 0.55 + 0.95 * H.beat.uV.value;
    return v;
  };
  const nextSeg = (c, Rr) => { c.seg = (c.seg + 1) % SEG.length; c.br = SEG[c.seg].paths.length > 1 ? Math.floor(Rr() * SEG[c.seg].paths.length) : 0; };
  const squeeze = (s, P3) => { if (s.kind !== 'h') return; const p = { x: P3.x / S, y: P3.y / S }; squeezePoint(p, H.beat.uA.value, H.beat.uV.value); P3.x = p.x * S; P3.y = p.y * S; };
  const transit = SEG.map(s => s.paths[0].len / SPEED[s.kind]), total = transit.reduce((a, b) => a + b, 0);
  const rbcGeo = rbcGeometry();
  const rbcMat = new THREE.MeshPhysicalMaterial({ roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.3, sheen: 0.3, sheenColor: col('#ffffff') });
  const flow = new Flow({
    parent: G, count: 620, geometry: rbcGeo, material: rbcMat, size: 0.1, seed: 4, segs: SEG,
    init: (c, Rr) => { let u = Rr() * total, i = 0; while (u > transit[i] && i < SEG.length - 1) { u -= transit[i]; i++; } c.seg = i; c.t = u / transit[i]; c.br = SEG[i].paths.length > 1 ? Math.floor(Rr() * SEG[i].paths.length) : 0; },
    next: nextSeg, speed: (c, s) => speedOf(s, c),
    color: (c, s, out) => out.lerpColors(cD, cO, oxyOf(s, c.t)),
    pos: (c, s, P3) => squeeze(s, P3),
  });

  // ---- one cell to follow
  const heroMat = rbcMat.clone(); heroMat.emissive = col('#ffffff'); heroMat.emissiveIntensity = 0.12;
  heroMat.depthTest = false; heroMat.transparent = true;   // drawn on top of the vessel walls, so it is never hidden
  const hero = new THREE.Mesh(rbcGeo, heroMat); hero.scale.setScalar(0.3); hero.visible = false; hero.renderOrder = 12; G.add(hero);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 56), new THREE.MeshBasicMaterial({ color: '#FFB81F', transparent: true, opacity: 1, depthTest: false, side: THREE.DoubleSide }));
  ring.renderOrder = 13; ring.visible = false; G.add(ring);
  const ringEdge = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.67, 56), new THREE.MeshBasicMaterial({ color: '#141D36', transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide }));
  ringEdge.renderOrder = 13; ring.add(ringEdge);
  const haloS = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture('rgba(255,184,31,0.75)'), transparent: true, depthTest: false, opacity: 0.7 }));
  haloS.scale.setScalar(2.0); haloS.renderOrder = 10; haloS.visible = false; G.add(haloS);
  const NTR = 34, trail = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthTest: false }), NTR);
  trail.renderOrder = 9; trail.frustumCulled = false; trail.visible = false; G.add(trail);
  const trailPts = []; for (let i = 0; i < NTR; i++) trail.setColorAt(i, col('#ffffff'));
  const heroLabel = label('this cell', { tone: 'follow nodot', dx: 0, dy: -38 }); G.add(heroLabel);
  const H_ = { seg: 0, t: 0, br: 0, stop: -1, pos: V3(), smooth: V3(), dist: 6 };
  const tmpP = V3(), tmpT = V3(), tmpN = V3(), tmpB = V3();
  function heroUpdate(dt) {
    const s = SEG[H_.seg]; const path = s.paths[H_.br];
    H_.t += (speedOf(s) * dt) / path.len;
    while (H_.t >= 1) { H_.t -= 1; H_.seg = (H_.seg + 1) % SEG.length; H_.br = SEG[H_.seg].paths.length > 1 ? 4 : 0; }
    const s2 = SEG[H_.seg]; s2.paths[H_.br].at(H_.t, tmpP); squeeze(s2, tmpP);
    hero.position.copy(tmpP); ring.position.copy(tmpP); haloS.position.copy(tmpP); heroLabel.position.copy(tmpP);
    hero.rotation.x += dt * 0.9; hero.rotation.y += dt * 0.6;
    heroMat.color.lerpColors(cD, cO, oxyOf(s2, H_.t));
    ring.quaternion.copy(camera.quaternion); ring.scale.setScalar(1 + 0.08 * Math.sin(performance.now() / 260));
    H_.pos.copy(tmpP);
    trailPts.unshift(tmpP.clone()); if (trailPts.length > NTR * 3) trailPts.length = NTR * 3;
    for (let i = 0; i < NTR; i++) {
      const p = trailPts[Math.min(trailPts.length - 1, i * 3)], k = 1 - i / NTR;
      _M.compose(p, _Q.identity(), _S.setScalar(0.085 * k + 0.01)); trail.setMatrixAt(i, _M); trail.setColorAt(i, _C.copy(heroMat.color).lerp(col('#ffffff'), 0.25));
    }
    trail.instanceMatrix.needsUpdate = true; trail.instanceColor.needsUpdate = true;
    const stop = STOP[H_.seg];
    if (stop !== H_.stop) { H_.stop = stop; setLabelText(heroLabel, STOPS[stop][0]); if (ch.onStop) ch.onStop(stop); }
  }
  const STOPS = [
    ['vena cava', 'deoxy', 'Back from the body, low in oxygen.'],
    ['right atrium', 'deoxy', 'Collects blood coming back from the body.'],
    ['right ventricle', 'deoxy', 'Squeezes it out to the lungs.'],
    ['pulmonary artery', 'deoxy', 'Carries it to the lungs.'],
    ['lung capillaries', 'mix', 'Oxygen diffuses in. The cell is now rich in oxygen (shown red).'],
    ['pulmonary vein', 'oxy', 'Brings it back to the heart, full of oxygen.'],
    ['left atrium', 'oxy', 'Collects blood coming back from the lungs.'],
    ['left ventricle', 'oxy', 'Gives the strongest squeeze: out to the whole body.'],
    ['aorta', 'oxy', 'The biggest artery, carrying blood to the body.'],
    ['body capillaries', 'mix', 'Oxygen diffuses out to the cells. The cell is now low in oxygen (shown blue).'],
  ];

  // ---- labels
  const L = (key, text, pos, o) => { const l = label(text, o); l.position.copy(pos); G.add(l); ch.labels[key] = l; };
  L('heart', 'heart', V3(0.6, -2.6, 0.5), { dx: 84, dy: 30 });
  L('lungs', 'lungs', V3(3.4, 10.4, -0.2), { dx: 64, dy: -26 });
  L('body', 'body cells', V3(3.9, -8.6, 0.9), { dx: 56, dy: 40, sub: 'muscles, brain, every organ' });
  L('pa', 'pulmonary artery', V3(-4.95, 5.4, -0.4), { tone: 'deoxy', dx: -82, dy: 0 });
  L('pv', 'pulmonary vein', V3(4.98, 5.4, -0.5), { tone: 'oxy', dx: 80, dy: 0 });
  L('ao', 'aorta', V3(3.6, -3.0, -1.2), { tone: 'oxy', dx: 72, dy: 0 });
  L('vc', 'vena cava', V3(-4.95, -3.0, 0), { tone: 'deoxy', dx: -70, dy: 0 });
  L('sideR', 'Right side', V3(-1.65, 3.7, 0.4), { tone: 'side nodot', dx: 0, dy: -8 });
  L('sideL', 'Left side', V3(1.65, 3.7, 0.4), { tone: 'side nodot', dx: 0, dy: -8 });
  L('lungCap', 'capillaries in the lungs', V3(0, 7.55, -0.3), { dx: 0, dy: 70, sub: 'oxygen in, carbon dioxide out' });
  L('bodyCap', 'capillaries in the body', V3(0, -7.2, 0.1), { dx: 0, dy: -64, sub: 'oxygen out to the cells' });
  ch.glow.add('heart', H.mats.side, H.mats.cut);

  // ---- pick hulls for the quick check
  const hullR = hull(new THREE.BoxGeometry(2.9, 6.6, 1.6), 'right', G, V3(-1.5, 0.1, 0)); hullR.visible = false;
  const hullL = hull(new THREE.BoxGeometry(2.9, 6.6, 1.6), 'left', G, V3(1.5, 0.1, 0)); hullL.visible = false;

  ch.update = (dt, time) => {
    const period = 60 / st.hr;
    st.p = (st.p + (dt * st.slow) / period) % 1;
    H.update(dt, st.p);
    st.breath += (dt * st.slow * (12 + (st.hr - 72) * 0.22)) / 60;
    const b = 1 + 0.045 * Math.sin(st.breath * TAU);
    for (const l of lobes) l.scale.set(1.9 * b, 2.35 * b, 1.25 * b);
    const ex = clamp((st.hr - 72) / 100, 0, 1);
    cellMat.emissiveIntensity = ex * (0.18 + 0.1 * Math.sin(time * 6));
    flow.update(dt, time);
    if (st.follow) {
      heroUpdate(dt);
      const stop = STOP[H_.seg];
      const want = fitDistance(8.5, [1, 2, 6, 7].includes(stop) ? 8.5 : 10.5, 1.0);
      H_.dist += (want - H_.dist) * (1 - Math.exp(-dt * 1.2));
      // follow the cell, but lean towards the middle of the loop so the organs stay in the picture
      const k = 1 - Math.exp(-dt * 1.8);
      H_.smooth.lerp(V3(H_.pos.x * 0.55, H_.pos.y * 0.8 + 0.3, -0.3), k);
      controls.target.copy(H_.smooth);
      const dir = camera.position.clone().sub(controls.target).normalize();
      dir.lerp(V3(0.12, 0.12, 1).normalize(), 1 - Math.exp(-dt * 0.8)).normalize();
      camera.position.copy(controls.target).addScaledVector(dir, H_.dist);
    }
  };
  function setFollow(on) {
    st.follow = on; hero.visible = ring.visible = haloS.visible = trail.visible = on; heroLabel.visible = on; heroLabel.userData.el.classList.toggle('on', on);
    st.slow = on ? 0.55 : 1;
    if (on) {
      H_.seg = 0; H_.t = 0.15; H_.br = 0; H_.stop = -1; trailPts.length = 0; heroUpdate(0);
      H_.smooth.copy(controls.target); H_.dist = camera.position.distanceTo(controls.target); CAM.token++; CAM.follow = true;
    } else CAM.follow = null;
  }
  function setHR(v) { st.hr = v; st.flowK = (v / 72) * (sv(v) / sv(72)); }
  ch.exit = () => { setFollow(false); setHR(72); };

  const overview = { t: [0, 1.6, -0.3], dir: [0.16, 0.1, 1], w: 13, h: 23 };
  ch.steps = [
    {
      title: 'One loop, through the heart twice',
      text: 'Blood travels round your body in a loop. On every trip it passes through your <b>heart twice</b>: once on the way to the <b>lungs</b>, once on the way to the <b>body</b>.',
      cam: overview, labels: ['heart', 'lungs', 'body'], focus: [],
    },
    {
      title: 'In the lungs, blood picks up oxygen',
      text: 'Blood arrives at the lungs <span class="t-deoxy">blue: low in oxygen</span>. In the tiny capillaries, oxygen diffuses in and it leaves <span class="t-oxy">red: rich in oxygen</span>. Blue is only a diagram colour: real blood is always red.',
      cam: { t: [0, 6.2, -0.4], dir: [0.12, 0.14, 1], w: 15.5, h: 9.8 }, labels: ['pa', 'pv', 'lungCap'], focus: ['lungs'],
    },
    {
      title: 'In the body, the cells take the oxygen',
      text: 'The left side of the heart pumps <span class="t-oxy">oxygen-rich blood</span> down the aorta. In the body\'s capillaries, oxygen and glucose diffuse into the cells, and the blood returns <span class="t-deoxy">low in oxygen</span> through the vena cava.',
      cam: { t: [0, -4.6, -0.3], dir: [0.14, 0.1, 1], w: 15, h: 11 }, labels: ['ao', 'vc', 'bodyCap'], focus: ['body'],
    },
    {
      title: 'Follow one red blood cell',
      text: 'Watch the glowing cell. The list lights up each place on its journey as the cell gets there. Notice when it changes colour.',
      cam: overview, labels: [], focus: [], follow: true,
      ctl: (el) => {
        el.innerHTML = `<div class="route">${STOPS.map(([n, c], i) => `<span class="${c}" data-i="${i}">${n}</span>`).join('')}</div><p class="narr"><em>Now</em><span id="narrTxt">Starting in the vena cava…</span></p>`
          + `<div class="row"><button class="btn small" id="restartCell">Start again</button></div>`;
        const chips = [...el.querySelectorAll('.route span')], narr = el.querySelector('#narrTxt');
        ch.onStop = i => { chips.forEach((c, k) => { c.classList.toggle('now', k === i); c.classList.toggle('done', k < i); }); narr.textContent = `${STOPS[i][0][0].toUpperCase()}${STOPS[i][0].slice(1)}: ${STOPS[i][2]}`; };
        el.querySelector('#restartCell').onclick = () => setFollow(true);
        setFollow(true);
        return () => { ch.onStop = null; setFollow(false); };
      },
    },
    {
      title: 'Exercise: the heart speeds up',
      text: 'Drag the slider. Working muscles respire faster, so they need more oxygen and glucose. The heart beats faster and harder, and more blood reaches them every minute.',
      cam: overview, labels: ['heart', 'body'], focus: ['body'],
      ctl: (el) => {
        el.innerHTML = `<div class="slider"><label for="hr">Heart rate <span id="hrv">72</span></label><input id="hr" type="range" min="60" max="180" step="1" value="72"></div>`
          + `<div class="readout"><div><b id="o1">72</b><span>beats per minute</span></div><div><b id="o2">5.0</b><span>litres of blood pumped per minute</span></div></div>`
          + `<p class="mini">Resting is about 60 to 80 beats per minute. A sprint can push it past 170.</p>`;
        const r = el.querySelector('#hr');
        const upd = () => { const v = +r.value; setHR(v); el.querySelector('#hrv').textContent = v; el.querySelector('#o1').textContent = v; el.querySelector('#o2').textContent = ((v * sv(v)) / 1000).toFixed(1); };
        r.oninput = upd; upd();
        return () => setHR(72);
      },
    },
    {
      title: 'Quick check',
      text: 'Tap the side of the heart that pumps blood <b>to the lungs</b>.',
      cam: { t: [0, 0.4, 0], dir: [0.06, 0.08, 1], w: 11, h: 9 }, labels: [], focus: [],
      check: { answer: 'right', pick: [hullR, hullL],
        yes: 'Yes: the <b>right side</b>. It looks like it is on your left because the heart faces you, the way a person would.',
        no: 'The side that pumps to the lungs is the <b>right side</b>. It is on your left in the picture because the heart faces you.' },
      labelsAfter: ['sideR', 'sideL'],
    },
  ];
  return ch;
}
