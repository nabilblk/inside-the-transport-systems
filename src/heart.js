// ============================================================== the cut-open heart (shared by two chapters)
// Built from the same outline as the workbook's heart diagram (mm, y down), extruded into a thick slice with a
// rounded back. Local units are mm: x = X - 40, y = 45 - Y, z = depth (front face at z ~ 10).
function beatAt(p) {
  const uA = p < 0.14 ? Math.sin(Math.PI * p / 0.14) : 0;
  const uV = p >= 0.14 && p < 0.48 ? Math.sin(Math.PI * (p - 0.14) / 0.34) : 0;
  return { uA, uV, avOpen: !(p >= 0.15 && p < 0.5), slOpen: p >= 0.18 && p < 0.47, phase: p < 0.14 ? 0 : p < 0.48 ? 1 : 2 };
}
const HP = {   // flow paths through the heart (X, Y, Z in workbook mm)
  vc: [[-18, 29.5, 5], [9, 29.5, 5]],
  ra: [[9, 29.5, 5], [14, 25.5, 5], [20, 29, 5.5], [17, 38.5, 5]],
  rv: [[17, 39.5, 5], [13, 50, 5], [15, 62, 5], [24, 67, 5], [31, 57, 5], [33.3, 46.5, 5]],
  pa: [[33.3, 46.5, 5], [33.3, 14, 5], [31.6, 8.4, 5], [27.3, 6, 5], [12, 6, 5]],
  pv: [[98, 29.5, 5], [71, 29.5, 5]],
  la: [[71, 29.5, 5], [66, 25.5, 5], [60, 29, 5.5], [63, 38.5, 5]],
  lv: [[63, 39.5, 5], [67, 50, 5], [65, 62, 5], [56, 69, 5], [49, 57, 5], [46.7, 46.5, 5]],
  ao: [[46.7, 46.5, 5], [46.7, 10, 5], [48.9, 4.7, 5], [54.2, 2.5, 5], [70, 2.5, 5], [76, 4.2, 5], [79.6, 8, 5], [82, 11, 5]],
};
const hl = ([X, Y, Z]) => V3(X - 40, 45 - Y, Z);   // workbook mm -> heart local

