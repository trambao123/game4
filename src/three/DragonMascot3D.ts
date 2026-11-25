import * as THREE from 'three';

export interface DragonMascotRig {
  root: THREE.Group;
  character: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  tailGroup: THREE.Group;
  tailFlame: THREE.Group;
  snoutCrest: THREE.Group;
  celebrationHalo: THREE.Mesh;
  celebrationHaloMat: THREE.MeshBasicMaterial;
}

/**
 * Generates a high-resolution procedural cotton T-shirt texture featuring
 * the 4-color Google Developer < > emblem, "GDGoC", and "DUT" badge.
 * Mapped onto a LatheGeometry shirt rotated Math.PI on Y so u = 0.5 is dead-center front.
 */
function createGdgocShirtTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Crisp soft-white cotton base
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Subtle fabric shading toward lower hem & sides
    const shade = ctx.createLinearGradient(0, 0, 0, height);
    shade.addColorStop(0, 'rgba(241, 245, 249, 0.25)');
    shade.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
    shade.addColorStop(1, 'rgba(203, 213, 225, 0.35)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);

    // Subtle Google 4-color hem accent stripe along bottom edge
    const stripeY = height - 22;
    const stripeColors = ['#4285F4', '#EA4335', '#FBBC04', '#34A853'];
    stripeColors.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect((width / 4) * i, stripeY, width / 4 + 2, 10);
    });

    // Helper to draw Google Developer < > bracket logo
    const drawBrackets = (cx: number, cy: number, scale: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 20;

      // Left '<' (Blue top, Red bottom)
      ctx.strokeStyle = '#EA4335';
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.lineTo(-68, 34);
      ctx.stroke();

      ctx.strokeStyle = '#4285F4';
      ctx.beginPath();
      ctx.moveTo(-68, -34);
      ctx.lineTo(-26, 0);
      ctx.stroke();

      // Right '>' (Yellow top, Green bottom)
      ctx.strokeStyle = '#34A853';
      ctx.beginPath();
      ctx.moveTo(68, 0);
      ctx.lineTo(26, 34);
      ctx.stroke();

      ctx.strokeStyle = '#FBBC04';
      ctx.beginPath();
      ctx.moveTo(26, -34);
      ctx.lineTo(68, 0);
      ctx.stroke();

      ctx.restore();
    };

    // FRONT CHEST GRAPHIC (centered at x = 512, u = 0.5)
    const fx = width * 0.5;
    drawBrackets(fx, 180, 1.05);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0F172A';
    ctx.font = '800 72px "Plus Jakarta Sans", "Inter", system-ui, sans-serif';
    ctx.fillText('GDGoC', fx, 272);

    // Rounded DUT pill badge under GDGoC
    const pillW = 148;
    const pillH = 48;
    const pillX = fx - pillW / 2;
    const pillY = 322;
    ctx.fillStyle = '#2563EB';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 24);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 30px "JetBrains Mono", "Plus Jakarta Sans", monospace';
    ctx.fillText('DUT', fx, pillY + pillH / 2 + 1);

    // BACK PRINT (centered across x = 0 / width seam so 360 spins look complete)
    [0, width].forEach((bx) => {
      drawBrackets(bx, 185, 0.72);
      ctx.fillStyle = '#1E293B';
      ctx.font = '800 42px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('GDGoC DUT', bx, 255);
      ctx.fillStyle = '#64748B';
      ctx.font = '700 22px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('ĐÀ NẴNG', bx, 295);
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Builds the 3D Golden Chibi Dragon Mascot inspired by the DevFest / GDGoC DUT mascot,
 * dressed in a crisp white GDGoC DUT t-shirt with short sleeves and grounded feet stance.
 * Bottom-center pivot at (0, 0, 0) so feet rest flush on the isometric tower top.
 */
export function createDragonMascot3D(): DragonMascotRig {
  const root = new THREE.Group();
  const character = new THREE.Group();
  root.add(character);

  // Materials (rich warm golden-orange palette + matte cotton shirt contrast)
  const goldSkinMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    roughness: 0.42,
    metalness: 0.02,
    clearcoat: 0.22,
    clearcoatRoughness: 0.3,
  });

  const hoodOrangeMat = new THREE.MeshPhysicalMaterial({
    color: 0xea6a0a,
    roughness: 0.36,
    metalness: 0.04,
    clearcoat: 0.32,
    clearcoatRoughness: 0.25,
  });

  const maneDeepOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xd9480f,
    roughness: 0.4,
    metalness: 0.04,
  });

  const creamTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.52,
    metalness: 0.0,
  });

  const shirtTex = createGdgocShirtTexture();
  const shirtFabricMat = new THREE.MeshStandardMaterial({
    map: shirtTex,
    roughness: 0.78,
    metalness: 0.0,
  });

  const shirtPlainMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.0,
  });

  const shirtTrimBlueMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.65,
    metalness: 0.0,
  });

  const hornMat = new THREE.MeshStandardMaterial({
    color: 0xfcd34d,
    roughness: 0.44,
    metalness: 0.02,
  });

  const darkEyeMat = new THREE.MeshPhysicalMaterial({
    color: 0x3b1804,
    roughness: 0.12,
    metalness: 0.05,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
  });

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.0,
  });

  const blushMat = new THREE.MeshStandardMaterial({
    color: 0xfb7185,
    roughness: 0.55,
    metalness: 0.0,
  });

  const mouthInnerMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.5,
  });

  const tongueMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    roughness: 0.45,
  });

  const tealCrestMat = new THREE.MeshPhysicalMaterial({
    color: 0x2dd4bf,
    emissive: 0x0d9488,
    emissiveIntensity: 0.14,
    roughness: 0.3,
    clearcoat: 0.4,
  });

  const coralFlameMat = new THREE.MeshPhysicalMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 0.25,
    roughness: 0.28,
    clearcoat: 0.35,
  });

  // =====================================================
  // 1. BODY GROUP (Torso wearing GDGoC DUT tee, sleeves, grounded legs, tail)
  // =====================================================
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.54;
  character.add(bodyGroup);

  // Inner dragon hips/pelvis peeking below the t-shirt hem
  const pelvisGeo = new THREE.SphereGeometry(0.42, 24, 18);
  pelvisGeo.scale(1.02, 0.72, 0.92);
  const pelvis = new THREE.Mesh(pelvisGeo, goldSkinMat);
  pelvis.position.set(0, -0.17, 0);
  pelvis.castShadow = true;
  pelvis.receiveShadow = true;
  bodyGroup.add(pelvis);

  // Sculpted Cotton GDGoC T-Shirt (Lathe profile wrapping torso cleanly)
  const shirtProfile = [
    new THREE.Vector2(0.0, -0.24),
    new THREE.Vector2(0.455, -0.24),
    new THREE.Vector2(0.475, -0.14),
    new THREE.Vector2(0.475, 0.02),
    new THREE.Vector2(0.445, 0.18),
    new THREE.Vector2(0.375, 0.3),
    new THREE.Vector2(0.24, 0.35),
    new THREE.Vector2(0.0, 0.35),
  ];
  const shirtGeo = new THREE.LatheGeometry(shirtProfile, 36);
  // Slight oval compression matching front-back chibi depth
  shirtGeo.scale(1.03, 1.0, 0.94);
  const shirtMesh = new THREE.Mesh(shirtGeo, shirtFabricMat);
  // Rotate Math.PI so u = 0.5 (front GDGoC DUT logo) faces +Z directly!
  shirtMesh.rotation.y = Math.PI;
  shirtMesh.castShadow = true;
  shirtMesh.receiveShadow = true;
  bodyGroup.add(shirtMesh);

  // Crew-neck ribbed collar
  const neckCollarGeo = new THREE.TorusGeometry(0.28, 0.045, 12, 28);
  neckCollarGeo.scale(1.05, 0.92, 1.0);
  const neckCollar = new THREE.Mesh(neckCollarGeo, shirtPlainMat);
  neckCollar.position.set(0, 0.33, 0.02);
  neckCollar.rotation.x = Math.PI * 0.5;
  bodyGroup.add(neckCollar);

  // Grounded Legs & 3-toed orange feet (feet soles sit flush at y = 0 in root space)
  const buildLeg = (side: -1 | 1): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.23, -0.34, 0.03);
    // Natural outward standing foot splay (~14 deg)
    leg.rotation.y = side * 0.24;

    const thighGeo = new THREE.SphereGeometry(0.16, 16, 14);
    thighGeo.scale(0.95, 1.05, 1.02);
    const thigh = new THREE.Mesh(thighGeo, goldSkinMat);
    thigh.position.set(0, 0.04, 0);
    thigh.castShadow = true;
    leg.add(thigh);

    // Flattened stable orange dragon foot planted flat at y = -0.20 (world y = 0.0)
    const footGeo = new THREE.SphereGeometry(0.145, 18, 14);
    footGeo.scale(0.98, 0.58, 1.38);
    const foot = new THREE.Mesh(footGeo, maneDeepOrangeMat);
    foot.position.set(side * 0.01, -0.115, 0.08);
    foot.castShadow = true;
    foot.receiveShadow = true;
    leg.add(foot);

    // 3 little cream toe claws pointing cleanly forward along the floor
    [-0.058, 0, 0.058].forEach((tx, ti) => {
      const toeGeo = new THREE.ConeGeometry(0.03, 0.07, 10);
      const toe = new THREE.Mesh(toeGeo, creamTrimMat);
      toe.position.set(side * 0.01 + tx, -0.135, 0.245 + (ti === 1 ? 0.02 : 0));
      toe.rotation.x = Math.PI * 0.48;
      leg.add(toe);
    });

    return leg;
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  bodyGroup.add(leftLeg, rightLeg);

  // Chubby waving arms emerging from short white GDGoC t-shirt sleeves
  const buildArm = (side: -1 | 1): THREE.Group => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.41, 0.14, 0.04);
    arm.rotation.z = side * 0.52;

    // White short sleeve cone flaring smoothly from shoulder
    const sleeveGeo = new THREE.CylinderGeometry(0.125, 0.155, 0.18, 20);
    const sleeve = new THREE.Mesh(sleeveGeo, shirtPlainMat);
    sleeve.position.set(side * 0.06, 0.02, 0.01);
    sleeve.rotation.z = -side * Math.PI * 0.42;
    sleeve.castShadow = true;
    arm.add(sleeve);

    // Subtle Google-blue cuff trim ring
    const cuffGeo = new THREE.TorusGeometry(0.145, 0.016, 8, 20);
    const cuff = new THREE.Mesh(cuffGeo, shirtTrimBlueMat);
    cuff.position.set(side * 0.145, 0.045, 0.01);
    cuff.rotation.y = Math.PI * 0.5;
    cuff.rotation.x = side * 0.14;
    arm.add(cuff);

    const armGeo = new THREE.CapsuleGeometry(0.098, 0.15, 10, 14);
    const armMesh = new THREE.Mesh(armGeo, goldSkinMat);
    armMesh.position.set(side * 0.18, 0.055, 0.02);
    armMesh.rotation.z = -side * Math.PI * 0.42;
    armMesh.castShadow = true;
    arm.add(armMesh);

    [-0.036, 0, 0.036].forEach((fy, fi) => {
      const fingerGeo = new THREE.ConeGeometry(0.026, 0.07, 10);
      const finger = new THREE.Mesh(fingerGeo, creamTrimMat);
      finger.position.set(side * (0.3 + (fi === 1 ? 0.02 : 0)), 0.095 + fy, 0.035);
      finger.rotation.z = -side * Math.PI * 0.46;
      arm.add(finger);
    });

    return arm;
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  bodyGroup.add(leftArm, rightArm);

  // Curved Dragon Tail emerging cleanly under the t-shirt hem
  const tailGroup = new THREE.Group();
  tailGroup.position.set(-0.14, -0.22, -0.28);
  bodyGroup.add(tailGroup);

  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.32, -0.02, -0.22),
    new THREE.Vector3(-0.62, 0.16, -0.18),
    new THREE.Vector3(-0.76, 0.48, -0.02),
  ]);
  const tailSegments = 20;
  const tailRadii = [0.16, 0.13, 0.1, 0.075, 0.055];
  for (let i = 0; i <= tailSegments; i++) {
    const t = i / tailSegments;
    const pt = tailCurve.getPoint(t);
    const rIdx = t * (tailRadii.length - 1);
    const r0 = tailRadii[Math.floor(rIdx)];
    const r1 = tailRadii[Math.min(tailRadii.length - 1, Math.ceil(rIdx))];
    const radius = THREE.MathUtils.lerp(r0, r1, rIdx - Math.floor(rIdx));
    const segMesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 10), goldSkinMat);
    segMesh.position.copy(pt);
    segMesh.castShadow = true;
    tailGroup.add(segMesh);
  }

  // Dorsal tail spines
  [0.28, 0.5, 0.72, 0.88].forEach((t) => {
    const pt = tailCurve.getPoint(t);
    const spineGeo = new THREE.ConeGeometry(0.045, 0.12, 10);
    const spine = new THREE.Mesh(spineGeo, maneDeepOrangeMat);
    spine.position.set(pt.x, pt.y + 0.08, pt.z - 0.02);
    spine.rotation.z = 0.4;
    tailGroup.add(spine);
  });

  // Tail Flame Plume
  const tailFlame = new THREE.Group();
  tailFlame.position.copy(tailCurve.getPoint(1));
  tailGroup.add(tailFlame);

  const flameMain = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 12), coralFlameMat);
  flameMain.position.set(-0.02, 0.11, 0.02);
  flameMain.rotation.z = 0.25;
  tailFlame.add(flameMain);

  const flameSideL = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.16, 10), hoodOrangeMat);
  flameSideL.position.set(-0.08, 0.07, 0);
  flameSideL.rotation.z = 0.72;
  tailFlame.add(flameSideL);

  const flameSideR = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 10), hoodOrangeMat);
  flameSideR.position.set(0.06, 0.08, 0.03);
  flameSideR.rotation.z = -0.45;
  tailFlame.add(flameSideR);

  // =====================================================
  // 2. HEAD & DRAGON HOOD GROUP
  // =====================================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.19, 0.02);
  character.add(headGroup);

  // Inner Chibi Face
  const faceGeo = new THREE.SphereGeometry(0.45, 28, 24);
  faceGeo.scale(1.06, 0.94, 0.96);
  const faceMesh = new THREE.Mesh(faceGeo, goldSkinMat);
  faceMesh.position.set(0, -0.02, 0.1);
  faceMesh.castShadow = true;
  headGroup.add(faceMesh);

  // Cream hood opening rim framing the chibi face
  const collarGeo = new THREE.TorusGeometry(0.45, 0.055, 14, 32);
  collarGeo.scale(1.06, 0.94, 1.0);
  const collar = new THREE.Mesh(collarGeo, creamTrimMat);
  collar.position.set(0, -0.02, 0.22);
  headGroup.add(collar);

  // Happy squinting crescent eyes (^ ^) on inner chibi face
  [-0.17, 0.17].forEach((ex) => {
    const eyeArcGeo = new THREE.TorusGeometry(0.072, 0.022, 10, 18, Math.PI * 0.85);
    const eyeArc = new THREE.Mesh(eyeArcGeo, darkEyeMat);
    eyeArc.position.set(ex, 0.01, 0.51);
    eyeArc.rotation.z = Math.PI * 0.075;
    eyeArc.rotation.x = -0.15;
    headGroup.add(eyeArc);
  });

  // Rosy coral cheeks
  [-0.26, 0.26].forEach((cx) => {
    const cheekGeo = new THREE.SphereGeometry(0.075, 14, 12);
    cheekGeo.scale(1.3, 0.72, 0.45);
    const cheek = new THREE.Mesh(cheekGeo, blushMat);
    cheek.position.set(cx, -0.09, 0.47);
    cheek.rotation.y = cx < 0 ? -0.35 : 0.35;
    headGroup.add(cheek);
  });

  // Open happy smiling mouth + tongue + two tiny white chibi fangs
  const mouthGeo = new THREE.SphereGeometry(
    0.115,
    18,
    14,
    0,
    Math.PI * 2,
    Math.PI * 0.42,
    Math.PI * 0.52
  );
  mouthGeo.scale(1.2, 0.85, 0.45);
  const mouth = new THREE.Mesh(mouthGeo, mouthInnerMat);
  mouth.position.set(0, -0.11, 0.49);
  headGroup.add(mouth);

  const tongueGeo = new THREE.SphereGeometry(0.068, 14, 12);
  tongueGeo.scale(1.15, 0.55, 0.55);
  const tongue = new THREE.Mesh(tongueGeo, tongueMat);
  tongue.position.set(0, -0.175, 0.515);
  headGroup.add(tongue);

  [-0.075, 0.075].forEach((fx) => {
    const fangGeo = new THREE.ConeGeometry(0.022, 0.048, 8);
    const fang = new THREE.Mesh(fangGeo, whiteMat);
    fang.position.set(fx, -0.115, 0.528);
    fang.rotation.x = Math.PI;
    headGroup.add(fang);
  });

  // Outer Sculpted Dragon Hood Helmet
  const hoodBackGeo = new THREE.SphereGeometry(0.55, 28, 24);
  hoodBackGeo.scale(1.1, 1.0, 1.02);
  const hoodBack = new THREE.Mesh(hoodBackGeo, hoodOrangeMat);
  hoodBack.position.set(0, 0.06, -0.06);
  hoodBack.castShadow = true;
  headGroup.add(hoodBack);

  // Upper dragon snout overhanging the forehead
  const snoutBridgeGeo = new THREE.SphereGeometry(0.28, 20, 18);
  snoutBridgeGeo.scale(1.25, 0.72, 1.05);
  const snoutBridge = new THREE.Mesh(snoutBridgeGeo, hoodOrangeMat);
  snoutBridge.position.set(0, 0.36, 0.25);
  snoutBridge.rotation.x = 0.16;
  snoutBridge.castShadow = true;
  headGroup.add(snoutBridge);

  // Flared dragon nostrils on front snout
  [-0.09, 0.09].forEach((nx) => {
    const nostrilBump = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), maneDeepOrangeMat);
    nostrilBump.position.set(nx, 0.36, 0.48);
    headGroup.add(nostrilBump);

    const nostrilHole = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), darkEyeMat);
    nostrilHole.position.set(nx * 1.05, 0.365, 0.53);
    headGroup.add(nostrilHole);
  });

  // Expressive Hood Eyes on top of the dragon hood
  [-0.19, 0.19].forEach((hx) => {
    const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), whiteMat);
    eyeSocket.scale.set(0.95, 1.05, 0.72);
    eyeSocket.position.set(hx, 0.48, 0.28);
    headGroup.add(eyeSocket);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 12), darkEyeMat);
    pupil.position.set(hx * 0.96, 0.48, 0.34);
    headGroup.add(pupil);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), whiteMat);
    glint.position.set(hx * 0.96 + 0.028, 0.51, 0.405);
    headGroup.add(glint);

    const browGeo = new THREE.CapsuleGeometry(0.036, 0.12, 6, 10);
    const brow = new THREE.Mesh(browGeo, hoodOrangeMat);
    brow.position.set(hx * 1.05, 0.6, 0.26);
    brow.rotation.z = hx < 0 ? 0.42 : -0.42;
    brow.rotation.y = hx < 0 ? 0.2 : -0.2;
    headGroup.add(brow);
  });

  // Two Curved Cream Dragon Horns
  [-1, 1].forEach((side) => {
    const hornCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.18, 0.54, 0.02),
      new THREE.Vector3(side * 0.26, 0.75, -0.08),
      new THREE.Vector3(side * 0.24, 0.93, -0.22),
    ]);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const pt = hornCurve.getPoint(t);
      const r = THREE.MathUtils.lerp(0.078, 0.022, t);
      const hSeg = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), hornMat);
      hSeg.position.copy(pt);
      hSeg.castShadow = true;
      headGroup.add(hSeg);
    }
  });

  // Side Cheek & Crown Flame Mane Spikes
  [-1, 1].forEach((side) => {
    const cheekSpikes = [
      { x: 0.52, y: 0.22, z: 0.08, rz: -1.1, ry: 0.35, h: 0.26 },
      { x: 0.54, y: 0.02, z: 0.1, rz: -1.45, ry: 0.35, h: 0.28 },
      { x: 0.48, y: -0.18, z: 0.12, rz: -1.78, ry: 0.35, h: 0.24 },
      { x: 0.42, y: 0.42, z: 0.04, rz: -0.68, ry: 0.25, h: 0.24 },
    ];
    cheekSpikes.forEach((sp) => {
      const spikeGeo = new THREE.ConeGeometry(0.085, sp.h, 10);
      const spike = new THREE.Mesh(spikeGeo, maneDeepOrangeMat);
      spike.position.set(side * sp.x, sp.y, sp.z);
      spike.rotation.z = side * sp.rz;
      spike.rotation.y = side * sp.ry;
      spike.castShadow = true;
      headGroup.add(spike);
    });
  });

  // Top Crown Dorsal Spikes
  [0, -0.24, -0.48].forEach((sz, idx) => {
    const cSpike = new THREE.Mesh(
      new THREE.ConeGeometry(0.075 - idx * 0.01, 0.24 - idx * 0.02, 10),
      maneDeepOrangeMat
    );
    cSpike.position.set(0, 0.62 - idx * 0.14, sz - 0.06);
    cSpike.rotation.x = -0.35 - idx * 0.45;
    headGroup.add(cSpike);
  });

  // Iconic Teal-to-Coral Flame Crest on the right snout
  const snoutCrest = new THREE.Group();
  snoutCrest.position.set(0.28, 0.32, 0.42);
  headGroup.add(snoutCrest);

  const crestBase = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 12), tealCrestMat);
  crestBase.position.set(0.09, 0.04, 0.04);
  crestBase.rotation.z = -1.15;
  crestBase.rotation.y = -0.25;
  snoutCrest.add(crestBase);

  const crestFlame1 = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.26, 12), coralFlameMat);
  crestFlame1.position.set(0.24, 0.1, 0.06);
  crestFlame1.rotation.z = -1.02;
  snoutCrest.add(crestFlame1);

  const crestFlame2 = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.19, 10), coralFlameMat);
  crestFlame2.position.set(0.22, 0.0, 0.08);
  crestFlame2.rotation.z = -1.42;
  snoutCrest.add(crestFlame2);

  // Subtle expanding 3D golden ring at foot level for milestone celebrations
  const celebrationHaloMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const celebrationHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.022, 8, 36),
    celebrationHaloMat
  );
  celebrationHalo.rotation.x = Math.PI * 0.5;
  celebrationHalo.position.y = 0.04;
  celebrationHalo.visible = false;
  root.add(celebrationHalo);

  return {
    root,
    character,
    bodyGroup,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    tailGroup,
    tailFlame,
    snoutCrest,
    celebrationHalo,
    celebrationHaloMat,
  };
}

