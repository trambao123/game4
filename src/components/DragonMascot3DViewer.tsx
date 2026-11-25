import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RotateCcw, Sparkles } from 'lucide-react';
import {
  animateDragonMascot,
  createDragonMascot3D,
  disposeObject3D,
} from '../three/DragonMascot3D';
import { detectSoftwareGl } from '../three/webglDetect';
import { Language } from '../types/game';
import { soundFx } from '../audio/soundFx';

interface DragonMascot3DViewerProps {
  language: Language;
  isIncognito: boolean;
}

const DEFAULT_CAM_POS = new THREE.Vector3(0.45, 1.54, 4.95);
const DEFAULT_TARGET = new THREE.Vector3(0, 0.78, 0);

function createRadialShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.38)');
    grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.14)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const DragonMascot3DViewer: React.FC<DragonMascot3DViewerProps> = ({
  language,
  isIncognito,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const jumpRef = useRef<{ active: boolean; elapsed: number; duration: number }>({
    active: false,
    elapsed: 0,
    duration: 0.72,
  });
  const resettingRef = useRef<boolean>(false);

  const triggerJump = () => {
    soundFx.unlock();
    soundFx.playMascotTap();
    jumpRef.current = { active: true, elapsed: 0, duration: 0.72 };
  };

  const handleResetView = () => {
    resettingRef.current = true;
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = Math.max(220, container.clientWidth);
    const height = Math.max(220, container.clientHeight);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgHex = isIncognito ? 0x161922 : 0xf8fafc;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.Fog(bgHex, 8, 16);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    const envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.55;
    envScene.dispose();
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 40);
    camera.position.copy(DEFAULT_CAM_POS);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(DEFAULT_TARGET);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 2.5;
    controls.maxDistance = 6.5;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.56;
    controls.autoRotate = !isSoftwareGl;
    controls.autoRotateSpeed = 1.6;
    controls.update();

    const onControlsStart = () => {
      resettingRef.current = false;
    };
    controls.addEventListener('start', onControlsStart);

    // Warm key + cool sky/ground fill + rim accent
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.5);
    keyLight.position.set(3.2, 5.2, 3.8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 14;
      keyLight.shadow.camera.left = -2.2;
      keyLight.shadow.camera.right = 2.2;
      keyLight.shadow.camera.top = 2.6;
      keyLight.shadow.camera.bottom = -2.2;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xfde68a, 0.65);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0xfef08a, 0.75);
    rimLight.position.set(-2.8, 2.4, -3.2);
    scene.add(rimLight);

    // Subtle GDGoC golden-slate display plinth & radial contact shadow
    const plinthGeo = new THREE.CylinderGeometry(0.95, 1.05, 0.14, 36);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: isIncognito ? 0x262b38 : 0xe2e8f0,
      roughness: 0.65,
      metalness: 0.08,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -0.07;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const plinthRingGeo = new THREE.TorusGeometry(0.96, 0.022, 10, 48);
    const plinthRingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.35,
      metalness: 0.3,
    });
    const plinthRing = new THREE.Mesh(plinthRingGeo, plinthRingMat);
    plinthRing.rotation.x = Math.PI / 2;
    plinthRing.position.y = -0.002;
    scene.add(plinthRing);

    const shadowTex = createRadialShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(1.5, 1.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.004;
    scene.add(contactShadow);

    // 3D Dragon Mascot Rig
    const rig = createDragonMascot3D();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    rig.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && !Array.isArray(obj.material)) {
        const m = obj.material as THREE.MeshStandardMaterial;
        if (m.map) m.map.anisotropy = maxAniso;
      }
    });
    scene.add(rig.root);

    // Tap detection directly on the 3D canvas (distinguish click vs orbit drag)
    let pointerDownPos = { x: 0, y: 0 };
    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };
    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist < 6) {
        triggerJump();
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(200, Math.round(entry.contentRect.width));
      const h = Math.max(200, Math.round(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();
    const startTime = lastTime;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const elapsedSec = (now - startTime) / 1000;

      let jumpProgress: number | null = null;
      if (jumpRef.current.active) {
        jumpRef.current.elapsed += dt;
        const p = jumpRef.current.elapsed / jumpRef.current.duration;
        if (p >= 1) {
          jumpRef.current.active = false;
        } else {
          jumpProgress = p;
        }
      }

      animateDragonMascot(rig, elapsedSec, jumpProgress, true);

      // Scale contact shadow dynamically during 3D jump height
      const heightLift = rig.character.position.y;
      const sScale = Math.max(0.55, 1 - heightLift * 0.8);
      contactShadow.scale.set(sScale, sScale, 1);
      shadowMat.opacity = Math.max(0.35, 0.85 - heightLift * 0.9);

      if (resettingRef.current) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, DEFAULT_CAM_POS.x, 7, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, DEFAULT_CAM_POS.y, 7, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, DEFAULT_CAM_POS.z, 7, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, DEFAULT_TARGET.x, 7, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, DEFAULT_TARGET.y, 7, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, DEFAULT_TARGET.z, 7, dt);
        if (camera.position.distanceTo(DEFAULT_CAM_POS) < 0.02) {
          camera.position.copy(DEFAULT_CAM_POS);
          controls.target.copy(DEFAULT_TARGET);
          resettingRef.current = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlsStart);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      disposeObject3D(scene);
      shadowTex.dispose();
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isIncognito]);

  return (
    <div
      className={`relative mt-2 overflow-hidden rounded-2xl border ${
        isIncognito ? 'border-slate-700/80 bg-[#161922]' : 'border-slate-200 bg-[#F8FAFC]'
      }`}
    >
      {/* Dedicated WebGL Mount Container */}
      <div
        ref={mountRef}
        className="h-64 sm:h-72 w-full cursor-grab active:cursor-grabbing touch-none select-none"
        aria-label={
          language === 'vi'
            ? 'Mô hình 3D xoay 360 độ linh vật rồng chibi GDGoC DUT'
            : 'Interactive 3D GDGoC DUT chibi dragon mascot'
        }
      />

      {/* Minimal Top-Left 3D Interaction Hint */}
      <div
        className={`pointer-events-none absolute top-2.5 left-3 rounded-lg px-2 py-1 text-[11px] font-medium ${
          isIncognito ? 'bg-slate-900/85 text-slate-300' : 'bg-white/90 text-slate-600'
        }`}
      >
        {language === 'vi' ? 'Kéo để xoay 360° · Chạm để nhảy' : 'Drag to rotate 360° · Tap to jump'}
      </div>

      {/* Compact Bottom Dock Controls (Solid background, zero backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-2 px-3">
        <button
          type="button"
          onClick={triggerJump}
          className="pointer-events-auto min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 shadow-sm hover:bg-amber-400 transition-colors cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{language === 'vi' ? 'Nhảy 3D!' : '3D Spin Jump!'}</span>
        </button>

        <button
          type="button"
          onClick={handleResetView}
          className={`pointer-events-auto min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors cursor-pointer ${
            isIncognito
              ? 'border-slate-700 bg-[#20232A] text-slate-200 hover:bg-slate-800'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{language === 'vi' ? 'Góc chuẩn' : 'Reset View'}</span>
        </button>
      </div>
    </div>
  );
};
