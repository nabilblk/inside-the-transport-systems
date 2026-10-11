// ============================================================== chapter 4: inside the heart
function chHeart() {
  const ch = { id: 'heart', name: 'Heart', group: new THREE.Group(), glow: new Glow(), legend: 'blood', labels: {} };
  const G = ch.group, S0 = 0.1;
  const H = heartModel(); H.group.scale.setScalar(S0); H.group.position.set(0, 0, -5 * S0); G.add(H.group);
  Object.assign(ch.labels, H.labels);
  ch.glow.add('ra', H.mats.floorR); ch.glow.add('rv', H.mats.floorR); ch.glow.add('la', H.mats.floorL); ch.glow.add('lv', H.mats.floorL);
  ch.glow.add('valves', H.mats.valve); ch.glow.add('muscle', H.mats.side, H.mats.cut);
  ch.glow.add('sideR', H.mats.volR, H.mats.vesR); ch.glow.add('sideL', H.mats.volL, H.mats.vesL);

  // ---- blood inside the heart, moving only when the valves allow it
  const st = { p: 0.55, T: 3.2, slow: true };
  const segs = [HP.vc, HP.ra, HP.rv, HP.pa, HP.pv, HP.la, HP.lv, HP.ao].map((pts, i) => ({
    paths: [new Path(pts.map(hl), { density: 1.2 })], i,
    rn: [2.2, 6.0, 5.4, 2.0, 2.2, 6.0, 5.4, 2.0][i], rb: [2.2, 3.0, 3.1, 2.0, 2.2, 3.0, 3.1, 2.0][i],
    kind: ['in', 'atrium', 'ventricle', 'out', 'in', 'atrium', 'ventricle', 'out'][i],
  }));
  const N = 260;
  const flow = new Flow({
    parent: H.group, count: N, geometry: rbcGeometry(), material: new THREE.MeshPhysicalMaterial({ roughness: 0.36, clearcoat: 0.75, sheen: 0.3 }), size: 1.6, seed: 12, segs,
    init: (c, R) => { const left = c.i >= N / 2; const r = R(); const s = r < 0.18 ? 0 : r < 0.45 ? 1 : r < 0.8 ? 2 : 3; c.seg = s + (left ? 4 : 0); c.t = s === 1 || s === 2 ? R() * c.slot : R(); },
    next: c => { c.seg = c.seg === 3 ? 0 : c.seg === 7 ? 4 : c.seg + 1; c.br = 0; },
    speed: (c, s) => {
      const b = H.state.b, T = st.T, L = s.paths[0].len;
      if (s.kind === 'in') return L / (0.9 * T);
      if (s.kind === 'atrium') { if (b.avOpen) return b.phase === 0 ? L / (0.11 * T) : L / (0.48 * T); return c.t < c.slot ? L / (0.6 * T) : 0; }
      if (s.kind === 'ventricle') { if (b.slOpen) return L / (0.2 * T); return c.t < c.slot ? L / (0.42 * T) : 0; }
      return b.phase === 1 ? L / (0.42 * T) : L / (1.5 * T);
    },
    color: (c, s, out) => out.set(s.i < 4 ? C.deoxy : C.oxy),
    scale: (c, s) => (s.kind === 'in' ? sstep(0, 0.18, c.t) : s.kind === 'out' ? 1 - sstep(0.8, 1, c.t) : 1),
    pos: (c, s, P) => { if (s.kind === 'atrium' || s.kind === 'ventricle') squeezePoint(P, H.beat.uA.value, H.beat.uV.value); },
  });

  // ---- 'lub' and 'dub'
  const lub = label('lub', { tone: 'pop nodot', dx: 0, dy: 0, fixed: true }); lub.position.copy(hl([40, 50, 14])); H.group.add(lub);
  const dub = label('dub', { tone: 'pop nodot', dx: 0, dy: 0, fixed: true }); dub.position.copy(hl([40, 31, 14])); H.group.add(dub);
  const sound = { lub: 0, dub: 0, on: false, ui: null };
  H.state.onLub = () => { sound.lub = 0.5; };
  H.state.onDub = () => { sound.dub = 0.5; };

  // ---- a see-through person, to sort out left and right
  const ghostMat = glass('#7F93C4', { opacity: 0.7, power: 1.3, base: 0.3 });
  const person = new THREE.Group(); person.visible = false; G.add(person);
  const part = (geo, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, ghostMat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); person.add(m); return m; };
  part(new THREE.SphereGeometry(2.0, 32, 24), 0, 9.6, 0); part(new THREE.CylinderGeometry(0.8, 0.95, 1.4, 20), 0, 7.4, 0);
  part(new THREE.CapsuleGeometry(3.7, 6.2, 10, 28), 0, 1.6, 0).scale.set(1.12, 1, 0.62);
  for (const s of [1, -1]) {
    part(new THREE.CapsuleGeometry(0.95, 5.4, 8, 16), s * 5.2, 2.6, 0, 0, s * 0.18);
    part(new THREE.CapsuleGeometry(0.8, 4.8, 8, 16), s * 6.15, -3.3, 0.5, -0.12, s * 0.06);
    part(new THREE.SphereGeometry(0.95, 16, 12), s * 6.35, -6.4, 0.7);
  }
  // a face, so it is obvious which way the person is facing
  const faceMat = new THREE.MeshStandardMaterial({ color: '#2B3555', roughness: 0.6 });
  const face = new THREE.Group(); person.add(face);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), faceMat); e.position.set(s * 0.62, 9.95, 1.86); face.add(e); }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 24, Math.PI), faceMat); smile.position.set(0, 9.05, 1.82); smile.rotation.z = Math.PI; face.add(smile);
  // hair on the back of the head: what you see when you walk round behind
  const hair = new THREE.Mesh(new THREE.SphereGeometry(2.08, 32, 16, Math.PI, Math.PI, 0, Math.PI * 0.62), new THREE.MeshStandardMaterial({ color: '#3B2C2A', roughness: 0.8 }));
  hair.position.set(0, 9.6, 0); person.add(hair);
  const Lp = (key, text, pos, o) => { const l = label(text, o); l.position.copy(pos); person.add(l); ch.labels[key] = l; };
  Lp('theirR', 'their RIGHT hand', V3(-6.35, -6.4, 0.7), { tone: 'deoxy', dx: -10, dy: 46 });
  Lp('theirL', 'their LEFT hand', V3(6.35, -6.4, 0.7), { tone: 'oxy', dx: 10, dy: 46 });
  // small side labels that stay readable when the heart is shrunk into the chest
  for (const [k, txt, X, dx, tone] of [['pR', 'right side of the heart', 17, -140, 'deoxy'], ['pL', 'left side of the heart', 63, 140, 'oxy']]) {
    const l = label(txt, { tone, dx, dy: -6 }); l.position.copy(hl([X, 55, 10])); H.group.add(l); ch.labels[k] = l;
  }
  const pose = { inBody: 0 };
  function setInBody(k) {
    pose.inBody = k;
    const s = lerp(S0, 0.03, k);
    H.group.scale.setScalar(s); H.group.position.set(lerp(0, 0.9, k), lerp(0, 3.2, k), lerp(-5 * S0, 0.6, k));
    ghostMat.uniforms.uOpacity.value = 0.7 * k; person.visible = k > 0.01;
  }
  function setBackSeeThrough(on) { H.mats.back.opacity = on ? 0.42 : 1; H.mats.back.depthWrite = !on; H.mats.back.needsUpdate = true; }

  ch.update = (dt, time) => {
    if (person.visible) {
      const front = camera.position.z > 0; face.visible = front; hair.visible = !front;
      // the side labels follow their side of the heart, so from behind they swap over too
      ch.labels.pR.userData.dx = front ? -140 : 140; ch.labels.pL.userData.dx = front ? 140 : -140;
    }
    st.p = (st.p + dt / st.T) % 1;
    H.update(dt, st.p);
    flow.update(dt, time);
    sound.lub = Math.max(0, sound.lub - dt); sound.dub = Math.max(0, sound.dub - dt);
    lub.visible = sound.on && sound.lub > 0; dub.visible = sound.on && sound.dub > 0;
    lub.userData.el.classList.toggle('on', lub.visible); dub.userData.el.classList.toggle('on', dub.visible);
    if (sound.ui) sound.ui(st.p, H.state.b.phase, sound.lub > 0, sound.dub > 0);
  };
  const setSpeed = slow => { st.slow = slow; st.T = slow ? 3.2 : 0.85; };
  ch.exit = () => { setSpeed(true); sound.on = false; setInBody(0); setBackSeeThrough(false); };

  const front = { t: [0, 0.2, 0.3], dir: [0.1, 0.06, 1], w: 13.5, h: 9.6 };
  ch.steps = [
    {
      title: 'Four chambers',
      text: 'This heart has been cut open and faces you. The two <b>atria</b> on top collect blood. The two <b>ventricles</b> below squeeze it out.',
      cam: front, labels: ['ra', 'la', 'rv', 'lv'], focus: ['ra', 'la'],
    },
    {
      title: 'Blood in, blood out',
      text: '<b>Veins</b> bring blood into the atria: the vena cava from the body, the pulmonary vein from the lungs. <b>Arteries</b> carry it out of the ventricles: the pulmonary artery to the lungs, the aorta to the body.',
      cam: { t: [0, 0.8, 0.3], dir: [0.1, 0.08, 1], w: 15.5, h: 10 }, labels: ['vc', 'pa', 'pv', 'ao'], focus: [],
    },
    {
      title: 'Two pumps, side by side',
      text: 'The <span class="t-deoxy">right side</span> pumps oxygen-poor blood to the lungs. The <span class="t-oxy">left side</span> pumps oxygen-rich blood to the body. The <b>septum</b> keeps the two apart, so they never mix.',
      cam: front, labels: ['sideR', 'sideL', 'septum'], focus: ['sideR', 'sideL'],
    },
    {
      title: 'One heartbeat, in slow motion',
      text: 'Follow the bar. <b>1</b> The atria squeeze blood down into the ventricles. <b>2</b> The ventricles squeeze it out into the arteries. <b>3</b> The heart relaxes and fills again. Valves snapping shut make the “lub-dub” sound.',
      cam: front, labels: ['avR', 'slL'], focus: ['valves'],
      enter: () => { sound.on = true; },
      exit: () => { sound.on = false; },
      ctl: el => {
        el.innerHTML = `<div class="phases" id="ph"><div><b>1</b>Atria squeeze<i></i></div><div><b>2</b>Ventricles squeeze<i></i></div><div><b>3</b>Heart relaxes and fills<i></i></div></div>`
          + `<div class="row" style="justify-content:space-between"><div class="sound"><span id="sLub">lub</span><span id="sDub">dub</span></div>`
          + `<div class="seg"><button aria-pressed="true" data-s="1">Slow motion</button><button aria-pressed="false" data-s="0">Real speed</button></div></div>`;
        const cells = el.querySelectorAll('#ph div'), fills = el.querySelectorAll('#ph div i'), SPAN = [[0, 0.14], [0.14, 0.48], [0.48, 1]];
        el.querySelectorAll('.seg button').forEach(b => (b.onclick = () => { setSpeed(b.dataset.s === '1'); el.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-pressed', x === b)); }));
        sound.ui = (p, phase, l, d) => {
          cells.forEach((c, i) => c.classList.toggle('on', i === phase));
          fills.forEach((f, i) => { f.style.width = i === phase ? `${(100 * (p - SPAN[i][0]) / (SPAN[i][1] - SPAN[i][0])).toFixed(1)}%` : '0'; });
          el.querySelector('#sLub').classList.toggle('on', l); el.querySelector('#sDub').classList.toggle('on', d);
        };
        return () => { sound.ui = null; setSpeed(true); };
      },
    },
    {
      title: 'Why the left ventricle has the thickest wall',
      text: 'The <span class="t-oxy">left ventricle</span> must push blood all the way round the body, so it has the thickest, strongest wall. The <span class="t-deoxy">right ventricle</span> only pumps blood to the lungs, next door.',
      cam: { t: [0, -1.4, 0.3], dir: [0.06, 0.2, 1], w: 12.5, h: 7.4 }, labels: ['thin', 'thick'], focus: ['muscle'],
    },
    {
      title: 'Their right is on your left',
      text: 'Diagrams show the heart as if the person is <b>facing you</b>. So their right side is on your left. Walk round behind them and the sides line up with yours.',
      cam: { t: [0, 2.2, 0], dir: [0.08, 0.06, 1], w: 16, h: 19 }, labels: ['theirR', 'theirL', 'pR', 'pL'], focus: [],
      enter: () => tween(1.2, k => setInBody(k)),
      exit: () => { setInBody(0); setBackSeeThrough(false); },
      ctl: el => {
        el.innerHTML = '<div class="seg"><button aria-pressed="true" data-v="front">Facing you</button><button aria-pressed="false" data-v="back">Walk round behind</button></div>';
        el.querySelectorAll('button').forEach(b => (b.onclick = () => {
          const behind = b.dataset.v === 'back';
          el.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
          setBackSeeThrough(behind);
          flyTo({ t: [0, 2.2, 0], dir: behind ? [-0.08, 0.06, -1] : [0.08, 0.06, 1], w: 16, h: 19 }, 1.6);
        }));
        return () => setBackSeeThrough(false);
      },
    },
    {
      title: 'Quick check',
      text: 'Tap the chamber that pumps blood <b>to the whole body</b>.',
      cam: front, labels: [], focus: [],
      check: { answer: 'lv', pick: Object.values(H.hulls),
        yes: 'Yes: the <b>left ventricle</b>. It has the thickest wall because it pumps blood all round the body.',
        no: 'Blood is pumped to the body by the <b>left ventricle</b>: the bottom chamber on your right in the picture.' },
      labelsAfter: ['lv'],
    },
  ];
  return ch;
}