function heartModel(o = {}) {
  const g = new THREE.Group();
  const beat = { uA: { value: 0 }, uV: { value: 0 } };
  const draw = (sh, cmds) => {
    for (const [op, ...a] of cmds) {
      const q = []; for (let i = 0; i < a.length; i += 2) q.push(a[i] - 40, 45 - a[i + 1]);
      if (op === 'M') sh.moveTo(q[0], q[1]); else if (op === 'L') sh.lineTo(q[0], q[1]);
      else if (op === 'Q') sh.quadraticCurveTo(q[0], q[1], q[2], q[3]); else sh.bezierCurveTo(q[0], q[1], q[2], q[3], q[4], q[5]);
    }
    return sh;
  };
  const OUT = [['M', 4, 22], ['Q', 4, 19, 7, 19], ['L', 27, 19], ['Q', 30, 19, 30, 22], ['L', 30, 40], ['L', 50, 40], ['L', 50, 22], ['Q', 50, 19, 53, 19],
    ['L', 73, 19], ['Q', 76, 19, 76, 22], ['L', 76, 40], ['L', 78, 40], ['L', 78, 52], ['C', 78, 68, 60, 80, 40, 87], ['C', 20, 80, 2, 68, 2, 52], ['L', 2, 40], ['L', 4, 40], ['L', 4, 22.01]];
  const RC = [['M', 10.5, 21.5], ['L', 23.5, 21.5], ['Q', 27.5, 21.5, 27.5, 25.5], ['L', 27.5, 34.5], ['Q', 27.5, 38.5, 23.5, 38.5], ['L', 23, 38.5], ['L', 23, 44], ['L', 36.5, 44],
    ['L', 36.5, 75.5], ['C', 25, 71.5, 4.8, 63, 4.8, 53], ['L', 4.8, 44], ['L', 11, 44], ['L', 11, 38.5], ['L', 10.5, 38.5], ['Q', 6.5, 38.5, 6.5, 34.5], ['L', 6.5, 25.5], ['Q', 6.5, 21.5, 10.49, 21.5]];
  const LC = [['M', 56.5, 21.5], ['L', 69.5, 21.5], ['Q', 73.5, 21.5, 73.5, 25.5], ['L', 73.5, 34.5], ['Q', 73.5, 38.5, 69.5, 38.5], ['L', 69, 38.5], ['L', 69, 44], ['L', 70.5, 44],
    ['L', 70.5, 53], ['C', 70.5, 63, 57, 73, 43.5, 78.5], ['L', 43.5, 44], ['L', 57, 44], ['L', 57, 38.5], ['L', 56.5, 38.5], ['Q', 52.5, 38.5, 52.5, 34.5], ['L', 52.5, 25.5], ['Q', 52.5, 21.5, 56.49, 21.5]];

  const mats = {
    cut: beatify(tissue(C.muscleCut, { roughness: 0.62, clearcoat: 0.2, sheen: 0.35 }), beat),
    side: beatify(tissue(C.muscle, { roughness: 0.4, clearcoat: 0.65 }), beat),
    back: beatify(tissue(C.muscle, { roughness: 0.4, clearcoat: 0.65, transparent: true, opacity: 1 }), beat),
    floorR: beatify(tissue(C.deoxyDeep, { roughness: 0.22, clearcoat: 1, sheen: 0 }), beat),
    floorL: beatify(tissue(C.oxyDeep, { roughness: 0.22, clearcoat: 1, sheen: 0 }), beat),
    volR: glass(C.deoxy, { opacity: 0.2, base: 0.35, beat }), volL: glass(C.oxy, { opacity: 0.2, base: 0.35, beat }),
    vesR: new THREE.MeshPhysicalMaterial({ color: col(C.deoxy).lerp(col('#ffffff'), 0.35), transparent: true, opacity: 0.6, roughness: 0.18, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
    vesL: new THREE.MeshPhysicalMaterial({ color: col(C.oxy).lerp(col('#ffffff'), 0.3), transparent: true, opacity: 0.6, roughness: 0.18, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
    valve: tissue(C.valve, { roughness: 0.5, side: THREE.DoubleSide, sheen: 0.8 }),
  };
  const shape = draw(new THREE.Shape(), OUT);
  const rHole = draw(new THREE.Path(), RC), lHole = draw(new THREE.Path(), LC);
  shape.holes.push(rHole, lHole);
  const front = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 10, bevelEnabled: true, bevelThickness: 1.4, bevelSize: 1.0, bevelSegments: 3, curveSegments: 22 }), [mats.cut, mats.side]);
  g.add(front);
  const back = new THREE.Mesh(new THREE.ExtrudeGeometry(draw(new THREE.Shape(), OUT), { depth: 4, bevelEnabled: true, bevelThickness: 8, bevelSize: 5, bevelOffset: -4, bevelSegments: 6, curveSegments: 22 }), mats.back);
  back.position.z = -12.6; g.add(back);
  for (const [cmds, fm, vm] of [[RC, mats.floorR, mats.volR], [LC, mats.floorL, mats.volL]]) {
    const s = draw(new THREE.Shape(), cmds);
    const floor = new THREE.Mesh(new THREE.ShapeGeometry(s, 20), fm); floor.position.z = -0.3; g.add(floor);
    const vol = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 9.4, bevelEnabled: false, curveSegments: 20 }), vm); vol.renderOrder = 2; g.add(vol);
  }
  // blood vessels
  const ves = {};
  for (const [k, pts, m] of [['vc', HP.vc, mats.vesR], ['pa', [...HP.pa, [-6, 6, 5]], mats.vesR], ['pv', HP.pv, mats.vesL], ['ao', HP.ao, mats.vesL]]) {
    const curve = new THREE.CatmullRomCurve3(pts.map(hl), false, 'centripetal');
    ves[k] = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, k === 'vc' || k === 'pv' ? 3.5 : 3.3, 20, false), m);
    ves[k].renderOrder = 3; g.add(ves[k]);
  }
  // arrowheads: which way the blood flows in each vessel
  const arrowGeo = new THREE.ConeGeometry(2.6, 5.2, 24); arrowGeo.translate(0, 2.6, 0);
  const arrowMat = { R: tissue(C.deoxy, { roughness: 0.35, clearcoat: 0.8 }), L: tissue(C.oxy, { roughness: 0.35, clearcoat: 0.8 }) };
  const arrows = [];
  for (const [X, Y, dX, dY, side] of [[-14, 29.5, 1, 0, 'R'], [94, 29.5, -1, 0, 'L'], [-4, 6, -1, 0, 'R'], [82.4, 11.6, 0.6, 0.8, 'L']]) {
    const m = new THREE.Mesh(arrowGeo, arrowMat[side]); m.position.copy(hl([X, Y, 5]));
    m.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(dX, -dY, 0).normalize()); g.add(m); arrows.push(m);
  }
  // valves: flaps on hinges. AV valves between atrium and ventricle; semilunar valves at the base of each artery
  const flapGeo = new THREE.BoxGeometry(6.4, 0.9, 7.2); flapGeo.translate(3.2, 0, 0);
  const cuspGeo = new THREE.BoxGeometry(3.1, 0.75, 5.6); cuspGeo.translate(1.55, 0, 0);
  const valves = [];
  const addValve = (geo, X, Y, mirror, kind, side) => {
    const piv = new THREE.Group(); piv.position.copy(hl([X, Y, 5]));
    const m = new THREE.Mesh(geo, mats.valve); piv.add(m); if (mirror) piv.scale.x = -1;
    g.add(piv); const v = { piv, mirror, kind, side, a: kind === 'av' ? -1.2 : 1.3 }; valves.push(v); return v;
  };
  addValve(flapGeo, 11, 38.7, false, 'av', 'R'); addValve(flapGeo, 23, 38.7, true, 'av', 'R');
  addValve(flapGeo, 57, 38.7, false, 'av', 'L'); addValve(flapGeo, 69, 38.7, true, 'av', 'L');
  addValve(cuspGeo, 30.3, 43.2, false, 'sl', 'R'); addValve(cuspGeo, 36.3, 43.2, true, 'sl', 'R');
  addValve(cuspGeo, 43.7, 43.2, false, 'sl', 'L'); addValve(cuspGeo, 49.7, 43.2, true, 'sl', 'L');

  const state = { p: 0, b: beatAt(0), lub: 0, dub: 0, avWasOpen: true, slWasOpen: false, onLub: null, onDub: null };
  function update(dt, p) {
    const b = beatAt(p); state.p = p; state.b = b;
    beat.uA.value = b.uA; beat.uV.value = b.uV;
    if (state.avWasOpen && !b.avOpen && state.onLub) state.onLub();
    if (state.slWasOpen && !b.slOpen && state.onDub) state.onDub();
    state.avWasOpen = b.avOpen; state.slWasOpen = b.slOpen;
    const k = 1 - Math.exp(-dt * 22);
    for (const v of valves) {
      const target = v.kind === 'av' ? (b.avOpen ? -1.22 : -0.1) : (b.slOpen ? 1.32 : 0.04);
      v.a += (target - v.a) * k;
      v.piv.rotation.z = v.mirror ? -v.a : v.a;
      const pp = hl([0, 0, 0]); // valves ride with the squeeze of the boundary they sit on
      void pp;
    }
  }
  const labels = {};
  const L = (key, text, X, Y, Z, o) => { const l = label(text, o); l.position.copy(hl([X, Y, Z])); g.add(l); labels[key] = l; return l; };
  L('ra', 'right atrium', 17, 27, 9, { tone: 'deoxy', dx: -74, dy: -46 });
  L('la', 'left atrium', 63, 27, 9, { tone: 'oxy', dx: 74, dy: -46 });
  L('rv', 'right ventricle', 17, 60, 9, { tone: 'deoxy', dx: -86, dy: 26 });
  L('lv', 'left ventricle', 60, 58, 9, { tone: 'oxy', dx: 88, dy: 26 });
  L('septum', 'septum', 40, 62, 11, { dx: 0, dy: 96, sub: 'the wall between the two sides' });
  L('vc', 'vena cava', -12, 29.5, 8, { tone: 'deoxy', dx: -10, dy: 46, sub: 'from the body' });
  L('pa', 'pulmonary artery', 4, 6, 8, { tone: 'deoxy', dx: -40, dy: -40, sub: 'to the lungs' });
  L('ao', 'aorta', 66, 2.5, 8, { tone: 'oxy', dx: 52, dy: -36, sub: 'to the body' });
  L('pv', 'pulmonary vein', 90, 29.5, 8, { tone: 'oxy', dx: 6, dy: 46, sub: 'from the lungs' });
  L('avR', 'valve between atrium and ventricle', 13.5, 41.5, 10.5, { dx: -170, dy: 8, sub: 'closes as the ventricle squeezes: “lub”' });
  L('slL', 'valve at the start of the artery', 47.6, 42.4, 10.5, { dx: 190, dy: 6, sub: 'closes as the heart relaxes: “dub”' });
  L('thin', 'thin wall', 3.4, 58, 9, { dx: -84, dy: 34, sub: 'pumps to the lungs' });
  L('thick', 'thick wall', 75.5, 60, 9, { dx: 92, dy: 30, sub: 'pumps to the whole body' });
  L('sideR', 'Right side', 16, 15, 9, { tone: 'side nodot', dx: 0, dy: -10, sub: 'to the lungs' });
  L('sideL', 'Left side', 64, 15, 9, { tone: 'side nodot', dx: 0, dy: -10, sub: 'to the body' });

  // pick hulls
  const hulls = {
    ra: hull(new THREE.BoxGeometry(24, 20, 14), 'ra', g, hl([17, 30, 5])), la: hull(new THREE.BoxGeometry(24, 20, 14), 'la', g, hl([63, 30, 5])),
    rv: hull(new THREE.BoxGeometry(34, 36, 14), 'rv', g, hl([20, 60, 5])), lv: hull(new THREE.BoxGeometry(32, 36, 14), 'lv', g, hl([58, 60, 5])),
  };
  for (const h of Object.values(hulls)) h.visible = false;
  return { group: g, beat, mats, valves, ves, state, update, labels, hulls, front, back, arrows };
}
