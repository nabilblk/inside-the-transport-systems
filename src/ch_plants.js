// ============================================================== chapter 5: plants
function chPlants() {
  const ch = { id: 'plants', name: 'Plants', group: new THREE.Group(), glow: new Glow(), legend: 'plant', labels: {} };
  const G = ch.group;
  const stP = new THREE.Group(), stL = new THREE.Group(), stK = new THREE.Group(); G.add(stP, stL, stK);
  const Lb = (parent, key, text, pos, o) => { const l = label(text, o); l.position.copy(pos); parent.add(l); ch.labels[key] = l; return l; };
  const R = rng(31);
  const tA = V3(), tT = V3(), tN = V3(), tB = V3();

  // ===================================================== the whole plant
  // ---- soil block, cut open at the front
  const soilSide = new THREE.MeshStandardMaterial({ color: '#7A5B3E', roughness: 1, side: THREE.DoubleSide });
  const soilTop = new THREE.MeshStandardMaterial({ color: '#6E5038', roughness: 1, transparent: true, opacity: 0.55, depthWrite: false });
  const soilFront = glass('#B08B63', { opacity: 0.32, base: 0.3, power: 1.2 });
  const soil = new THREE.Mesh(new THREE.BoxGeometry(9.4, 4.4, 5.4), [soilSide, soilSide, soilTop, soilSide, soilFront, soilSide]);
  soil.position.set(0, -2.2, 0); soil.renderOrder = 1; stP.add(soil);
  ch.glow.add('soil', soilFront);

  // ---- roots
  const mainRoot = new Path([[0, -0.02, 0], [0.08, -1.0, 0.05], [0.05, -2.0, 0.12], [0.12, -3.0, 0.2], [0.2, -3.95, 0.25]], { density: 10 });
  const roots = [{ path: mainRoot, r: 0.11, main: true, t0: 0 }];
  for (const [t0, end] of [[0.16, [-3.4, -1.6, 0.6]], [0.3, [3.5, -2.0, -0.5]], [0.47, [-3.1, -3.2, -0.6]], [0.62, [3.2, -3.6, 0.7]], [0.78, [-1.7, -4.05, 0.9]]]) {
    const a = mainRoot.at(t0, V3()), e = V3(...end), m = a.clone().lerp(e, 0.45).add(V3(0, 0.3, 0));
    roots.push({ path: new Path([a, m, e], { density: 12 }), r: 0.065, main: false, t0 });
  }
  const rootMat = tissue(C.root, { roughness: 0.55, transparent: true, opacity: 1 });
  for (const r of roots) stP.add(new THREE.Mesh(new THREE.TubeGeometry(r.path.curve, 48, r.r, 10), rootMat));
  // root hair cells: long thin outgrowths near each tip
  const hairGeo = new THREE.CylinderGeometry(0.011, 0.011, 1, 5); hairGeo.translate(0, 0.5, 0);
  const HPR = 40, hairs = new THREE.InstancedMesh(hairGeo, tissue('#F7EBD2', { roughness: 0.6 }), roots.length * HPR); hairs.frustumCulled = false;
  { let i = 0; const up = V3(0, 1, 0), q = new THREE.Quaternion(), m = new THREE.Matrix4();
    for (const r of roots) for (let k = 0; k < HPR; k++) {
      const t = 0.55 + 0.42 * R(); r.path.at(t, tA); r.path.frame(t, tT, tN, tB);
      const a = R() * TAU, d = tN.clone().multiplyScalar(Math.cos(a)).addScaledVector(tB, Math.sin(a)).normalize();
      q.setFromUnitVectors(up, d); m.compose(tA.clone().addScaledVector(d, r.r * 0.8), q, V3(0.9, 0.16 + R() * 0.14, 0.9)); hairs.setMatrixAt(i++, m);
    } }
  stP.add(hairs);
  ch.glow.add('hairs', hairs.material); ch.glow.add('roots', rootMat);
  const FH = (() => {
    const r = roots[4], t = 0.78; r.path.at(t, tA); r.path.frame(t, tT, tN, tB);
    const a = Math.atan2(tB.z, tN.z), d = tN.clone().multiplyScalar(Math.cos(a)).addScaledVector(tB, Math.sin(a)).normalize();
    const base = tA.clone().addScaledVector(d, r.r * 0.8), tip = base.clone().addScaledVector(d, 0.75);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.72, 6, 12), tissue('#FFFFFF', { roughness: 0.4, emissive: col('#FFF6DD'), emissiveIntensity: 0.35 }));
    m.position.copy(base).addScaledVector(d, 0.375); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d); stP.add(m);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture('rgba(120,200,255,0.75)'), transparent: true, depthWrite: false }));
    halo.position.copy(base).addScaledVector(d, 0.4); halo.scale.setScalar(1.3); halo.visible = false; stP.add(halo);
    return { base, tip, d, core: tA.clone(), halo };
  })();
  const NDROP = 6, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshPhysicalMaterial({ color: C.water, roughness: 0.2, clearcoat: 1, emissive: col('#4AA8FF'), emissiveIntensity: 0.3 }), NDROP);
  drops.frustumCulled = false; stP.add(drops); drops.visible = false;
  const dropT = Array.from({ length: NDROP }, (_, i) => i / NDROP);
  function updateDrops(dt) {
    for (let i = 0; i < NDROP; i++) {
      dropT[i] = (dropT[i] + dt * 0.35) % 1; const t = dropT[i];
      // from the soil, onto the hair tip, down the hair, into the middle of the root
      if (t < 0.3) tA.copy(FH.tip).addScaledVector(FH.d, 0.35 * (1 - t / 0.3)); else if (t < 0.8) tA.lerpVectors(FH.tip, FH.base, (t - 0.3) / 0.5); else tA.lerpVectors(FH.base, FH.core, (t - 0.8) / 0.2);
      const sc = t < 0.08 ? t / 0.08 : t > 0.95 ? (1 - t) / 0.05 : 1;
      _m.compose(tA, _q.identity(), _s.set(sc, sc, sc)); drops.setMatrixAt(i, _m);
    }
    drops.instanceMatrix.needsUpdate = true;
  }
  // soil crumbs (kept clear of the roots so the roots stay visible)
  const rootPts = []; for (const r of roots) for (let i = 0; i <= 30; i++) rootPts.push(r.path.at(i / 30, V3()));
  const crumbs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 1 }), 150); crumbs.frustumCulled = false;
  { const tones = ['#6F5135', '#93704C', '#5E432C', '#A9845B'].map(col); const m = new THREE.Matrix4(); let i = 0, guard = 0;
    while (i < 150 && guard++ < 5000) {
      const p = V3(-4.5 + R() * 9, -4.3 + R() * 4.2, -2.6 + R() * 3.4);
      if (rootPts.some(q => q.distanceToSquared(p) < 0.55)) continue;
      const s = 0.035 + R() * 0.07; m.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 3, R() * 3, 0)), V3(s, s * 0.8, s)); crumbs.setMatrixAt(i, m); crumbs.setColorAt(i, tones[i % 4]); i++;
    }
    crumbs.count = i; }
  stP.add(crumbs);

  // ---- stem, with its transport tissues inside
  const stemPath = new Path([[0, -0.05, 0], [0.1, 1.6, 0.04], [0.02, 3.4, -0.02], [-0.06, 5.2, 0.02], [0.04, 7.3, 0]], { density: 8 });
  const stemMat = tissue(C.stem, { roughness: 0.42, clearcoat: 0.6, transparent: true, opacity: 1 });
  stP.add(new THREE.Mesh(new THREE.TubeGeometry(stemPath.curve, 80, 0.2, 18), stemMat));
  const xyMat = glass(C.xylem, { opacity: 0, base: 0.55, power: 1.2 }), phMat = glass(C.phloem, { opacity: 0, base: 0.55, power: 1.2 });
  const bundleDirs = [45, 135, 225, 315].map(d => V3(Math.cos(THREE.MathUtils.degToRad(d)), 0, Math.sin(THREE.MathUtils.degToRad(d))));
  const offsetPath = (path, off, from = 0, to = 1) => { const pts = []; for (let i = 0; i <= 40; i++) pts.push(path.at(lerp(from, to, i / 40), V3()).add(off)); return new THREE.CatmullRomCurve3(pts); };
  for (const d of bundleDirs) {
    stP.add(new THREE.Mesh(new THREE.TubeGeometry(offsetPath(stemPath, d.clone().multiplyScalar(0.075)), 60, 0.032, 8), xyMat));
    stP.add(new THREE.Mesh(new THREE.TubeGeometry(offsetPath(stemPath, d.clone().multiplyScalar(0.145)), 60, 0.026, 8), phMat));
  }
  for (const r of roots) {   // in roots the xylem runs down the middle, with phloem alongside
    stP.add(new THREE.Mesh(new THREE.TubeGeometry(r.path.curve, 40, r.r * 0.32, 6), xyMat));
    stP.add(new THREE.Mesh(new THREE.TubeGeometry(offsetPath(r.path, V3(0, 0, r.r * 0.55)), 40, r.r * 0.22, 6), phMat));
  }
  ch.glow.add('xylem', xyMat); ch.glow.add('phloem', phMat); ch.glow.add('stem', stemMat);

  // ---- leaves
  const leafMat = tissue(C.leaf, { roughness: 0.48, clearcoat: 0.45, side: THREE.DoubleSide, transparent: true, opacity: 1, sheen: 0.7, sheenColor: col('#BFF5E4') });
  const leaves = [];
  const leafGeometry = (Lg, W) => {
    const nu = 26, nv = 10, pos = [], idx = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const u = i / nu, v = (j / nv) * 2 - 1, w = W * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 0.9);
      pos.push(0.18 + u * (Lg - 0.18), -0.16 * Lg * u * u + 0.07 * W * v * v, v * w);
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  for (const [h, phi, Lg] of [[2.1, 0.08, 2.7], [3.45, Math.PI - 0.08, 2.5], [4.65, 0.42, 2.15], [5.8, Math.PI + 0.42, 1.8]]) {
    const tS = (h + 0.05) / 7.35, base = stemPath.at(tS, V3());
    const side = Math.cos(phi) > 0 ? 1 : -1;
    const g = new THREE.Group(); g.position.copy(base); g.rotation.set(side * 1.0, -phi, 0.3, 'YZX'); stP.add(g);
    const W = Lg * 0.24;
    const m = new THREE.Mesh(leafGeometry(Lg, W), leafMat); g.add(m);
    const ribPts = []; for (let i = 0; i <= 16; i++) { const u = i / 16; ribPts.push(V3(0.05 + u * (Lg * 0.92 - 0.05), -0.16 * Lg * u * u + 0.012, 0)); }
    const rib = new THREE.CatmullRomCurve3(ribPts);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(rib, 24, 0.026, 6), xyMat));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPts.map(p => p.clone().add(V3(0, -0.03, 0.035)))), 24, 0.02, 6), phMat));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(rib, 24, 0.035, 6), tissue('#7FD3B8', { roughness: 0.5 })));
    g.updateMatrixWorld(true);
    leaves.push({ g, Lg, W, tS, h, side, roll: side * 1.0, mesh: m });
  }
  ch.glow.add('leaf0', leafMat);
  // a point on a leaf, in stage coordinates: u along the leaf, v across (-1..1), dy above(+)/below(-) the blade
  const leafPoint = (lf, u, v, dy = 0) => {
    const w = lf.W * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 0.9);
    const p = V3(0.18 + u * (lf.Lg - 0.18), -0.16 * lf.Lg * u * u + 0.07 * lf.W * v * v + dy, v * w * 0.92);
    return lf.g.localToWorld(p);
  };
  const leafDown = lf => V3(0, -1, 0).applyQuaternion(lf.g.quaternion);
  // ---- flower
  const top = stemPath.at(1, V3());
  const flower = new THREE.Group(); flower.position.copy(top).add(V3(0, 0.12, 0)); stP.add(flower);
  const petalMat = tissue('#FFC23A', { roughness: 0.45, sheen: 0.8 });
  for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), petalMat); p.scale.set(0.46, 0.07, 0.2); p.position.set(Math.cos((i / 7) * TAU) * 0.4, 0, Math.sin((i / 7) * TAU) * 0.4); p.rotation.set(0, -(i / 7) * TAU, 0.25); flower.add(p); }
  const centre = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), tissue('#B5651D')); centre.position.y = 0.04; flower.add(centre);
  flower.rotation.x = 0.35; flower.scale.setScalar(1.6);
  ch.glow.add('flower', petalMat);

  // ---- x-ray: fade the outsides, show xylem and phloem
  const xr = { k: 0, target: 0, pk: 0, ptarget: 0 };
  const setXray = (on, phloem = false) => { xr.target = on ? 1 : 0; xr.ptarget = on && phloem ? 1 : 0; };
  function updateXray(dt) {
    const e = 1 - Math.exp(-dt * 4);
    xr.k += (xr.target - xr.k) * e; xr.pk += (xr.ptarget - xr.pk) * e;
    const k = xr.k;
    stemMat.opacity = 1 - 0.78 * k; leafMat.opacity = 1 - 0.62 * k; rootMat.opacity = 1 - 0.7 * k;
    for (const m of [stemMat, leafMat, rootMat]) { const dw = m.opacity > 0.98; if (m.depthWrite !== dw) { m.depthWrite = dw; m.needsUpdate = true; } }
    xyMat.uniforms.uOpacity.value = 0.95 * k; phMat.uniforms.uOpacity.value = 0.95 * xr.pk;
  }

  // ---- water: soil -> root hair -> root xylem -> stem xylem -> leaf -> out of the stomata as vapour
  const env = { light: true, warm: false, wind: false, humid: false, rate: 1.2, k: 1 };
  const rateOf = e => 1.2 * (e.light ? 1 : 0.15) * (e.warm ? 5 / 3 : 1) * (e.wind ? 1.8 : 1) * (e.humid ? 4 / 9 : 1);
  const SPD = { soil: 0.2, root: 0.75, stem: 1.35, leaf: 0.5 };
  const NW = 230;
  const waterMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ roughness: 0.2, clearcoat: 1, emissive: col('#4AA8FF'), emissiveIntensity: 0.25 }), NW);
  waterMesh.frustumCulled = false; stP.add(waterMesh);
  const cWater = col(C.water), cVap = col('#E4F3FF');
  function waterRoute() {
    const root = roots[Math.floor(R() * roots.length)], th = 0.58 + R() * 0.38;
    const pts = [], sp = [];
    root.path.at(th, tA); root.path.frame(th, tT, tN, tB);
    const a = R() * TAU, d = tN.clone().multiplyScalar(Math.cos(a)).addScaledVector(tB, Math.sin(a)).normalize();
    pts.push(tA.clone().addScaledVector(d, root.r + 0.5)); sp.push('soil');
    pts.push(tA.clone().addScaledVector(d, root.r * 0.4)); sp.push('root');
    for (let t = th - 0.06; t > 0; t -= 0.06) { pts.push(root.path.at(t, V3())); sp.push('root'); }
    if (!root.main) for (let t = root.t0; t > 0; t -= 0.06) { pts.push(mainRoot.at(t, V3())); sp.push('root'); }
    pts.push(mainRoot.at(0, V3())); sp.push('stem');
    const lf = leaves[Math.floor(R() * leaves.length)], bd = bundleDirs[Math.floor(R() * 4)].clone().multiplyScalar(0.075);
    for (let t = 0.02; t < lf.tS; t += 0.04) { pts.push(stemPath.at(t, V3()).add(bd)); sp.push('stem'); }
    pts.push(stemPath.at(lf.tS, V3())); sp.push('leaf');
    const u = 0.25 + R() * 0.65;
    for (let uu = 0.05; uu < u; uu += 0.12) { pts.push(leafPoint(lf, uu, 0, 0.01)); sp.push('leaf'); }
    pts.push(leafPoint(lf, u, (R() * 2 - 1) * 0.75, -0.05)); sp.push('leaf');
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    return { pts, sp, cum, lf };
  }
  const water = [];
  for (let i = 0; i < NW; i++) { const w = { route: waterRoute(), d: 0, i, vap: -1, vel: V3(), p: V3() }; w.d = R() * w.route.cum[w.route.cum.length - 1]; water.push(w); }
  const wind = V3();
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = V3(), _c = new THREE.Color();
  const flowOn = { water: false, sugar: false, vapourOnly: false };
  function updateWater(dt) {
    const k = clamp(env.rate / 1.2, 0.12, 3.2);
    for (const w of water) {
      const r = w.route, n = r.pts.length;
      if (w.vap >= 0) {
        w.vap += dt / (env.humid ? 3.2 : 2.2);
        w.vel.addScaledVector(wind, dt * 1.2); w.p.addScaledVector(w.vel, dt);
        const f = w.vap;
        _c.lerpColors(cWater, cVap, Math.min(1, f * 2.5));
        const s = 0.06 * (1 + f * 1.2) * (1 - sstep(0.45, 1, f));
        _m.compose(w.p, _q.identity(), _s.set(s, s, s)); waterMesh.setMatrixAt(w.i, _m); waterMesh.setColorAt(w.i, _c);
        if (f >= 1) { w.route = waterRoute(); w.d = 0; w.vap = -1; }
        continue;
      }
      let seg = 0; while (seg < n - 2 && r.cum[seg + 1] < w.d) seg++;
      w.d += SPD[r.sp[seg]] * k * dt * (r.sp[seg] === 'soil' ? 1 : 1);
      const tot = r.cum[n - 1];
      if (w.d >= tot) {
        // leaves the leaf through a stoma: open stomata only in the light
        if (!env.light && R() > 0.15) { w.route = waterRoute(); w.d = 0; continue; }
        w.vap = 0; w.p.copy(r.pts[n - 1]); w.vel.copy(leafDown(r.lf)).multiplyScalar(0.12).add(V3((R() - 0.5) * 0.25, -0.16 - R() * 0.1, 0.12 + R() * 0.1));
        continue;
      }
      seg = 0; while (seg < n - 2 && r.cum[seg + 1] < w.d) seg++;
      const f = (w.d - r.cum[seg]) / Math.max(1e-5, r.cum[seg + 1] - r.cum[seg]);
      w.p.lerpVectors(r.pts[seg], r.pts[seg + 1], f);
      const vis = flowOn.vapourOnly ? 0 : 1;
      const s = 0.072 * vis * (seg === 0 ? sstep(0, 0.4, f) : 1);
      _m.compose(w.p, _q.identity(), _s.set(s, s, s)); waterMesh.setMatrixAt(w.i, _m); waterMesh.setColorAt(w.i, cWater);
    }
    waterMesh.instanceMatrix.needsUpdate = true; waterMesh.instanceColor.needsUpdate = true;
  }
  for (let i = 0; i < NW; i++) waterMesh.setColorAt(i, cWater);

  // ---- sugar: made in the leaves, carried both ways in the phloem
  const NS = 90;
  const sugarMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: col('#FFF3D6'), emissiveIntensity: 0.4, roughness: 0.35 }), NS);
  const sugarRim = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#C97800', side: THREE.BackSide }), NS);
  sugarMesh.frustumCulled = sugarRim.frustumCulled = false; stP.add(sugarRim, sugarMesh);
  // chevrons beside the stem: sugar goes up above the leaves and down below them
  const chevGeo = new THREE.ConeGeometry(0.13, 0.3, 16);
  const chevMat = tissue('#E08A00', { roughness: 0.4, clearcoat: 0.6 });
  const chevrons = new THREE.Group(); stP.add(chevrons); chevrons.visible = false;
  for (const [t, up] of [[0.84, 1], [0.92, 1], [0.12, -1], [0.04, -1]]) {
    const m = new THREE.Mesh(chevGeo, chevMat); m.position.copy(stemPath.at(t, V3())).add(V3(-0.42, 0, 0.1)); if (up < 0) m.rotation.z = Math.PI; chevrons.add(m);
  }
  const showChevrons = on => { chevrons.visible = on; };
  function sugarRoute() {
    const lf = leaves[Math.floor(R() * leaves.length)], pts = [], bd = bundleDirs[Math.floor(R() * 4)].clone().multiplyScalar(0.145);
    const u = 0.3 + R() * 0.6;
    for (let uu = u; uu > 0.04; uu -= 0.1) pts.push(leafPoint(lf, uu, 0, -0.02).add(V3(0, 0, 0.02)));
    pts.push(stemPath.at(lf.tS, V3()).add(bd));
    const up = R() < 0.4;
    if (up) { for (let t = lf.tS; t <= 1; t += 0.04) pts.push(stemPath.at(Math.min(1, t), V3()).add(bd)); pts.push(top.clone().add(V3(0, 0.1, 0))); }
    else {
      for (let t = lf.tS; t > 0; t -= 0.04) pts.push(stemPath.at(t, V3()).add(bd));
      const root = roots[Math.floor(R() * roots.length)];
      if (!root.main) for (let t = 0; t < root.t0; t += 0.06) pts.push(mainRoot.at(t, V3()).add(V3(0, 0, root.r * 0.55)));
      for (let t = 0; t <= 0.95; t += 0.06) pts.push(root.path.at(t, V3()).add(V3(0, 0, root.r * 0.55)));
    }
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    return { pts, cum, up };
  }
  const sugar = []; for (let i = 0; i < NS; i++) { const s = { route: sugarRoute(), d: 0, i, a: R() * TAU }; s.d = R() * s.route.cum[s.route.cum.length - 1]; sugar.push(s); }
  function updateSugar(dt) {
    for (const s of sugar) {
      const r = s.route, n = r.pts.length; s.d += 0.55 * dt; s.a += dt * 2;
      if (s.d >= r.cum[n - 1]) { s.route = sugarRoute(); s.d = 0; continue; }
      let seg = 0; while (seg < n - 2 && r.cum[seg + 1] < s.d) seg++;
      const f = (s.d - r.cum[seg]) / Math.max(1e-5, r.cum[seg + 1] - r.cum[seg]);
      tA.lerpVectors(r.pts[seg], r.pts[seg + 1], f);
      const sc = 0.1 * (1 - sstep(0.92, 1, s.d / r.cum[n - 1]));
      _q.setFromEuler(new THREE.Euler(s.a, s.a * 0.7, 0)); _m.compose(tA, _q, _s.set(sc, sc, sc)); sugarMesh.setMatrixAt(s.i, _m);
      _m.compose(tA, _q, _s.set(sc * 1.3, sc * 1.3, sc * 1.3)); sugarRim.setMatrixAt(s.i, _m);
    }
    sugarMesh.instanceMatrix.needsUpdate = true; sugarRim.instanceMatrix.needsUpdate = true;
  }

  // ---- the weather for the experiment
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 16), new THREE.MeshBasicMaterial({ color: '#FFD45A' }));
  sun.position.set(3.7, 7.3, -2.2); stP.add(sun);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture('rgba(255,214,90,0.85)'), transparent: true, depthWrite: false }));
  halo.scale.setScalar(3.4); halo.position.copy(sun.position); stP.add(halo);
  const mistTex = softTexture('rgba(235,242,255,0.55)');
  const mist = []; for (let i = 0; i < 26; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, opacity: 0, depthWrite: false })); sp.position.set(-4.5 + R() * 9, 1.2 + R() * 6.6, -1.8 + R() * 3.6); sp.scale.setScalar(2.2 + R() * 2.4); sp.userData.v = 0.1 + R() * 0.2; stP.add(sp); mist.push(sp); }
  const streakGeo = new THREE.PlaneGeometry(1.6, 0.025);
  const streaks = []; for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(streakGeo, new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0, depthWrite: false })); m.position.set(-6 + R() * 12, 1 + R() * 6.8, -1.5 + R() * 3); m.userData.v = 4 + R() * 3; stP.add(m); streaks.push(m); }
  const look = { sun: 0, mist: 0, wind: 0 };
  function updateWeather(dt, time, experiment) {
    const tk = 1 - Math.exp(-dt * 3);
    look.sun += ((experiment ? (env.light ? 1 : 0.08) : 0) - look.sun) * tk;
    look.mist += ((experiment && env.humid ? 1 : 0) - look.mist) * tk;
    look.wind += ((experiment && env.wind ? 1 : 0) - look.wind) * tk;
    sun.visible = halo.visible = look.sun > 0.12; sun.scale.setScalar(0.4 + 0.6 * look.sun); halo.material.opacity = look.sun;
    if (experiment) scene.environmentIntensity = 0.25 + 0.45 * look.sun;
    keyLight.intensity = 2.1 * (experiment ? 0.25 + 0.75 * look.sun + (env.light ? 0 : 0.05) : 1);
    hemi.intensity = 0.85 * (experiment ? 0.45 + 0.55 * look.sun : 1);
    for (const m of mist) { m.material.opacity = look.mist * 0.75; m.position.x += m.userData.v * dt * (1 + look.wind * 4); if (m.position.x > 5) m.position.x -= 10; }
    for (const s of streaks) { s.material.opacity = look.wind * 0.55; s.position.x += s.userData.v * dt; if (s.position.x > 6) s.position.x = -6; }
    wind.set(look.wind * 1.7, 0, 0);
    const sway = look.wind * 0.09;
    leaves.forEach((lf, i) => { lf.g.rotation.x = lf.roll + Math.sin(time * 3.1 + i) * sway; });
  }

  // ---- labels on the whole plant
  Lb(stP, 'oOrganism', 'the whole plant', V3(3.7, 2.3, 0), { tone: 'nodot', dx: 80, dy: 0, sub: 'an organism' });
  Lb(stP, 'oShoot', 'shoot system', V3(-3.7, 4.5, 0), { tone: 'nodot', dx: -80, dy: 0, sub: 'stem, leaves and flowers' });
  Lb(stP, 'oRoot', 'root system', V3(-3.7, -2.2, 0), { tone: 'nodot', dx: -76, dy: 0, sub: 'all the roots' });
  Lb(stP, 'oLeaf', 'leaf', leafPoint(leaves[0], 0.62, 0.2, 0.03), { tone: 'plant', dx: 70, dy: -50, sub: 'an organ' });
  Lb(stP, 'oStem', 'stem', stemPath.at(0.36, V3()).add(V3(-0.2, 0, 0)), { tone: 'plant', dx: -86, dy: 0, sub: 'an organ' });
  Lb(stP, 'oFlower', 'flower', top.clone().add(V3(-0.4, 0.15, 0)), { tone: 'plant', dx: -76, dy: -26, sub: 'an organ' });
  Lb(stP, 'oRootOrg', 'root', roots[2].path.at(0.6, V3()), { tone: 'plant', dx: 70, dy: 34, sub: 'an organ' });
  Lb(stP, 'pHair', 'root hair cell', FH.tip, { tone: 'water', dx: 90, dy: -60, sub: 'long and thin: a big surface area' });
  Lb(stP, 'pOsm', 'water moves in by osmosis', FH.base.clone().lerp(FH.tip, 0.5), { tone: 'water', dx: 110, dy: 50 });
  Lb(stP, 'pXylem', 'xylem', stemPath.at(0.42, V3()).add(V3(0.07, 0, 0.06)), { tone: 'water', dx: 160, dy: -10, sub: 'water and mineral ions, upwards only' });
  Lb(stP, 'pPhloem', 'phloem', stemPath.at(0.5, V3()).add(V3(-0.13, 0, 0.1)), { tone: 'sugar', dx: -92, dy: -12, sub: 'sugars, up and down' });
  Lb(stP, 'pUp', 'sugar to the flower', top.clone().add(V3(0.2, -0.4, 0)), { tone: 'sugar', dx: 84, dy: 4 });
  Lb(stP, 'pDown', 'sugar to the roots', mainRoot.at(0.45, V3()).add(V3(0.1, 0, 0.2)), { tone: 'sugar', dx: 86, dy: 20 });
  Lb(stP, 'pVap', 'water vapour leaves through stomata', leafPoint(leaves[1], 0.55, 0, -0.35), { tone: 'water', dx: -60, dy: 56 });
  const bracketMat = new THREE.MeshBasicMaterial({ color: '#47526F' });
  const bracket = (x, y0, y1, s) => {
    const pts = [V3(x + 0.35 * s, y0, 0), V3(x, y0, 0), V3(x, y1, 0), V3(x + 0.35 * s, y1, 0)];
    const path = new THREE.CurvePath(); for (let i = 0; i < 3; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 60, 0.04, 6), bracketMat)); stP.add(g); g.visible = false; return g;
  };
  const brOrganism = bracket(3.7, -4.3, 8.9, -1), brShoot = bracket(-3.7, 0.15, 8.9, 1), brRoot = bracket(-3.7, -4.3, -0.15, 1);
  const setBrackets = lv => { brOrganism.visible = lv === 'organism'; brShoot.visible = brRoot.visible = lv === 'system'; };
  // pick hulls for the quick check
  const hRoot = hull(new THREE.BoxGeometry(9.2, 4.3, 5.2), 'roots', stP, V3(0, -2.2, 0));
  const hStem = hull(new THREE.CylinderGeometry(0.45, 0.45, 7.2, 10), 'stem', stP, V3(0, 3.6, 0));
  const hFlower = hull(new THREE.SphereGeometry(0.9, 12, 8), 'flower', stP, flower.position);
  const hLeaves = leaves.map(lf => { const h = hull(new THREE.BoxGeometry(lf.Lg, 0.6, lf.W * 2.2), 'leaves', lf.g, V3(lf.Lg / 2, -0.15 * lf.Lg * 0.3, 0)); h.visible = false; return h; });
  hRoot.visible = hStem.visible = hFlower.visible = false;

  // ===================================================== inside a leaf (tissue level)
  const Rl = rng(44), m4 = new THREE.Matrix4();
  const epiMat = tissue('#DDF1EA', { roughness: 0.35, clearcoat: 0.8, transparent: true, opacity: 0.88 });
  const epi = new THREE.InstancedMesh(new RoundedBoxGeometry(0.98, 0.3, 0.98, 2, 0.1), epiMat, 2 * 10 * 6); epi.frustumCulled = false;
  { let i = 0; for (const y of [1.42, -1.42]) for (let a = 0; a < 10; a++) for (let b = 0; b < 6; b++) { m4.makeTranslation(-4.5 + a, y, -2.5 + b); epi.setMatrixAt(i++, m4); } }
  stL.add(epi);
  const palMat = tissue('#5CC27A', { roughness: 0.45, transparent: true, opacity: 0.72, depthWrite: false });
  const palPos = []; for (let a = 0; a < 14; a++) for (let b = 0; b < 8; b++) palPos.push(V3(-4.55 + a * 0.7, 0.62, -2.62 + b * 0.75));
  const pal = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.29, 0.86, 6, 14), palMat, palPos.length); pal.frustumCulled = false;
  palPos.forEach((p, i) => { m4.makeTranslation(p.x, p.y, p.z); pal.setMatrixAt(i, m4); });
  pal.renderOrder = 2; stL.add(pal);
  const chlGeo = new THREE.SphereGeometry(1, 10, 8);
  const chlMat = tissue('#1C8F3B', { roughness: 0.4 });
  const chl = new THREE.InstancedMesh(chlGeo, chlMat, palPos.length * 9 + 90 * 4); chl.frustumCulled = false;
  let nChl = 0;
  palPos.forEach(p => { for (let k = 0; k < 9; k++) { const a = Rl() * TAU, y = (Rl() - 0.5) * 1.0; m4.compose(V3(p.x + Math.cos(a) * 0.22, p.y + y, p.z + Math.sin(a) * 0.22), new THREE.Quaternion().setFromEuler(new THREE.Euler(Rl(), Rl(), Rl())), V3(0.075, 0.045, 0.05)); chl.setMatrixAt(nChl++, m4); } });
  const spongyMat = tissue('#9ED8A8', { roughness: 0.5, transparent: true, opacity: 0.8, depthWrite: false });
  const spPos = []; while (spPos.length < 90) { const p = V3(-4.6 + Rl() * 9.2, -0.95 + Rl() * 0.85, -2.7 + Rl() * 5.4); if (Math.hypot(p.x - 0.6, p.y + 0.5) < 0.75) continue; if (spPos.every(q => q.distanceTo(p) > 0.62)) spPos.push(p); }
  const spongy = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), spongyMat, spPos.length); spongy.frustumCulled = false;
  spPos.forEach((p, i) => { m4.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(Rl(), Rl(), Rl())), V3(0.26 + Rl() * 0.05, 0.2, 0.24)); spongy.setMatrixAt(i, m4); for (let k = 0; k < 4; k++) { m4.compose(p.clone().add(V3((Rl() - 0.5) * 0.4, (Rl() - 0.5) * 0.3, (Rl() - 0.5) * 0.4)), new THREE.Quaternion(), V3(0.06, 0.04, 0.05)); chl.setMatrixAt(nChl++, m4); } });
  chl.count = nChl; spongy.renderOrder = 2; stL.add(spongy, chl);
  // a vein running through the leaf: xylem above phloem, inside a bundle sheath
  const sheath = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 6.2, 32, 1, true), glass('#CDEFD9', { opacity: 0.6, base: 0.25 })); sheath.rotation.x = Math.PI / 2; sheath.position.set(0.6, -0.5, 0); stL.add(sheath);
  const lxMat = tissue(C.xylem, { roughness: 0.3, clearcoat: 0.8 }), lpMat = tissue(C.phloem, { roughness: 0.35, clearcoat: 0.6 });
  const lx = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 6.2, 28), lxMat); lx.rotation.x = Math.PI / 2; lx.position.set(0.6, -0.3, 0); stL.add(lx);
  const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6.2, 24), lpMat); lp.rotation.x = Math.PI / 2; lp.position.set(0.6, -0.78, 0); stL.add(lp);
  ch.glow.add('pal', palMat); ch.glow.add('lx', lxMat); ch.glow.add('lp', lpMat);
  // a stoma in the lower surface, cut through at the front: two guard cells with the pore between them
  const guardMat = tissue('#3BAA62', { roughness: 0.4, clearcoat: 0.6 });
  const guards = [];
  for (const s of [-1, 1]) { const g = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.9, 6, 16), guardMat); g.rotation.x = Math.PI / 2; g.position.set(-1.8 + s * 0.3, -1.44, 2.55); stL.add(g); guards.push({ g, s }); }
  ch.glow.add('guard', guardMat);
  // vapour leaving through the pore, water arriving from the xylem
  const NV = 46, vap = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ roughness: 0.2, clearcoat: 1, emissive: col('#4AA8FF'), emissiveIntensity: 0.3 }), NV);
  vap.frustumCulled = false; stL.add(vap);
  const vp = Array.from({ length: NV }, (_, i) => ({ i, t: Rl(), d: 2.4 + Rl() * 1.6, a: V3(), b: V3(), c: V3(), e: V3(), water: i < 18 }));
  const pore = V3(-1.8, -1.44, 2.55);
  const respawnV = v => {
    if (v.water) { v.a.set(0.6, -0.3, -2.6 + Rl() * 5.2); const p = spPos[Math.floor(Rl() * spPos.length)]; v.b.copy(p); v.c.copy(p); v.e.copy(p); }
    else { const p = spPos[Math.floor(Rl() * spPos.length)]; v.a.copy(p).add(V3(0, -0.2, 0)); v.b.set(-1.8 + (Rl() - 0.5) * 0.6, -1.0, 2.0 + Rl() * 0.5); v.c.copy(pore); v.e.copy(pore).add(V3((Rl() - 0.5) * 1.6, -1.6 - Rl() * 0.8, 0.4 + Rl() * 0.8)); }
    v.t = 0;
  };
  vp.forEach(v => { respawnV(v); v.t = Rl(); });
  const stomaState = { open: 1 };
  function updateLeafSection(dt) {
    stomaState.open += ((env.light ? 1 : 0) - stomaState.open) * (1 - Math.exp(-dt * 2));
    for (const g of guards) g.g.position.x = -1.8 + g.s * (0.24 + 0.1 * stomaState.open);
    for (const v of vp) {
      v.t += dt / v.d; if (v.t >= 1) respawnV(v);
      const t = v.t; let s = 0.06;
      if (v.water) { tA.lerpVectors(v.a, v.b, easeIO(t)); _c.set(C.water); }
      else {
        if (t < 0.4) tA.lerpVectors(v.a, v.b, easeIO(t / 0.4)); else if (t < 0.6) tA.lerpVectors(v.b, v.c, (t - 0.4) / 0.2); else tA.lerpVectors(v.c, v.e, easeOut((t - 0.6) / 0.4));
        if (t > 0.45 && stomaState.open < 0.35) { s = 0; }
        _c.lerpColors(cWater, cVap, sstep(0.55, 0.8, t)); s *= 1 - sstep(0.85, 1, t);
      }
      _m.compose(tA, _q.identity(), _s.set(s, s, s)); vap.setMatrixAt(v.i, _m); vap.setColorAt(v.i, _c);
    }
    vap.instanceMatrix.needsUpdate = true; vap.instanceColor.needsUpdate = true;
  }
  for (let i = 0; i < NV; i++) vap.setColorAt(i, cWater);
  Lb(stL, 'lEpi', 'epidermis', V3(-3.5, 1.57, 2.5), { tone: 'plant', dx: -60, dy: -40, sub: 'a protective outer layer' });
  Lb(stL, 'lPal', 'palisade cells', V3(-3.4, 0.7, 2.62), { tone: 'plant', dx: -96, dy: -6, sub: 'most photosynthesis happens here' });
  Lb(stL, 'lSp', 'spongy cells and air spaces', V3(3.4, -0.6, 2.6), { tone: 'plant', dx: 92, dy: 26 });
  Lb(stL, 'lXy', 'xylem', V3(0.6, -0.3, 3.1), { tone: 'water', dx: 110, dy: -40, sub: 'brings water into the leaf' });
  Lb(stL, 'lPh', 'phloem', V3(0.6, -0.78, 3.1), { tone: 'sugar', dx: 90, dy: 20, sub: 'takes sugar away' });
  Lb(stL, 'lGuard', 'guard cells', V3(-2.1, -1.44, 3.0), { tone: 'plant', dx: -90, dy: 30, sub: 'open and close the stoma' });
  Lb(stL, 'lStoma', 'stoma', V3(-1.8, -1.62, 3.0), { tone: 'water', dx: 50, dy: 54, sub: 'water vapour diffuses out' });
  Lb(stL, 'lAir', 'water evaporates into the air spaces', V3(-1.2, -0.65, 2.6), { tone: 'water', dx: -70, dy: -110 });

  // ===================================================== one palisade cell (cell level)
  const kWall = new THREE.Mesh(new THREE.CapsuleGeometry(1.45, 3.3, 10, 40), glass('#62C484', { opacity: 0.55, base: 0.12, power: 1.6 })); stK.add(kWall);
  const kMem = new THREE.Mesh(new THREE.CapsuleGeometry(1.33, 3.15, 10, 40), glass('#A9E2B9', { opacity: 0.35, base: 0.05, power: 2.2 })); stK.add(kMem);
  const kVac = new THREE.Mesh(new THREE.CapsuleGeometry(0.88, 2.4, 10, 32), new THREE.MeshPhysicalMaterial({ color: '#BFE4FF', roughness: 0.1, transparent: true, opacity: 0.45, clearcoat: 1, depthWrite: false })); kVac.position.x = 0.12; stK.add(kVac);
  const kNuc = new THREE.Mesh(new THREE.SphereGeometry(0.48, 32, 24), tissue(C.nucleus, { roughness: 0.4 })); kNuc.position.set(-0.85, 0.9, 0.55); stK.add(kNuc);
  const NK = 30, kChl = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), tissue('#22A045', { roughness: 0.35, clearcoat: 0.6 }), NK); kChl.frustumCulled = false; stK.add(kChl);
  const kc = Array.from({ length: NK }, (_, i) => ({ a: (i / NK) * TAU * 3, y: -2.0 + (i / NK) * 4.0, r: 1.15 }));
  ch.glow.add('kChl', kChl.material);
  function updateCell(dt) {
    kc.forEach((c, i) => { c.a += dt * 0.18; c.y += dt * 0.12; if (c.y > 2.1) c.y = -2.1;
      m4.compose(V3(Math.cos(c.a) * c.r, c.y, Math.sin(c.a) * c.r), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -c.a, 0.3)), V3(0.3, 0.17, 0.2)); kChl.setMatrixAt(i, m4); });
    kChl.instanceMatrix.needsUpdate = true;
  }
  Lb(stK, 'kWall', 'cell wall', V3(1.45, 1.3, 0), { tone: 'plant', dx: 84, dy: -30, sub: 'strong, made of cellulose' });
  Lb(stK, 'kChl', 'chloroplasts', V3(-1.15, -0.8, 0.3), { tone: 'plant', dx: -96, dy: 20, sub: 'where photosynthesis happens' });
  Lb(stK, 'kNuc', 'nucleus', kNuc.position, { tone: 'warn', dx: -80, dy: -40 });
  Lb(stK, 'kVac', 'vacuole', V3(0.4, -0.6, 0.6), { tone: 'water', dx: 86, dy: 40, sub: 'full of cell sap' });

  // ===================================================== xylem and phloem, cut open side by side
  const stX = new THREE.Group(); G.add(stX); stX.visible = false;
  const HX = 7.2, XR = 0.95, XX = -1.75, PR = 0.62, PX = 1.55;
  // xylem: one long hollow tube of dead cells, no end walls, rings of lignin
  const xyWall = new THREE.Mesh(new THREE.CylinderGeometry(XR, XR, HX, 48, 1, true, Math.PI / 2, Math.PI),
    new THREE.MeshPhysicalMaterial({ color: '#D9ECFF', roughness: 0.35, clearcoat: 0.6, side: THREE.DoubleSide }));
  xyWall.position.x = XX; stX.add(xyWall);
  const ligMat = tissue('#0B6F60', { roughness: 0.4, clearcoat: 0.5 });
  for (let y = -HX / 2 + 0.3; y < HX / 2; y += 0.42) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(XR - 0.04, 0.075, 8, 40, Math.PI), ligMat);
    ring.rotation.x = -Math.PI / 2;   // the back half, matching the cut wall
    ring.position.set(XX, y, 0); stX.add(ring);
  }
  // faint seams where the dead cells meet: the end walls have gone
  for (const y of [-1.2, 1.2]) {
    const seam = new THREE.Mesh(new THREE.TorusGeometry(XR + 0.01, 0.02, 6, 40, Math.PI), new THREE.MeshBasicMaterial({ color: '#7C8DB0' }));
    seam.rotation.x = -Math.PI / 2; seam.position.set(XX, y, 0); stX.add(seam);
  }
  // phloem: living sieve tube cells joined by sieve plates, each with a companion cell
  const sieveMat = new THREE.MeshPhysicalMaterial({ color: '#FFE7B8', roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide });
  const plateMat = tissue('#E08A00', { roughness: 0.45, side: THREE.DoubleSide });
  const holeMat = new THREE.MeshBasicMaterial({ color: '#5C3A00' });
  const compMat = tissue('#FFD27A', { roughness: 0.5, side: THREE.DoubleSide });
  const CELL = HX / 3;
  for (let k = 0; k < 3; k++) {
    const yc = -HX / 2 + CELL * (k + 0.5);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR, CELL - 0.06, 40, 1, true, Math.PI / 2, Math.PI), sieveMat);
    tube.position.set(PX, yc, 0); stX.add(tube);
    // a few strands of living cytoplasm along the wall
    for (const th of [0.9, 1.6, 2.3]) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), compMat);
      d.position.set(PX - Math.cos(th) * (PR - 0.08), yc + (th - 1.6) * 0.6, -Math.sin(th) * (PR - 0.08)); stX.add(d);
    }
    // companion cell alongside
    const comp = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, CELL * 0.8, 20, 1, true, Math.PI / 2, Math.PI), compMat);
    comp.position.set(PX + PR + 0.3, yc, -0.05); stX.add(comp);
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), tissue(C.nucleus)); nuc.position.set(PX + PR + 0.3, yc + 0.15, -0.1); stX.add(nuc);
    if (k > 0) {   // sieve plate: a wall full of holes between two cells
      const yp = -HX / 2 + CELL * k;
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR, 0.07, 40, 1, false, Math.PI / 2, Math.PI), plateMat); plate.position.set(PX, yp, 0); stX.add(plate);
      for (const [hx, hz] of [[-0.3, -0.2], [0, -0.32], [0.3, -0.2], [-0.15, -0.5], [0.15, -0.5], [0, -0.08]]) {
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), holeMat); h.position.set(PX + hx, yp, hz); stX.add(h);
      }
    }
  }
  // what moves: water up the xylem, sugar through the sieve plates
  const NXW = 34, xw = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshPhysicalMaterial({ color: C.water, roughness: 0.2, clearcoat: 1, emissive: col('#4AA8FF'), emissiveIntensity: 0.3 }), NXW);
  const NXS = 18, xs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: col('#FFF3D6'), emissiveIntensity: 0.4 }), NXS);
  const xsRim = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.17, 0.17), new THREE.MeshBasicMaterial({ color: '#C97800', side: THREE.BackSide }), NXS);
  xw.frustumCulled = xs.frustumCulled = xsRim.frustumCulled = false; stX.add(xw, xsRim, xs);
  const Rx = rng(77);
  const xwP = Array.from({ length: NXW }, () => ({ y: -HX / 2 + Rx() * HX, a: Rx() * Math.PI, r: Rx() * (XR - 0.25) }));
  const xsP = Array.from({ length: NXS }, () => ({ y: -HX / 2 + Rx() * HX, a: Rx() * Math.PI, r: Rx() * (PR - 0.25), s: Rx() * 6 }));
  function updateClose(dt, time) {
    xwP.forEach((w, i) => { w.y += dt * 1.1; if (w.y > HX / 2) w.y -= HX; tA.set(XX + Math.cos(w.a) * w.r * 0.9, w.y, -0.15 - Math.sin(w.a) * w.r * 0.8);
      _m.compose(tA, _q.identity(), _s.set(1, 1, 1)); xw.setMatrixAt(i, _m); });
    xsP.forEach((p, i) => { p.y -= dt * 0.55; if (p.y < -HX / 2) p.y += HX; tA.set(PX + Math.cos(p.a) * p.r * 0.9, p.y, -0.12 - Math.sin(p.a) * p.r * 0.8); p.s += dt;
      _q.setFromEuler(new THREE.Euler(p.s, p.s * 0.7, 0)); _m.compose(tA, _q, _s.set(1, 1, 1)); xs.setMatrixAt(i, _m); xsRim.setMatrixAt(i, _m); });
    xw.instanceMatrix.needsUpdate = xs.instanceMatrix.needsUpdate = xsRim.instanceMatrix.needsUpdate = true;
  }
  Lb(stX, 'xName', 'XYLEM', V3(XX, HX / 2 + 0.2, 0), { tone: 'side nodot', dx: 0, dy: -16, sub: 'carries water, upwards only' });
  Lb(stX, 'pName2', 'PHLOEM', V3(PX + 0.2, HX / 2 + 0.2, 0), { tone: 'side nodot', dx: 0, dy: -16, sub: 'carries sugar, up or down' });
  Lb(stX, 'xDead', 'dead cells: a hollow tube', V3(XX - XR + 0.1, 0.6, -0.2), { tone: 'water', dx: -130, dy: -20 });
  Lb(stX, 'xNoEnd', 'no end walls, so water flows straight through', V3(XX - 0.6, -1.2, -0.6), { tone: 'water', dx: -150, dy: 46 });
  Lb(stX, 'xLig', 'rings of lignin: strong, keeps the tube open', V3(XX + XR - 0.06, 2.4, -0.05), { tone: 'plant', dx: -60, dy: -70 });
  Lb(stX, 'pLive', 'living cells', V3(PX - PR + 0.1, -2.2, -0.2), { tone: 'sugar', dx: 120, dy: 70 });
  Lb(stX, 'pPlate', 'sieve plate: holes let sugar pass', V3(PX + 0.2, -HX / 2 + CELL, -0.3), { tone: 'sugar', dx: 150, dy: 10 });
  Lb(stX, 'pComp', 'companion cell', V3(PX + PR + 0.3, 1.4, 0), { tone: 'sugar', dx: 110, dy: -30 });

  // ===================================================== chapter wiring
  let stage = 'P';
  const show = s => { stage = s; stP.visible = s === 'P'; stL.visible = s === 'L'; stK.visible = s === 'K'; stX.visible = s === 'X'; };
  show('P');
  const camWhole = { t: [0, 2.2, 0], dir: [0.16, 0.12, 1], w: 11.5, h: 14.4 };
  const camSection = { t: [0, -0.1, 0.4], dir: [0.32, 0.26, 1], w: 11.5, h: 6.4 };
  let experiment = false;
  const setFlows = (w, s, vapOnly = false) => { flowOn.water = w; flowOn.sugar = s; flowOn.vapourOnly = vapOnly; waterMesh.visible = w; sugarMesh.visible = sugarRim.visible = s; };
  setFlows(false, false);
  ch.update = (dt, time) => {
    if (stage === 'P') {
      updateXray(dt); updateWeather(dt, time, experiment);
      if (flowOn.water) updateWater(dt);
      if (flowOn.sugar) updateSugar(dt);
      if (drops.visible) updateDrops(dt);
    } else if (stage === 'L') updateLeafSection(dt);
    else if (stage === 'X') updateClose(dt, time);
    else updateCell(dt);
  };
  const resetEnv = () => { Object.assign(env, { light: true, warm: false, wind: false, humid: false }); env.rate = rateOf(env); TINT.set('transparent', false); scene.environmentIntensity = 0.7; };
  ch.exit = () => { experiment = false; resetEnv(); setXray(false); setFlows(false, false); keyLight.intensity = 2.1; hemi.intensity = 0.85; show('P'); updateWeather(1, 0, false); };

  const LEVELS = [
    { k: 'cell', name: 'Cell', ex: 'palisade cell', stage: 'K', cam: { t: [0, 0, 0], dir: [0.25, 0.15, 1], w: 7.5, h: 7 }, labels: ['kWall', 'kChl', 'kNuc', 'kVac'], focus: ['kChl'],
      note: 'Everything is built from <b>cells</b>. Palisade cells are packed with chloroplasts for photosynthesis.' },
    { k: 'tissue', name: 'Tissue', ex: 'palisade', stage: 'L', cam: camSection, labels: ['lPal', 'lXy', 'lPh', 'lEpi'], focus: ['pal'],
      note: 'A <b>tissue</b> is a group of similar cells doing the same job, like this layer of palisade cells. Xylem and phloem are tissues too.' },
    { k: 'organ', name: 'Organ', ex: 'a leaf', stage: 'P', cam: { t: [0.2, 4.4, 0], dir: [0.3, 0.2, 1], w: 7.5, h: 7.4 }, labels: ['oLeaf', 'oStem', 'oFlower'], focus: ['leaf0'],
      note: 'An <b>organ</b> is made of several different tissues working together. Leaves, stems, roots and flowers are organs.' },
    { k: 'system', name: 'Organ system', ex: 'shoot, root', stage: 'P', cam: camWhole, labels: ['oShoot', 'oRoot'], focus: ['stem', 'leaf0', 'flower', 'roots', 'hairs'],
      note: 'Organs working together make an <b>organ system</b>. A plant has two: the shoot system and the root system.' },
    { k: 'organism', name: 'Organism', ex: 'the plant', stage: 'P', cam: camWhole, labels: ['oOrganism'], focus: [],
      note: 'The whole plant is an <b>organism</b>: a complete living thing.' },
  ];
  ch.steps = [
    {
      title: 'Plants are organised in levels',
      text: 'Cells make tissues, tissues make organs, organs make organ systems, and organ systems make the whole plant. Tap a level to zoom.',
      cam: camWhole, labels: ['oOrganism'], focus: [],
      enter: () => { show('P'); setFlows(false, false); setXray(false); setBrackets('organism'); },
      exit: () => setBrackets(''),
      ctl: (el, api) => {
        el.innerHTML = `<div class="ladder" role="group" aria-label="Levels of organisation">${LEVELS.map(l => `<button data-k="${l.k}" aria-pressed="false">${l.name}<small>${l.ex}</small></button>`).join('')}</div><p class="mini" id="lvNote"></p>`;
        const pickLv = async (k, instant) => {
          const L = LEVELS.find(l => l.k === k);
          el.querySelectorAll('.ladder button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
          el.querySelector('#lvNote').innerHTML = L.note;
          if (L.stage !== stage) { await api.flash(() => show(L.stage)); }
          api.labels(L.labels); ch.glow.set(L.focus); setBrackets(k); flyTo(L.cam, instant ? 0 : 1.3, instant);
        };
        el.querySelectorAll('.ladder button').forEach(b => (b.onclick = () => pickLv(b.dataset.k)));
        el.querySelector('#lvNote').innerHTML = LEVELS[4].note;
        el.querySelector('.ladder button[data-k="organism"]').setAttribute('aria-pressed', 'true');
        return () => show('P');
      },
    },
    {
      title: 'Water in, through the root hairs',
      text: '<b>Root hair cells</b> take in <span class="t-water">water</span> from the soil by <b>osmosis</b>. They take in mineral ions too, by a different process. Each long, thin hair gives a big surface area.',
      cam: { t: [FH.tip.x - 0.3, FH.tip.y + 0.2, FH.tip.z], dir: [0.1, 0.16, 1], w: 4.2, h: 2.9 }, labels: ['pHair', 'pOsm'], focus: [],
      enter: () => { show('P'); setFlows(true, false); setXray(true); drops.visible = FH.halo.visible = true; },
      exit: () => { drops.visible = FH.halo.visible = false; },
    },
    {
      title: 'Up the stem, in the xylem',
      text: '<span class="t-water">Xylem</span> vessels are hollow tubes of dead cells with no end walls, strengthened with lignin. They carry water and mineral ions <b>upwards only</b>.',
      cam: { t: [0, 2.3, 0], dir: [0.22, 0.1, 1], w: 4.6, h: 5.8 }, labels: ['pXylem'], focus: ['xylem'],
      enter: () => { show('P'); setFlows(true, false); setXray(true); },
    },
    {
      title: 'Xylem and phloem, up close',
      text: 'Cut open, the two transport tissues look very different. <span class="t-water">Xylem</span> is a hollow tube of dead cells with no end walls, made strong by lignin. <span class="t-sugar">Phloem</span> is made of living cells joined end to end by sieve plates.',
      cam: { t: [0.1, 0.2, 0], dir: [0.12, 0.08, 1], w: 9.5, h: 9.2 }, labels: ['xName', 'pName2', 'xDead', 'xNoEnd', 'xLig', 'pLive', 'pPlate', 'pComp'], focus: [],
      enter: () => api_flash(() => show('X')),
    },
    {
      title: 'Out through the leaves: transpiration',
      text: 'Inside the leaf, water <b>evaporates</b> into the air spaces. The vapour <b>diffuses</b> out through the <b>stomata</b>. This loss of water is <b>transpiration</b>, and it pulls more water up the xylem behind it.',
      cam: { t: [-1.0, -0.75, 1.8], dir: [0.3, 0.1, 1], w: 7.2, h: 4.4 }, labels: ['lAir', 'lStoma', 'lGuard', 'lXy'], focus: ['guard'],
      enter: () => api_flash(() => show('L')),
    },
    {
      title: 'Phloem carries sugar both ways',
      text: 'Leaves make sugar by photosynthesis. <span class="t-sugar">Phloem</span> carries it, dissolved, <b>up and down</b> the plant: to the flower, to growing tips and down to the roots.',
      cam: { t: [0, 1.4, 0], dir: [0.18, 0.12, 1], w: 9, h: 12.6 }, labels: ['pPhloem', 'pUp', 'pDown'], focus: ['phloem'],
      enter: () => { show('P'); setFlows(false, true); setXray(true, true); showChevrons(true); },
      exit: () => showChevrons(false),
    },
    {
      title: 'Experiment: what speeds up transpiration?',
      text: 'Change the conditions and watch the water vapour and the meter. Change one thing at a time to make it a fair test.',
      cam: { t: [0.2, 4.0, 0], dir: [0.14, 0.1, 1], w: 9.2, h: 8.2 }, labels: ['pVap'], focus: [],
      enter: () => { show('P'); setXray(true); setFlows(true, false); experiment = true; },
      exit: () => { experiment = false; resetEnv(); },
      ctl: el => {
        const icon = { light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>',
          warm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14.5V4.8a2 2 0 1 1 4 0v9.7a4 4 0 1 1-4 0z"/><path d="M12 9v7"/></svg>',
          wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8.5h11a3 3 0 1 0-3-3"/><path d="M3 12.5h15a3 3 0 1 1-3 3"/><path d="M3 16.5h7"/></svg>',
          humid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3s6 6.4 6 10.6A6 6 0 0 1 6 13.6C6 9.4 12 3 12 3z"/></svg>' };
        const names = { light: 'Light', warm: 'Warm', wind: 'Windy', humid: 'Humid' };
        el.innerHTML = `<div class="toggles">${Object.keys(names).map(k => `<button class="tog" data-k="${k}" aria-pressed="${env[k]}">${icon[k]}${names[k]}</button>`).join('')}</div>`
          + `<div class="meter"><b id="rate">1.2</b><span>grams of water lost per hour</span><div class="bar"><i id="rateBar"></i></div></div>`
          + `<div class="stoma"><svg viewBox="0 0 46 34"><ellipse id="gL" cx="17" cy="17" rx="8" ry="14" fill="#2FA866"/><ellipse id="gR" cx="29" cy="17" rx="8" ry="14" fill="#2FA866"/><ellipse id="pore" cx="23" cy="17" rx="3.2" ry="10" fill="#1A2238"/></svg><span id="stTxt">In the light the stomata are open, so water vapour can escape.</span></div>`;
        const upd = () => {
          env.rate = rateOf(env);
          el.querySelector('#rate').textContent = env.rate.toFixed(1);
          el.querySelector('#rateBar').style.width = `${Math.min(100, (env.rate / 4) * 100).toFixed(0)}%`;
          el.querySelectorAll('.tog').forEach(b => b.setAttribute('aria-pressed', env[b.dataset.k]));
          const open = env.light;
          el.querySelector('#pore').setAttribute('rx', open ? 3.2 : 0.4);
          el.querySelector('#gL').setAttribute('cx', open ? 17 : 19); el.querySelector('#gR').setAttribute('cx', open ? 29 : 27);
          el.querySelector('#stTxt').textContent = open ? 'In the light the stomata are open, so water vapour can escape.' : 'In the dark the stomata close, so very little water vapour escapes.';
          const dark = 'rgba(10,16,40,.42)', hot = 'radial-gradient(90% 80% at 75% 20%, rgba(255,140,40,.34), rgba(255,120,40,0) 70%)';
          TINT.set(!env.light ? (env.warm ? 'linear-gradient(rgba(10,16,40,.38),rgba(10,16,40,.38)), ' + hot : dark) : env.warm ? hot : 'transparent', env.warm || !env.light);
        };
        el.querySelectorAll('.tog').forEach(b => (b.onclick = () => { env[b.dataset.k] = !env[b.dataset.k]; upd(); }));
        upd();
        return () => resetEnv();
      },
    },
    {
      title: 'Quick check',
      text: 'Tap the part of the plant where <b>water gets in</b>.',
      cam: camWhole, labels: [], focus: [],
      enter: () => { show('P'); setFlows(false, false); setXray(false); },
      check: { answer: 'roots', pick: [hRoot, hStem, hFlower, ...hLeaves],
        yes: 'Yes: the <b>roots</b>. Root hair cells take in water from the soil by osmosis.',
        no: 'Water gets in through the <b>roots</b>: root hair cells take it in from the soil by osmosis.' },
      labelsAfter: ['oRoot'],
    },
  ];
  let api_flash = f => f();
  ch.bindApi = api => { api_flash = api.flash; };
  return ch;
}
