// ============================================================== chapter 2: blood
function chBlood() {
  const ch = { id: 'blood', name: 'Blood', group: new THREE.Group(), glow: new Glow(), legend: 'parts', labels: {} };
  const G = ch.group;
  const stA = new THREE.Group(), stB = new THREE.Group(), stC = new THREE.Group();
  G.add(stA, stB, stC);
  const L = (parent, key, text, pos, o) => { const l = label(text, o); l.position.copy(pos); parent.add(l); ch.labels[key] = l; return l; };

  // ================= A: the centrifuge
  const metal = new THREE.MeshPhysicalMaterial({ color: '#5E677C', metalness: 0.55, roughness: 0.32, clearcoat: 0.6 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.7, 0.9, 64), new THREE.MeshPhysicalMaterial({ color: '#D9DEE9', roughness: 0.5, clearcoat: 0.4 }));
  base.position.y = -0.95; stA.add(base);
  const rotor = new THREE.Group(); stA.add(rotor);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.32, 64), metal); rotor.add(disc);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.6, 32), metal); hub.position.y = 0.3; rotor.add(hub);
  // tube geometry: glass wall + contents built from the same profile
  const TR = 0.42, TH = 3.6;
  const wallX = h => (h < TR ? Math.sqrt(Math.max(0, TR * TR - (TR - h) * (TR - h))) : TR);
  const fill = (h0, h1, r = TR * 0.94) => {
    const pts = [new THREE.Vector2(0.001, h0)]; const n = 18;
    for (let i = 0; i <= n; i++) { const h = lerp(h0, h1, i / n); pts.push(new THREE.Vector2(Math.max(0.001, wallX(h) * (r / TR)), h)); }
    pts.push(new THREE.Vector2(0.001, h1)); return new THREE.LatheGeometry(pts, 40);
  };
  const glassPts = []; for (let i = 0; i <= 24; i++) { const h = (TH * i) / 24; glassPts.push(new THREE.Vector2(Math.max(0.001, wallX(h) + 0.03), h)); }
  const tubeGlass = new THREE.Mesh(new THREE.LatheGeometry(glassPts, 40), glass('#DDE8FF', { opacity: 0.5, power: 1.4, base: 0.08 }));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.36, 32), new THREE.MeshPhysicalMaterial({ color: '#7C5CD6', roughness: 0.4, clearcoat: 0.6 }));
  cap.position.y = TH + 0.14;
  const HB = 2.95, H_RBC = 1.3, H_BUF = 1.37;
  const whole = new THREE.Mesh(fill(0.02, HB), tissue('#9E1F27', { roughness: 0.25, clearcoat: 1, sheen: 0 }));
  const layRBC = new THREE.Mesh(fill(0.02, H_RBC), tissue('#B3242C', { roughness: 0.25, clearcoat: 1, sheen: 0 }));
  const layBuf = new THREE.Mesh(fill(H_RBC, H_BUF), tissue('#FBF7EF', { roughness: 0.5 }));
  const layPla = new THREE.Mesh(fill(H_BUF, HB), new THREE.MeshPhysicalMaterial({ color: '#F4C14A', roughness: 0.12, transmission: 0, transparent: true, opacity: 0.82, clearcoat: 1 }));
  layRBC.visible = layBuf.visible = layPla.visible = false;
  const tube = new THREE.Group(); tube.add(tubeGlass, cap, whole, layRBC, layBuf, layPla);
  const balance = tube.clone(true);   // the second tube is blood too: a centrifuge must be balanced
  const slotA = new THREE.Group(), slotB = new THREE.Group();
  slotA.position.set(2.1, 0.2, 0); slotB.position.set(-2.1, 0.2, 0); slotB.rotation.y = Math.PI;
  rotor.add(slotA, slotB); slotA.add(tube); slotB.add(balance);
  tube.position.y = 0; balance.position.y = 0;
  ch.glow.add('tube', tubeGlass.material);
  const lift = new THREE.Group(); stA.add(lift); lift.position.set(0, 0.9, 1.6);
  // the labels ride on the tube, so they line up with its layers at any size
  L(tube, 'plasma', 'plasma', V3(TR, (H_BUF + HB) / 2, 0), { tone: 'sugar', dx: 100, dy: -10, sub: 'about 55% · a yellow liquid' });
  L(tube, 'buffy', 'white blood cells and platelets', V3(TR, (H_RBC + H_BUF) / 2, 0), { dx: 110, dy: 30, sub: 'under 1%' });
  L(tube, 'rbcLayer', 'red blood cells', V3(TR, H_RBC / 2, 0), { tone: 'oxy', dx: 100, dy: 50, sub: 'about 45%' });
  const camSpin = { t: [0, 1.3, 0.4], dir: [0.12, 0.42, 1], w: 9.5, h: 7.2 }, camTube = { t: [0.9, 3.0, 1.6], dir: [0.1, 0.12, 1], w: 7.6, h: 5.6 };
  const spin = { w: 0, t: -1, state: 'idle' };
  function resetTube() {
    slotA.add(tube); tube.position.set(0, 0, 0); tube.rotation.set(0, 0, 0); tube.scale.setScalar(1);
    whole.visible = true; layRBC.visible = layBuf.visible = layPla.visible = false; rotor.rotation.y = 0; slotA.rotation.z = slotB.rotation.z = 0;
    for (const [i, v] of [[2, true], [3, false], [4, false], [5, false]]) balance.children[i].visible = v;
    balance.visible = true;
  }
  function startSpin(fly) { resetTube(); spin.t = 0; spin.state = 'spin'; for (const k of ['plasma', 'buffy', 'rbcLayer']) ch.showLabel?.(k, false); if (fly) flyTo(camSpin, 1.0); }
  function updateSpin(dt) {
    if (spin.state !== 'spin') return;
    spin.t += dt; const t = spin.t;
    spin.w = t < 1.1 ? 15 * easeIO(t / 1.1) : t < 2.7 ? 15 : t < 4.0 ? 15 * (1 - easeIO((t - 2.7) / 1.3)) : 0;
    rotor.rotation.y += spin.w * dt;
    const tilt = Math.min(1, spin.w / 9) * 1.1;
    slotA.rotation.z = -tilt; slotB.rotation.z = -tilt;
    if (t > 1.8 && whole.visible) { whole.visible = false; layRBC.visible = layBuf.visible = layPla.visible = true;
      for (const [i, v] of [[2, false], [3, true], [4, true], [5, true]]) balance.children[i].visible = v; }
    if (t >= 4.0) {
      spin.state = 'lift';
      const wp = V3(); tube.getWorldPosition(wp); lift.worldToLocal(wp);
      lift.add(tube); tube.position.copy(wp); tube.rotation.set(0, 0, 0);
      const p0 = tube.position.clone();
      flyTo(camTube, 1.3); balance.visible = false;
      tween(1.1, k => { tube.position.lerpVectors(p0, V3(0, 0, 0), k); tube.scale.setScalar(lerp(1, 1.2, k)); })
        .then(() => { spin.state = 'done'; for (const k of ['plasma', 'buffy', 'rbcLayer']) ch.showLabel?.(k, true); });
    }
  }

  // ================= B: inside a drop of blood
  const bgMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { uA: { value: col('#FCE7B5') }, uB: { value: col('#E9B95C') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uA; uniform vec3 uB; varying vec3 vP; void main(){ float k = smoothstep(-0.6, 0.9, vP.y*0.6 + vP.z*0.5); gl_FragColor = vec4(mix(uB, uA, k), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const bg = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), bgMat); stB.add(bg);
  const Rb = rng(21), rbcGeo = rbcGeometry();
  const rbcMatB = new THREE.MeshPhysicalMaterial({ color: '#D2333A', roughness: 0.34, clearcoat: 0.8, sheen: 0.4, sheenColor: col('#FF9C9C') });
  const NB = 110, drift = [];
  const rbcs = new THREE.InstancedMesh(rbcGeo, rbcMatB, NB); rbcs.frustumCulled = false; stB.add(rbcs);
  for (let i = 0; i < NB; i++) drift.push({ p: V3(-30 + Rb() * 60, -15 + Rb() * 30, -40 + Rb() * 28), ax: V3(Rb() - 0.5, Rb() - 0.5, Rb() - 0.5).normalize(), a: Rb() * TAU, v: 0.25 + Rb() * 0.35 });
  const wbcMat = tissue('#E6E2FF', { roughness: 0.55, transparent: true, opacity: 0.7, depthWrite: false, clearcoat: 0.3, sheen: 0.9, sheenColor: col('#FFFFFF') });
  const nucMat = tissue('#7B4FC0', { roughness: 0.4 });
  const wbcs = [];
  for (const [x, y, z, s] of [[0, 0.2, 0, 2.0], [13, -6, -26, 1.9], [-15, 7, -32, 1.8]]) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const m = new THREE.Mesh(blobGeometry(s, 4, 0.08, 9, (x * 7) | 0), wbcMat); m.userData.pick = 'wbc'; m.renderOrder = 3; g.add(m);
    for (const [a, b, c] of [[-0.35, 0.15, 0], [0.32, 0.22, 0.05], [0.02, -0.3, -0.05]]) { const n = new THREE.Mesh(new THREE.SphereGeometry(s * 0.34, 20, 14), nucMat); n.position.set(a * s, b * s, c * s); g.add(n); }
    stB.add(g); wbcs.push(g);
  }
  ch.glow.add('wbc', wbcMat, nucMat);
  const platGeo = new THREE.IcosahedronGeometry(1, 1); platGeo.scale(0.3, 0.12, 0.22);
  const platMat = tissue('#8E7CD0', { roughness: 0.5 });
  const NP = 40, plats = new THREE.InstancedMesh(platGeo, platMat, NP); plats.frustumCulled = false; stB.add(plats);
  const pdrift = []; for (let i = 0; i < NP; i++) pdrift.push({ p: V3(-26 + Rb() * 52, -13 + Rb() * 26, -28 + Rb() * 22), ax: V3(Rb(), Rb(), Rb()).normalize(), a: Rb() * TAU, v: 0.3 + Rb() * 0.3 });
  ch.glow.add('platelet', platMat); ch.glow.add('rbc', rbcMatB);
  // the line-up in front: one of each
  const heroRBC = new THREE.Mesh(rbcGeo, rbcMatB); heroRBC.scale.setScalar(1.1); heroRBC.position.set(-4.7, 0.2, 0); heroRBC.rotation.set(0.95, 0, 0.18); heroRBC.userData.pick = 'rbc'; stB.add(heroRBC);
  const heroPlats = [];
  for (const [x, y, z] of [[4.3, 0.75, 0.2], [5.1, 0.05, -0.2], [4.1, -0.35, 0.3], [5.05, 0.95, -0.4]]) { const m = new THREE.Mesh(platGeo, platMat); m.position.set(x, y, z); m.scale.setScalar(1.25); m.rotation.set(Rb() * 3, Rb() * 3, 0); m.userData.pick = 'platelet'; stB.add(m); heroPlats.push(m); }
  L(stB, 'dRbc', 'red blood cell', V3(-4.7, 0.95, 0), { tone: 'oxy', dx: 0, dy: -70 });
  L(stB, 'dWbc', 'white blood cell', V3(0, 2.15, 0), { tone: 'warn', dx: 0, dy: -44 });
  L(stB, 'dPlat', 'platelets', V3(4.6, 1.15, 0), { tone: 'warn', dx: 0, dy: -62 });
  L(stB, 'dPlasma', 'plasma', V3(-4.6, -2.7, 0), { tone: 'nodot', dx: 0, dy: 0, sub: 'the yellow liquid all around' });
  const PARTS = {
    plasma: ['#F2C14A', 'Plasma', 'A yellow liquid, mostly water. It carries the blood cells, plus dissolved glucose, carbon dioxide, urea, hormones and salts.'],
    rbc: ['#D2333A', 'Red blood cells', 'Carry oxygen from the lungs to every cell. A drop of blood the size of a pinhead holds about 5 million.'],
    wbc: ['#8B6FD6', 'White blood cells', 'Destroy pathogens, the microbes that cause disease. Some engulf them; others make antibodies. Each has a nucleus.'],
    platelet: ['#8E7CD0', 'Platelets', 'Tiny fragments of cells. They help blood to clot at a cut, which stops bleeding and keeps pathogens out.'],
  };
  const PART_LABEL = { plasma: 'dPlasma', rbc: 'dRbc', wbc: 'dWbc', platelet: 'dPlat' };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = V3();
  function updateDrop(dt, time) {
    for (let i = 0; i < NB; i++) { const d = drift[i]; d.p.x += d.v * dt; if (d.p.x > 26) d.p.x -= 52; d.a += dt * 0.35; _q.setFromAxisAngle(d.ax, d.a); _s.setScalar(0.62); _m.compose(d.p, _q, _s); rbcs.setMatrixAt(i, _m); }
    rbcs.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < NP; i++) { const d = pdrift[i]; d.p.x += d.v * dt; if (d.p.x > 26) d.p.x -= 52; d.a += dt * 0.6; _q.setFromAxisAngle(d.ax, d.a); _s.setScalar(1); _m.compose(d.p, _q, _s); plats.setMatrixAt(i, _m); }
    plats.instanceMatrix.needsUpdate = true;
    wbcs.forEach((w, i) => { w.rotation.y += dt * 0.12 * (i + 1); });
    heroRBC.position.y = 0.2 + Math.sin(time * 0.9) * 0.08;
    heroPlats.forEach((m, i) => { m.rotation.y += dt * (0.4 + i * 0.1); });
    if (scene.fog) { const d = camera.position.distanceTo(controls.target); scene.fog.near = d + 6; scene.fog.far = d + 46; }
  }

  // ================= C: one red blood cell, cut open
  const RR = 3;
  const cellMat = new THREE.MeshPhysicalMaterial({ color: '#8E1D27', roughness: 0.3, clearcoat: 0.85, clearcoatRoughness: 0.25, sheen: 0.5, sheenColor: col('#FF8080'), side: THREE.DoubleSide });
  const fullCell = new THREE.Mesh(rbcGeometry(64), cellMat); fullCell.scale.setScalar(RR);
  const halfPts = []; { const N = 26, h = x => 0.5 * Math.sqrt(Math.max(0, 1 - x * x)) * (0.207 + 2.003 * x * x - 1.123 * x ** 4);
    for (let i = 0; i <= N; i++) { const x = Math.sin((i / N) * Math.PI / 2); halfPts.push(new THREE.Vector2(Math.max(1e-3, x), h(x))); }
    for (let i = N - 1; i >= 0; i--) { const x = Math.sin((i / N) * Math.PI / 2); halfPts.push(new THREE.Vector2(Math.max(1e-3, x), -h(x))); } }
  const halfCell = new THREE.Mesh(new THREE.LatheGeometry(halfPts, 48, Math.PI / 2, Math.PI), cellMat); halfCell.scale.setScalar(RR);
  const capMat = new THREE.MeshPhysicalMaterial({ color: '#C2363C', roughness: 0.55, sheen: 0.6, sheenColor: col('#FFB0A8'), side: THREE.DoubleSide });
  const section = new THREE.Mesh(new THREE.ShapeGeometry(rbcProfileShape(RR), 1), capMat); section.position.z = 0.002;
  // haemoglobin: the cut face is packed with tiny molecules
  const hbN = 520, hb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: '#6E0F18', roughness: 0.5 }), hbN);
  { const Rh = rng(5), h = x => 0.5 * Math.sqrt(Math.max(0, 1 - x * x)) * (0.207 + 2.003 * x * x - 1.123 * x ** 4); let i = 0;
    while (i < hbN) { const x = Rh() * 2 - 1, y = (Rh() * 2 - 1) * 0.35; if (Math.abs(y) < h(Math.abs(x)) * 0.92) { _m.makeTranslation(x * RR, y * RR, 0.03); hb.setMatrixAt(i++, _m); } } }
  hb.frustumCulled = false;
  const cellGroup = new THREE.Group(); cellGroup.add(fullCell, halfCell, section, hb); stC.add(cellGroup);
  cellGroup.rotation.x = 0.36;
  const setCut = on => { fullCell.visible = !on; halfCell.visible = section.visible = hb.visible = on; };
  setCut(true);
  ch.glow.add('cell', cellMat);

  // ================= D: one red blood cell going round: lungs -> heart -> body -> heart -> lungs (one way only)
  const stD = new THREE.Group(); G.add(stD);
  const o2Geo = (() => { const a = new THREE.SphereGeometry(0.15, 14, 10); a.translate(-0.1, 0, 0); const b = new THREE.SphereGeometry(0.15, 14, 10); b.translate(0.1, 0, 0);
    const g = new THREE.BufferGeometry(); const pa = a.attributes.position.array, pb = b.attributes.position.array, na = a.attributes.normal.array, nb = b.attributes.normal.array;
    g.setAttribute('position', new THREE.Float32BufferAttribute([...pa, ...pb], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([...na, ...nb], 3));
    const ia = [...a.index.array], off = a.attributes.position.count; g.setIndex([...ia, ...b.index.array].map((v, k) => (k < ia.length ? v : v + off))); return g; })();
  // the places
  const BOXX = 6.4;
  const lungBox = new THREE.Mesh(new RoundedBoxGeometry(4.6, 5.2, 3.0, 6, 1.3), glass('#F5A9B0', { opacity: 0.4, base: 0.24, power: 1.5 })); lungBox.position.set(-BOXX, 0, -0.4); stD.add(lungBox);
  const bodyBox = new THREE.Mesh(new RoundedBoxGeometry(4.6, 5.2, 3.0, 6, 1.3), glass('#E8B4A2', { opacity: 0.32, base: 0.2, power: 1.5 })); bodyBox.position.set(BOXX, 0, -0.4); stD.add(bodyBox);
  const tcMat = tissue(C.tissue, { roughness: 0.55, clearcoat: 0.3 });
  const tCells = [];
  for (const [x, y, z] of [[5.6, -1.65, -0.9], [7.2, -1.55, -0.8], [5.7, 1.7, -0.9], [7.25, 1.6, -0.8], [7.6, 0.05, -1.0]]) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.0, 1.05, 3, 0.3), tcMat); m.position.set(x, y, z); stD.add(m); tCells.push(m);
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), tissue(C.nucleus)); n.position.set(x, y, z + 0.45); stD.add(n);
  }
  // a simple heart in the middle: both routes pass through it
  const heartShape = new THREE.Shape(); heartShape.moveTo(0, -1.25); heartShape.bezierCurveTo(-0.3, -0.95, -1.3, -0.3, -1.3, 0.35); heartShape.bezierCurveTo(-1.3, 1.0, -0.65, 1.3, -0.3, 1.05);
  heartShape.bezierCurveTo(-0.12, 0.92, 0, 0.75, 0, 0.62); heartShape.bezierCurveTo(0, 0.75, 0.12, 0.92, 0.3, 1.05); heartShape.bezierCurveTo(0.65, 1.3, 1.3, 1.0, 1.3, 0.35);
  heartShape.bezierCurveTo(1.3, -0.3, 0.3, -0.95, 0, -1.25);
  const heartIcon = new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.2, bevelSegments: 4, curveSegments: 24 }), tissue(C.muscle, { roughness: 0.4, clearcoat: 0.7 }));
  heartIcon.scale.setScalar(1.25); heartIcon.position.set(0, 0.15, -1.1); stD.add(heartIcon);
  // the loop: top edge lungs -> heart -> body (rich in oxygen), bottom edge body -> heart -> lungs (low in oxygen)
  const loopPts = [V3(-5.4, 1.35, 0.3), V3(-2.6, 1.35, 0.3), V3(0, 1.0, 0.3), V3(2.6, 1.35, 0.3), V3(5.4, 1.35, 0.3), V3(7.6, 1.0, 0.3), V3(8.0, 0, 0.3), V3(7.6, -1.0, 0.3),
    V3(5.4, -1.35, 0.3), V3(2.6, -1.35, 0.3), V3(0, -0.7, 0.3), V3(-2.6, -1.35, 0.3), V3(-5.4, -1.35, 0.3), V3(-7.6, -1.0, 0.3), V3(-8.0, 0, 0.3), V3(-7.6, 1.0, 0.3)];
  const loop = new THREE.CatmullRomCurve3(loopPts, true, 'centripetal');
  const loopGeo = new THREE.TubeGeometry(loop, 220, 0.62, 18, true);
  const cO = col(C.oxy), cD = col(C.deoxy), tc = new THREE.Color();
  const oxyAt = u => { const p = loop.getPointAt(u); if (p.x < -4) return sstep(0.5, -0.5, p.y); if (p.x > 4) return sstep(-0.5, 0.5, p.y); return p.y > 0 ? 1 : 0; };
  tubeColors(loopGeo, u => tc.lerpColors(cD, cO, oxyAt(u)).clone());
  const loopMesh = new THREE.Mesh(loopGeo, new THREE.MeshPhysicalMaterial({ vertexColors: true, transparent: true, opacity: 0.32, roughness: 0.25, clearcoat: 1, depthWrite: false }));
  stD.add(loopMesh);
  // chevrons on the loop
  const chev = new THREE.ConeGeometry(0.26, 0.55, 18); chev.translate(0, 0.27, 0);
  for (const u of [0.05, 0.2, 0.55, 0.7]) {
    const m = new THREE.Mesh(chev, tissue(oxyAt(u) > 0.5 ? C.oxy : C.deoxy, { roughness: 0.35, clearcoat: 0.8 }));
    m.position.copy(loop.getPointAt(u)); m.quaternion.setFromUnitVectors(V3(0, 1, 0), loop.getTangentAt(u)); stD.add(m);
  }
  const shut = new THREE.Mesh(rbcGeometry(48), new THREE.MeshPhysicalMaterial({ color: '#7E1A24', roughness: 0.32, clearcoat: 0.85, sheen: 0.5, sheenColor: col('#FF8080') }));
  shut.scale.setScalar(0.92); stD.add(shut);
  // oxygen molecules: white with a dark rim, so they stand out from the red cell
  const NO = 30;
  const o2 = new THREE.InstancedMesh(o2Geo, new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: col('#FFFFFF'), emissiveIntensity: 0.35, roughness: 0.35 }), NO);
  const o2rim = new THREE.InstancedMesh(o2Geo, new THREE.MeshBasicMaterial({ color: '#141D36', side: THREE.BackSide }), NO);
  o2.frustumCulled = o2rim.frustumCulled = false; stD.add(o2rim, o2);
  const Ro = rng(8), SLOTS = 12;
  const slotPos = i => { const a = (i / SLOTS) * TAU; return V3(Math.cos(a) * 0.62, 0.2 * (i % 2 ? 1 : -1), Math.sin(a) * 0.62); };
  const inLung = () => V3(-BOXX + (Ro() - 0.5) * 3.4, (Ro() - 0.5) * 4.0, -0.4 + (Ro() - 0.5) * 2.0);
  const mols = Array.from({ length: NO }, (_, i) => ({ i, state: 'free', p: inLung(), v: V3(Ro() - 0.5, Ro() - 0.5, Ro() - 0.5).multiplyScalar(0.5), slot: -1, t: 0, from: V3(), to: V3(), a: Ro() * TAU }));
  const shuttle = { u: 0.86, load: 0, onChange: null, slots: Array(SLOTS).fill(null), last: '' };
  const cDark = col('#7E1A24'), cBright = col('#E8443C');
  const _w = V3(), _rs = V3();
  const zoneOf = p => (p.x < -4.2 ? 'lungs' : p.x > 4.2 ? 'body' : p.y > 0 ? 'toBody' : 'toLungs');
  function updateShuttle(dt, time) {
    loop.getPointAt(shuttle.u, shut.position);
    const zone = zoneOf(shut.position);
    const speed = zone === 'lungs' || zone === 'body' ? 0.022 : 0.055;    // slow down where the swapping happens
    shuttle.u = (shuttle.u + speed * dt) % 1;
    shut.rotation.set(Math.PI / 2 - 0.3, time * 0.5, 0);
    if (zone === 'lungs') {
      for (let k = 0; k < SLOTS; k++) if (!shuttle.slots[k] && Ro() < dt * 3.2) {
        let best = null, bd = 1e9; for (const m of mols) if (m.state === 'free') { const d = m.p.distanceToSquared(shut.position); if (d < bd) { bd = d; best = m; } }
        if (best) { best.state = 'in'; best.slot = k; best.t = 0; best.from.copy(best.p); shuttle.slots[k] = best; }
      }
    }
    if (zone === 'body') {
      for (let k = 0; k < SLOTS; k++) { const m = shuttle.slots[k]; if (m && m.state === 'bound' && Ro() < dt * 2.0) {
        m.state = 'out'; m.t = 0; m.from.copy(m.p); const c = tCells[Math.floor(Ro() * tCells.length)]; m.to.copy(c.position).add(V3((Ro() - 0.5) * 0.5, (Ro() - 0.5) * 0.4, 0.35)); shuttle.slots[k] = null; } }
    }
    let load = 0;
    for (const m of mols) {
      if (m.state === 'free') {
        m.p.addScaledVector(m.v, dt);
        for (const ax of ['x', 'y', 'z']) { const lo = { x: -BOXX - 1.8, y: -2.2, z: -1.4 }[ax], hi = { x: -BOXX + 1.8, y: 2.2, z: 0.6 }[ax]; if (m.p[ax] < lo || m.p[ax] > hi) { m.v[ax] *= -1; m.p[ax] = clamp(m.p[ax], lo, hi); } }
      } else if (m.state === 'in') {
        m.t += dt / 0.7; _w.copy(slotPos(m.slot)).applyQuaternion(shut.quaternion).multiplyScalar(0.92).add(shut.position);
        m.p.lerpVectors(m.from, _w, easeIO(Math.min(1, m.t))); if (m.t >= 1) m.state = 'bound';
      } else if (m.state === 'bound') {
        m.p.copy(slotPos(m.slot)).applyQuaternion(shut.quaternion).multiplyScalar(0.92).add(shut.position); load++;
      } else if (m.state === 'out') {
        m.t += dt / 1.1; m.p.lerpVectors(m.from, m.to, easeIO(Math.min(1, m.t)));
        if (m.t >= 1) { m.state = 'free'; m.p.copy(inLung()); m.slot = -1; }   // used by the cell; fresh oxygen keeps arriving in the lungs
      }
      m.a += dt * 1.5;
      const hidden = m.state === 'out' && m.t > 0.92;
      _q.setFromEuler(new THREE.Euler(m.a, m.a * 0.6, 0));
      _m.compose(m.p, _q, _s.setScalar(hidden ? 0.001 : 1)); o2.setMatrixAt(m.i, _m);
      _m.compose(m.p, _q, _rs.setScalar(hidden ? 0.001 : 1.22)); o2rim.setMatrixAt(m.i, _m);
    }
    o2.instanceMatrix.needsUpdate = true; o2rim.instanceMatrix.needsUpdate = true;
    shuttle.load += (load - shuttle.load) * (1 - Math.exp(-dt * 6));
    shut.material.color.lerpColors(cDark, cBright, shuttle.load / SLOTS);
    if (shuttle.onChange) shuttle.onChange(zone, load, SLOTS);
  }
  L(stD, 'zLung', 'In the lungs', V3(-BOXX, 2.75, -0.4), { tone: 'side nodot', dx: 0, dy: -14, sub: 'lots of oxygen' });
  L(stD, 'zBody', 'In the body', V3(BOXX, 2.75, -0.4), { tone: 'side nodot', dx: 0, dy: -14, sub: 'cells using up oxygen' });
  L(stD, 'zO2', 'oxygen', V3(-BOXX - 1.2, -1.6, 0.3), { dx: -36, dy: 60 });
  L(stD, 'zCell', 'body cells', V3(7.2, -1.55, 0), { dx: 40, dy: 60 });
  L(stD, 'zHeart', 'heart', V3(0, 1.5, -0.6), { dx: 0, dy: -60, sub: 'pumps the blood round' });
  const shutLabel = label('red blood cell', { tone: 'follow nodot', dx: 0, dy: -50 }); stD.add(shutLabel); ch.labels.zRbc = shutLabel;

  // labels ride on the cell itself (cell axis = y, cut face = the z = 0 plane)
  L(cellGroup, 'cNuc', 'no nucleus', V3(0.1, 0, 0.04), { dx: 70, dy: -150, sub: 'more room for haemoglobin' });
  L(cellGroup, 'cDent', 'dented on both sides', V3(-0.6, 0.34, 0.04), { dx: -130, dy: -120, sub: 'a large surface area: oxygen diffuses in and out fast' });
  L(cellGroup, 'cHb', 'packed with haemoglobin', V3(-0.66 * RR, 0, 0.05), { dx: -40, dy: 110, sub: 'the red protein that carries oxygen' });
  L(cellGroup, 'cSize', 'small and flexible', V3(RR * 0.97, -0.05, -0.5), { dx: 40, dy: 110, sub: 'squeezes through the narrowest capillaries' });

  // ================= chapter wiring
  let stage = 'A';
  function show(s) { stage = s; stA.visible = s === 'A'; stB.visible = s === 'B'; stC.visible = s === 'C'; stD.visible = s === 'D'; scene.fog = s === 'B' ? new THREE.Fog('#F4D9A0', 20, 50) : null; }
  show('A');
  ch.update = (dt, time) => {
    if (stage === 'A') updateSpin(dt);
    if (stage === 'B') updateDrop(dt, time);
    if (stage === 'C') cellGroup.position.y = Math.sin(time * 0.8) * 0.06;
    if (stage === 'D') { updateShuttle(dt, time); shutLabel.position.copy(shut.position); }
  };
  ch.exit = () => { scene.fog = null; };
  function partsCtl(el) {
    el.innerHTML = `<div class="seg" role="group" aria-label="Parts of the blood">${Object.entries(PARTS).map(([k, v]) => `<button data-k="${k}" aria-pressed="false">${v[1].replace('blood cells', 'cells')}</button>`).join('')}</div><div id="partInfo"></div>`;
    const info = el.querySelector('#partInfo');
    const pick = k => {
      const [c, n, d] = PARTS[k];
      info.innerHTML = `<div class="info"><i class="sw" style="background:${c}"></i><div><b>${n}</b><p>${d}</p></div></div>`;
      el.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
      ch.glow.set([k === 'plasma' ? '' : k]);
      for (const [pk, lk] of Object.entries(PART_LABEL)) ch.labels[lk]?.userData.el.classList.toggle('follow', pk === k);
    };
    el.querySelectorAll('.seg button').forEach(b => (b.onclick = () => pick(b.dataset.k)));
    ch.onPick = k => { if (PARTS[k]) pick(k); };
    pick('rbc');
    return () => { ch.onPick = null; };
  }
  ch.steps = [
    {
      title: 'What is blood made of?',
      text: 'Spin a tube of blood very fast and it separates into layers. More than half is a yellow liquid, <b>plasma</b>. The rest is cells.',
      cam: { t: [0, 1.3, 0.4], dir: [0.12, 0.42, 1], w: 9.5, h: 7.2 }, labels: [], focus: ['tube'],
      enter: () => { show('A'); startSpin(); },
      ctl: el => { el.innerHTML = '<div class="row"><button class="btn small" id="respin">Spin it again</button></div>'; el.querySelector('#respin').onclick = () => startSpin(true); },
    },
    {
      title: 'Zoom into one drop',
      text: 'In one drop of blood: <span class="t-oxy">red blood cells</span>, white blood cells and platelets, all floating in plasma. Tap a part, here or on the model, to see its job.',
      cam: { t: [0, 0.2, 0], dir: [0, 0.06, 1], w: 13.5, h: 7.2 }, labels: ['dRbc', 'dWbc', 'dPlat', 'dPlasma'], focus: [],
      enter: () => show('B'), ctl: partsCtl, pickAny: () => [heroRBC, ...heroPlats, wbcs[0].children[0]],
    },
    {
      title: 'Red blood cells: built to carry oxygen',
      text: 'Here is one red blood cell, cut in half. Every feature helps it carry more oxygen, or carry it faster.',
      cam: { t: [0, 0.2, 0], dir: [0.22, 0.4, 1], w: 11.5, h: 8.2 }, labels: ['cNuc', 'cDent', 'cHb', 'cSize'], focus: [],
      enter: () => { show('C'); setCut(true); },
      ctl: el => {
        el.innerHTML = '<div class="seg" role="group" aria-label="View"><button aria-pressed="true" data-v="cut">Cut in half</button><button aria-pressed="false" data-v="whole">Whole cell</button></div>';
        el.querySelectorAll('button').forEach(b => (b.onclick = () => { setCut(b.dataset.v === 'cut'); el.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); }));
      },
    },
    {
      title: 'Picking oxygen up, letting it go',
      text: 'Watch one red blood cell go round. In the lungs, <b>oxygen</b> (white) joins its haemoglobin to make <b>oxyhaemoglobin</b>, and the cell turns bright red. In the body, where oxygen is low, it lets the oxygen go.',
      cam: { t: [0, 0.4, 0], dir: [0.05, 0.22, 1], w: 18.5, h: 7.6 }, labels: ['zLung', 'zBody', 'zO2', 'zCell', 'zRbc', 'zHeart'], focus: [],
      enter: () => { show('D'); shuttle.u = 0.86; },
      ctl: el => {
        el.innerHTML = '<div class="meter"><b id="oxN">0 of 12</b><span id="oxT">In the lungs: picking up oxygen</span><div class="bar"><i id="oxBar" style="background:var(--oxy);width:0%"></i></div></div><p class="mini">The number is how many oxygen molecules this cell is carrying. &nbsp;oxygen + haemoglobin → oxyhaemoglobin</p>';
        const T = { lungs: 'In the lungs: picking up oxygen', toBody: 'Through the heart, out to the body', body: 'In the body: letting oxygen go', toLungs: 'Through the heart, back to the lungs' };
        shuttle.onChange = (k, n, max) => {
          if (k !== shuttle.last) { el.querySelector('#oxT').textContent = T[k]; shuttle.last = k; }
          el.querySelector('#oxN').textContent = `${n} of ${max}`; el.querySelector('#oxBar').style.width = `${(100 * n / max).toFixed(0)}%`;
        };
        return () => { shuttle.onChange = null; shuttle.last = ''; };
      },
    },
    {
      title: 'Quick check',
      text: 'Tap the cell that <b>destroys pathogens</b>.',
      cam: { t: [0, 0.2, 0], dir: [0, 0.06, 1], w: 13.5, h: 7.2 }, labels: [], focus: [],
      enter: () => show('B'),
      check: { answer: 'wbc', pickFn: () => [heroRBC, ...heroPlats, wbcs[0].children[0]],
        yes: 'Yes: a <b>white blood cell</b>. Some engulf pathogens, others make antibodies against them.',
        no: 'Pathogens are destroyed by <b>white blood cells</b>: the big pale cell with a purple nucleus.' },
      labelsAfter: ['dWbc'],
    },
  ];
  return ch;
}
