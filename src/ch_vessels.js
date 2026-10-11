// ============================================================== chapter 3: blood vessels
function chVessels() {
  const ch = { id: 'vessels', name: 'Vessels', group: new THREE.Group(), glow: new Glow(), legend: 'blood', labels: {} };
  const G = ch.group;
  const U = { uT: { value: 0 }, uAmp: { value: 0.09 }, uLam: { value: 6 }, uC: { value: 6 }, uSq: { value: 0 } };
  const pulseify = m => {
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { uT: U.uT, uAmp: U.uAmp, uLam: U.uLam, uC: U.uC });
      sh.vertexShader = 'uniform float uT; uniform float uAmp; uniform float uLam; uniform float uC;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        { float ph = (transformed.x - uC * uT) / uLam; float fr = ph - floor(ph); float w = exp(-pow((fr - 0.5) * uLam / 1.1, 2.0));
          float taper = 1.0 - smoothstep(-5.6, -4.2, transformed.x); transformed.yz *= 1.0 + uAmp * w * taper; }`);
    };
    m.customProgramCacheKey = () => 'pulse'; m.side = THREE.DoubleSide; return m;
  };
  const squeezify = m => {
    m.onBeforeCompile = sh => {
      sh.uniforms.uSq = U.uSq;
      sh.vertexShader = 'uniform float uSq;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        { float k = smoothstep(8.3, 9.3, transformed.x) * (1.0 - smoothstep(12.0, 13.0, transformed.x)); transformed.yz *= 1.0 - uSq * 0.3 * k; }`);
    };
    m.customProgramCacheKey = () => 'squeeze'; m.side = THREE.DoubleSide; return m;
  };
  const pulseW = (x, t) => { const ph = (x - U.uC.value * t) / U.uLam.value, fr = ph - Math.floor(ph); return Math.exp(-((((fr - 0.5) * U.uLam.value) / 1.1) ** 2)); };

  // ---- the vessels, cut open towards the viewer
  const X = { a0: -15, a1: -5.4, c0: -3.6, c1: 3.6, v0: 5.4, v1: 15 };
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); G.add(m); return m; };
  const mm = (c, o = {}) => tissue(c, Object.assign({ roughness: 0.55, clearcoat: 0.25, sheen: 0.4 }, o));
  // artery: lining, muscle with three elastic layers, outer coat
  const aMus = pulseify(mm('#D9675F')), aEla = pulseify(mm(C.elastic, { roughness: 0.4 })), aLin = pulseify(mm(C.lining)), aCoat = pulseify(mm(C.coat));
  const aLayers = [[0.48, 0.56, aLin], [0.56, 0.7, aMus], [0.7, 0.74, aEla], [0.74, 0.85, aMus], [0.85, 0.89, aEla], [0.89, 1.0, aMus], [1.0, 1.04, aEla], [1.04, 1.13, aMus], [1.13, 1.28, aCoat]];
  for (const [ri, ro, m] of aLayers) add(halfShell(ri, ro, X.a0, X.a1), m);
  // arteriole and venule tapers
  const tapIn = x => lerp(0.48, 0.2, sstep(X.a1, X.c0, x)), tapOut = x => lerp(1.28, 0.27, sstep(X.a1, X.c0, x));
  add(halfShell(tapIn, tapOut, X.a1, X.c0, 30), pulseify(mm('#E08A80')));
  const vtIn = x => lerp(0.2, 1.04, sstep(X.c1, X.v0, x)), vtOut = x => lerp(0.27, 1.28, sstep(X.c1, X.v0, x));
  add(halfShell(vtIn, vtOut, X.c1, X.v0, 30), mm('#B9A9D8'));
  // capillary: a wall one cell thick (flat cells, each with a nucleus)
  const capMat = mm('#F6D2CB', { roughness: 0.5 });
  add(halfShell(0.2, 0.27, X.c0, X.c1, 60), capMat);
  const endoN = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), mm('#B07ACB'), 18); endoN.frustumCulled = false;
  { let i = 0; for (let k = 0; k < 9; k++) for (const th of [0.45, 2.6]) { const x = X.c0 + 0.45 + k * 0.8 + (th > 1 ? 0.4 : 0); const m = new THREE.Matrix4().compose(V3(x, Math.cos(th) * 0.27, -Math.sin(th) * 0.27), new THREE.Quaternion(), V3(0.16, 0.04, 0.09)); endoN.setMatrixAt(i++, m); } }
  G.add(endoN);
  // vein: thin wall, wide lumen
  const vMus = squeezify(mm('#C59AA6')), vLin = squeezify(mm('#EEE6F7')), vCoat = squeezify(mm(C.coat));
  for (const [ri, ro, m] of [[1.04, 1.08, vLin], [1.08, 1.17, vMus], [1.17, 1.28, vCoat]]) add(halfShell(ri, ro, X.v0, X.v1), m);
  ch.glow.add('artery', aMus, aCoat); ch.glow.add('vein', vMus, vCoat); ch.glow.add('cap', capMat);
  // valves in the vein: two flaps each, pointing towards the heart
  const valveMat = tissue('#8C6BC2', { roughness: 0.45, side: THREE.DoubleSide, sheen: 0.6 });
  const flap = new THREE.BoxGeometry(1.02, 0.15, 1.7); flap.translate(0.51, 0, -0.85);
  const valves = [];
  for (const vx of [7.4, 13.8]) {
    for (const s of [1, -1]) { const piv = new THREE.Group(); piv.position.set(vx, s * 1.03, 0); const m = new THREE.Mesh(flap, valveMat); piv.add(m); G.add(piv); valves.push({ piv, s, x: vx, a: 0.3 }); }
  }
  ch.glow.add('valve', valveMat);
  // skeletal muscles that squeeze the vein
  const legMat = tissue('#C8574F', { roughness: 0.6, clearcoat: 0.2 });
  const legs = [];
  for (const s of [1, -1]) { const m = new THREE.Mesh(new RoundedBoxGeometry(4.6, 0.95, 2.2, 3, 0.4), legMat); m.position.set(10.65, s * 1.86, -0.6); G.add(m); legs.push(m); }
  ch.glow.add('legs', legMat);
  const showLegs = on => { for (const l of legs) l.visible = on; };
  showLegs(false);
  // body cells around the capillary
  const tissueMat = tissue(C.tissue, { roughness: 0.6, clearcoat: 0.2, transparent: true, opacity: 0.92 });
  const tcells = [];
  for (let k = 0; k < 7; k++) for (const [y, z] of [[0.85, -0.35], [-0.85, -0.35], [0, -1.05]]) {
    const x = X.c0 + 0.5 + k * 1.03 + (z < -0.6 ? 0.5 : 0); if (x > X.c1 - 0.3) continue;
    const g = new THREE.Group(); g.position.set(x, y, z);
    g.add(new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.78, 0.86, 2, 0.22), tissueMat));
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mm(C.nucleus)); n.position.z = 0.15; g.add(n);
    G.add(g); tcells.push(g);
  }
  ch.glow.add('tcells', tissueMat);
  // stub branches: this capillary is one of many
  const stubMat = glass('#E9A9A2', { opacity: 0.45 }), stubMatV = glass('#B4B0E8', { opacity: 0.45 });
  for (const [x0, s, m] of [[-4.6, 1, stubMat], [-4.6, -1, stubMat], [4.6, 1, stubMatV], [4.6, -1, stubMatV]]) {
    const c = new THREE.CatmullRomCurve3([V3(x0, 0, -0.2), V3(x0 + (x0 < 0 ? 0.8 : -0.8), s * 0.9, -0.9), V3(x0 + (x0 < 0 ? 1.4 : -1.4), s * 1.5, -1.6)]);
    add(new THREE.TubeGeometry(c, 16, 0.12, 8), m);
  }
  // a small heart where the artery starts, and the way back
  const mini = heartModel(); mini.group.scale.setScalar(0.034); mini.group.position.set(-17.2, 0, -0.2); G.add(mini.group);
  const lead = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(-16.1, 0.9, -0.2), V3(-15.6, 0.4, -0.2), V3(-15, 0, -0.2)]), 12, 0.32, 12), mini.mats.vesL); G.add(lead);
  const back = new THREE.CatmullRomCurve3([V3(15.2, 0, -0.6), V3(16.6, 1.4, -1.5), V3(15, 5.6, -3), V3(0, 6.6, -4), V3(-15, 5.6, -3), V3(-17.6, 2.2, -1.2), V3(-17.3, 1.4, -0.4)]);
  const backLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(back.getPoints(120)), new THREE.LineDashedMaterial({ color: col(C.deoxy), dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.55 }));
  backLine.computeLineDistances(); G.add(backLine);

  // ---- blood cells flowing artery -> capillary -> vein
  const rIn = x => (x < X.a1 ? 0.48 : x < X.c0 ? tapIn(x) : x < X.c1 ? 0.2 : x < X.v0 ? vtIn(x) : 1.04);
  const N = 170, Rc = rng(3), cells = [];
  const cellsMesh = new THREE.InstancedMesh(rbcGeometry(), new THREE.MeshPhysicalMaterial({ roughness: 0.36, clearcoat: 0.7, sheen: 0.3 }), N);
  cellsMesh.frustumCulled = false; G.add(cellsMesh);
  for (let i = 0; i < N; i++) {
    const main = i < 14;
    cells.push({ main, x: main ? lerp(X.a0, X.v1, i / 14) : lerp(X.a0, X.v1, Rc()), oy: Rc() * 2 - 1, oz: Rc(), ax: V3(Rc() - 0.5, Rc() - 0.5, Rc() - 0.5).normalize(), a: Rc() * TAU, s: 1, j: 0.85 + Rc() * 0.3 });
    if (!main && cells[i].x > X.a1 - 0.2 && cells[i].x < X.v0) cells[i].x = Rc() < 0.5 ? X.a0 + Rc() * 9 : X.v0 + Rc() * 9;
  }
  const cO = col(C.oxy), cD = col(C.deoxy), _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = V3(), _s = V3();
  const st = { t: 0, sq: 0, sqT: 0, period: 1.0, squeezeNow: false };
  function updateCells(dt) {
    for (let i = 0; i < N; i++) {
      const c = cells[i];
      let v;
      if (c.x < X.a1) v = 0.9 + 4.2 * pulseW(c.x, st.t);
      else if (c.x < X.c1) v = c.main ? 0.75 : 1.6;
      else if (c.x < X.v0) v = 0.8;
      else {
        v = 0.5;
        if (c.x > 7.4) v += 2.6 * st.sq;           // squeezed blood is pushed towards the heart
        else v *= 1 - 0.9 * st.sq;                 // the closed valve holds the blood behind it
      }
      c.x += v * c.j * dt;
      // most cells go into other capillaries (not shown) and new ones join from them
      if (!c.main && c.x > X.a1 - 0.4 && c.x < X.v0) { c.x = X.v0 + 0.05; c.s = 0; }
      if (c.x > X.v1) { c.x = X.a0; c.s = 0; }
      c.s = Math.min(1, c.s + dt * 1.8);
      const r = rIn(c.x), spread = Math.max(0, r - 0.2);
      _p.set(c.x, c.oy * spread * 0.85, -0.05 - c.oz * spread * 0.85);
      if (c.x > 8.3 && c.x < 13) _p.y *= 1 - 0.3 * st.sq;
      const cap = c.x > X.c0 - 0.3 && c.x < X.c1 + 0.3;
      c.a += dt * (cap ? 0.2 : 0.9);
      _q.setFromAxisAngle(c.ax, c.a);
      if (cap) _q.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
      const sz = (cap ? 0.16 : 0.2) * c.s; _s.set(sz, sz, sz);
      _m.compose(_p, _q, _s); cellsMesh.setMatrixAt(i, _m);
      _c.lerpColors(cO, cD, sstep(-2.2, 2.4, c.x)); cellsMesh.setColorAt(i, _c);
    }
    cellsMesh.instanceMatrix.needsUpdate = true; cellsMesh.instanceColor.needsUpdate = true;
  }
  for (let i = 0; i < N; i++) cellsMesh.setColorAt(i, cO);

  // ---- substances diffusing between the capillary and the cells
  const NO = 34, NC = 26, NG = 14, NT = NO + NC + NG;
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 1, emissive: col('#ffffff'), emissiveIntensity: 0.12 }), NT);
  dots.frustumCulled = false; G.add(dots);
  const Rd = rng(9), mol = [];
  const kinds = [...Array(NO).fill('o2'), ...Array(NC).fill('co2'), ...Array(NG).fill('glu')];
  const colK = { o2: col('#FF4A3D'), co2: col('#7D86A6'), glu: col('#F5B21E') };
  const respawn = m => {
    const cell = tcells[Math.floor(Rd() * tcells.length)];
    const inCap = V3(lerp(X.c0 + 0.4, X.c1 - 0.4, Rd()), (Rd() - 0.5) * 0.12, -0.06);
    const inCell = cell.position.clone().add(V3((Rd() - 0.5) * 0.5, (Rd() - 0.5) * 0.4, (Rd() - 0.5) * 0.3 + 0.1));
    inCap.x = clamp(cell.position.x + (Rd() - 0.5) * 0.6, X.c0 + 0.3, X.c1 - 0.3);
    if (m.k === 'co2') { m.a = inCell; m.b = inCap; } else { m.a = inCap; m.b = inCell; }
    m.t = 0; m.d = 1.6 + Rd() * 1.4;
  };
  kinds.forEach((k, i) => { const m = { k, i }; respawn(m); m.t = Rd(); mol.push(m); dots.setColorAt(i, colK[k]); });
  function updateDots(dt) {
    for (const m of mol) {
      m.t += dt / m.d; if (m.t >= 1) respawn(m);
      const e = easeIO(m.t); _p.lerpVectors(m.a, m.b, e); _p.y += Math.sin(m.t * Math.PI) * 0.05;
      const s = Math.sin(Math.PI * Math.min(1, m.t * 1.15)) > 0.05 ? 1 : 0.2;
      _m.compose(_p, _q.identity(), _s.set(s, s, s)); dots.setMatrixAt(m.i, _m);
    }
    dots.instanceMatrix.needsUpdate = true;
  }

  // ---- blood pressure along the way (a live graph floating above the vessels)
  const NPRS = 260, prPos = new Float32Array(NPRS * 3);
  const prGeo = new THREE.BufferGeometry(); prGeo.setAttribute('position', new THREE.BufferAttribute(prPos, 3));
  const prLine = new THREE.Line(prGeo, new THREE.LineBasicMaterial({ color: col('#47526F'), transparent: true, opacity: 0.95 }));
  const prFill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ visible: false }));
  const prBase = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(-15, 1.9, -0.6), V3(15, 1.9, -0.6)]), new THREE.LineBasicMaterial({ color: '#8C94B0', transparent: true, opacity: 0.6 }));
  const prGroup = new THREE.Group(); prGroup.add(prLine, prBase, prFill); G.add(prGroup);
  // a thicker ribbon so the line reads at any size
  const ribbon = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: col('#47526F'), side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
  const ribPos = new Float32Array(NPRS * 2 * 3), ribIdx = [];
  for (let i = 0; i < NPRS - 1; i++) { const a = i * 2; ribIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  ribbon.geometry.setAttribute('position', new THREE.BufferAttribute(ribPos, 3)); ribbon.geometry.setIndex(ribIdx); prGroup.add(ribbon);
  const pressure = (x, t) => {
    if (x < X.a1) return 82 + 36 * pulseW(x, t) - (x - X.a0) * 0.4;
    if (x < X.c0) { const k = sstep(X.a1, X.c0, x); return lerp(80 + 30 * pulseW(x, t) * (1 - k), 36, k); }
    if (x < X.c1) return lerp(36, 16, (x - X.c0) / (X.c1 - X.c0));
    if (x < X.v0) return lerp(16, 10, (x - X.c1) / (X.v0 - X.c1));
    return lerp(10, 4, (x - X.v0) / (X.v1 - X.v0));
  };
  function updatePressure() {
    for (let i = 0; i < NPRS; i++) {
      const x = lerp(-15, 15, i / (NPRS - 1)), y = 1.9 + pressure(x, st.t) * 0.022;
      prPos[i * 3] = x; prPos[i * 3 + 1] = y; prPos[i * 3 + 2] = -0.6;
      ribPos[i * 6] = x; ribPos[i * 6 + 1] = y - 0.045; ribPos[i * 6 + 2] = -0.6; ribPos[i * 6 + 3] = x; ribPos[i * 6 + 4] = y + 0.045; ribPos[i * 6 + 5] = -0.6;
    }
    prGeo.attributes.position.needsUpdate = true; ribbon.geometry.attributes.position.needsUpdate = true; ribbon.geometry.computeBoundingSphere();
  }

  // ---- labels
  const Lb = (key, text, pos, o) => { const l = label(text, o); l.position.copy(pos); G.add(l); ch.labels[key] = l; };
  Lb('artery', 'artery', V3(-10.2, -1.28, 0), { dx: 0, dy: 44, sub: 'carries blood away from the heart' });
  Lb('capillary', 'capillary', V3(0, -0.27, 0), { dx: 0, dy: 58, sub: 'passes close to every cell' });
  Lb('vein', 'vein', V3(10.2, -1.28, 0), { dx: 0, dy: 44, sub: 'carries blood back to the heart' });
  Lb('toHeart', 'back to the heart →', V3(15.6, 0, 0), { tone: 'nodot', dx: 0, dy: -46 });
  Lb('heart', 'heart', V3(-17.2, 1.6, 0), { dx: 0, dy: -36 });
  Lb('back', 'back to the heart', V3(0, 6.6, -4), { tone: 'deoxy nodot', dx: 0, dy: -4 });
  Lb('pHigh', 'high pressure, in surges', V3(-10.2, 4.75, -0.6), { tone: 'oxy nodot', dx: 0, dy: -8 });
  Lb('pFall', 'falling', V3(0, 3.0, -0.6), { tone: 'nodot', dx: 0, dy: -18 });
  Lb('pLow', 'low pressure', V3(10.2, 2.35, -0.6), { tone: 'deoxy nodot', dx: 0, dy: -18 });
  Lb('pName', 'blood pressure', V3(-15, 1.9, -0.6), { tone: 'nodot', dx: -70, dy: -14, sub: 'higher line = more pressure' });
  Lb('aWall', 'thick wall', V3(-9.0, 0.95, 0.02), { tone: 'oxy', dx: -10, dy: -62, sub: 'muscle and stretchy elastic fibres' });
  Lb('aLumen', 'narrow lumen', V3(-11.6, 0.0, -0.1), { dx: -20, dy: 74, sub: 'the space the blood flows through' });
  Lb('aPulse', 'each surge stretches the wall: your pulse', V3(-6.6, 1.32, -0.2), { dx: 40, dy: -50 });
  Lb('vWall', 'thin wall', V3(6.1, 1.13, 0.02), { tone: 'deoxy', dx: -24, dy: -56 });
  Lb('vLumen', 'wide lumen', V3(6.3, -0.3, -0.3), { dx: -36, dy: 66 });
  Lb('vValve', 'valve', V3(13.8, -0.6, -0.2), { dx: 40, dy: 74, sub: 'stops blood flowing backwards' });
  Lb('vMuscle', 'leg muscles squeeze the vein', V3(10.65, 2.3, 0.4), { dx: 0, dy: -38 });
  Lb('cWall', 'wall one cell thick', V3(-1.6, 0.27, 0.02), { dx: -40, dy: -70, sub: 'a very short distance to diffuse' });
  Lb('cO2', 'oxygen and glucose: out to the cells ↑', V3(1.2, 0.55, 0.2), { tone: 'oxy', dx: 70, dy: -64 });
  Lb('cCO2', 'carbon dioxide: into the blood ↑', V3(-0.8, -0.55, 0.2), { tone: 'grey', dx: -30, dy: 70 });
  // pick hulls
  const hA = hull(new THREE.BoxGeometry(9.8, 2.8, 2.8), 'artery', G, V3(-10.2, 0, 0)), hC = hull(new THREE.BoxGeometry(7.4, 2.4, 2.4), 'capillary', G, V3(0, 0, 0)), hV = hull(new THREE.BoxGeometry(9.8, 3.4, 2.8), 'vein', G, V3(10.2, 0, 0));
  hA.visible = hC.visible = hV.visible = false;

  ch.update = (dt, time) => {
    st.t += dt;
    U.uT.value = st.t;
    mini.update(dt, ((st.t / st.period) + 0.45) % 1);
    // leg muscles squeeze every 3 s (or on demand)
    st.sqT += dt; if (st.squeezeNow) { st.sqT = 0; st.squeezeNow = false; }
    const T = st.sqT % 3.0; st.sq = T < 0.55 ? easeIO(T / 0.55) : T < 1.0 ? 1 : T < 1.7 ? 1 - easeIO((T - 1.0) / 0.7) : 0;
    U.uSq.value = st.sq;
    for (const l of legs) l.scale.y = 1 + 0.32 * st.sq;
    legs[0].position.y = 1.86 - 0.2 * st.sq; legs[1].position.y = -1.86 + 0.2 * st.sq;
    const k = 1 - Math.exp(-dt * 16);
    for (const v of valves) {
      const closed = v.x < 10 ? st.sq > 0.25 : st.sq < 0.2 && T > 1.0;
      const target = closed ? 1.32 : 0.22;
      v.a += (target - v.a) * k; v.piv.rotation.z = -v.s * v.a;
    }
    updateCells(dt); updateDots(dt);
    if (prGroup.visible) updatePressure();
  };
  const showPressure = on => { prGroup.visible = on; backLine.visible = on; };
  showPressure(false);
  ch.steps = [
    {
      title: 'Three kinds of blood vessel',
      text: 'Blood leaves the heart in <b>arteries</b>, passes every cell in tiny <b>capillaries</b>, and comes back in <b>veins</b>. Arteries are named by direction (away from the heart), not by oxygen. The grey line shows the blood pressure.',
      cam: { t: [-1.0, 1.3, 0], dir: [0, 0.14, 1], w: 35.5, h: 9.5 }, labels: ['artery', 'capillary', 'vein', 'heart', 'pHigh', 'pFall', 'pLow', 'pName'], focus: [],
      enter: () => showPressure(true), exit: () => showPressure(false),
    },
    {
      title: 'Arteries: away from the heart',
      text: 'Each heartbeat pushes a surge of blood along the artery at <b>high pressure</b>. The thick wall of muscle and stretchy elastic fibres stretches, then springs back. That surge is the pulse you feel at your wrist.',
      cam: { t: [-9.6, 0.1, 0], dir: [0.22, 0.32, 1], w: 11, h: 5.4 }, labels: ['aWall', 'aLumen', 'aPulse'], focus: ['artery'],
    },
    {
      title: 'Veins: back to the heart',
      text: 'Blood in veins is at <b>low pressure</b>. When your leg muscles squeeze a vein, the <b>valves</b> let blood go only one way: towards the heart. Watch the flaps snap shut.',
      cam: { t: [10.8, 0.1, 0], dir: [-0.15, 0.3, 1], w: 12, h: 6.8 }, labels: ['vWall', 'vLumen', 'vValve', 'vMuscle', 'toHeart'], focus: ['valve'],
      enter: () => showLegs(true), exit: () => showLegs(false),
      ctl: el => { el.innerHTML = '<div class="row"><button class="btn small" id="sq">Squeeze the muscles now</button></div>'; el.querySelector('#sq').onclick = () => { st.squeezeNow = true; }; },
    },
    {
      title: 'Capillaries: where the swap happens',
      text: 'A capillary is just wide enough for one red blood cell, and its wall is <b>one cell thick</b>, so substances only travel a short way. Oxygen and glucose diffuse out to the cells; carbon dioxide diffuses into the blood.',
      cam: { t: [0, 0, 0], dir: [0.06, 0.34, 1], w: 7.8, h: 4.6 }, labels: ['cWall', 'cO2', 'cCO2'], focus: ['cap'],
      legend: [['#FF4A3D', 'oxygen'], ['#F5B21E', 'glucose'], ['#7D86A6', 'carbon dioxide']],
    },
    {
      title: 'Quick check',
      text: 'Tap the blood vessel that has <b>valves</b>.',
      cam: { t: [-1.0, 0.2, 0], dir: [0, 0.12, 1], w: 35, h: 8 }, labels: [], focus: [],
      check: { answer: 'vein', pick: [hA, hC, hV],
        yes: 'Yes: the <b>vein</b>. Its blood is at low pressure, so valves stop it flowing backwards.',
        no: 'Only <b>veins</b> have valves: their blood is at low pressure and could flow backwards.' },
      labelsAfter: ['vein'],
    },
  ];
  return ch;
}