/**
 * Updates skeletal joint poses for lively idle breathing, bouncy step-jumps,
 * celebratory Perfect/Milestone 360 spins, and subtle flame flicker.
 */
export function animateDragonMascot(
  rig: DragonMascotRig,
  elapsedSec: number,
  jumpProgress: number | null,
  jumpIsPerfect: boolean,
  isMilestone = false,
  windStrength = 0
): void {
  const windFreq = 1 + windStrength * 0.85;
  const idleWave = Math.sin(elapsedSec * 4.2);
  const idleTail = Math.sin(elapsedSec * 5.6 * windFreq);
  const breathe = Math.sin(elapsedSec * 3.1);
  const windGust = Math.sin(elapsedSec * 2.3) * 0.7 + Math.sin(elapsedSec * 5.1) * 0.3;

  rig.character.position.set(0, 0, 0);
  rig.character.rotation.set(0, 0, -windGust * 0.048 * windStrength);
  rig.character.scale.set(1, 1, 1);

  rig.headGroup.rotation.z =
    Math.sin(elapsedSec * 2.1) * 0.045 + windGust * 0.05 * windStrength;
  rig.headGroup.rotation.y = Math.sin(elapsedSec * 1.4) * 0.07;
  rig.headGroup.position.y = 1.19 + breathe * 0.015;

  rig.leftArm.rotation.z = -0.52 - idleWave * 0.14;
  rig.rightArm.rotation.z = 0.52 + idleWave * 0.14;
  rig.leftArm.rotation.x = Math.cos(elapsedSec * 4.2) * 0.1;
  rig.rightArm.rotation.x = -Math.cos(elapsedSec * 4.2) * 0.1;

  rig.tailGroup.rotation.y = idleTail * (0.18 + windStrength * 0.14);
  rig.tailGroup.rotation.x = Math.cos(elapsedSec * 4.8) * 0.08;

  const flicker = 1 + Math.sin(elapsedSec * (14 + windStrength * 8)) * (0.08 + windStrength * 0.06);
  rig.tailFlame.scale.set(1, flicker, 1);
  rig.snoutCrest.scale.set(1, 1, 1);
  rig.snoutCrest.rotation.z = Math.sin(elapsedSec * (6.5 + windStrength * 5)) * (0.08 + windStrength * 0.08);

  rig.celebrationHalo.visible = false;
  rig.celebrationHaloMat.opacity = 0;

  rig.leftLeg.rotation.x = 0;
  rig.rightLeg.rotation.x = 0;

  if (jumpProgress !== null && jumpProgress >= 0 && jumpProgress <= 1) {
    const p = jumpProgress;
    const arc = Math.sin(p * Math.PI);
    rig.character.position.y = arc * (isMilestone ? 0.48 : 0.42);

    if (isMilestone) {
      rig.celebrationHalo.visible = true;
      const haloScale = 0.78 + p * 0.72;
      rig.celebrationHalo.scale.set(haloScale, haloScale, 1);
      rig.celebrationHalo.position.y = 0.04;
      rig.celebrationHaloMat.opacity = Math.max(0, (1 - p) * 0.5);
    }

    if (p < 0.15) {
      const c = p / 0.15;
      rig.character.scale.set(1 + 0.14 * c, 1 - 0.16 * c, 1 + 0.14 * c);
    } else if (p < 0.8) {
      rig.character.scale.set(0.92, 1.11, 0.92);
      rig.leftArm.rotation.z = isMilestone ? -1.2 : -1.1;
      rig.rightArm.rotation.z = isMilestone ? 1.2 : 1.1;
      rig.leftLeg.rotation.x = 0.3 * arc;
      rig.rightLeg.rotation.x = -0.3 * arc;
      if (jumpIsPerfect || isMilestone) {
        rig.character.rotation.y = ((p - 0.15) / 0.65) * Math.PI * 2;
      } else {
        rig.character.rotation.y = Math.sin(p * Math.PI) * 0.25;
      }
    } else {
      const l = (p - 0.8) / 0.2;
      const bounce = Math.sin(l * Math.PI);
      rig.character.scale.set(1 + 0.12 * bounce, 1 - 0.14 * bounce, 1 + 0.12 * bounce);
    }
  }
}

export function disposeObject3D(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      geometries.add(obj.geometry);
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (!m) return;
        materials.add(m);
        const std = m as THREE.MeshStandardMaterial;
        if (std.map) textures.add(std.map);
      });
    }
  });

  geometries.forEach((g) => g.dispose());
  textures.forEach((t) => t.dispose());
  materials.forEach((m) => m.dispose());
}
