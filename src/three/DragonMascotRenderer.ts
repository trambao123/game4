import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  animateDragonMascot,
  createDragonMascot3D,
  disposeObject3D,
  DragonMascotRig,
} from './DragonMascot3D';
import { detectSoftwareGl } from './webglDetect';

const RENDER_SIZE = 256;

function createFootContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Soft twin-foot + central body ground contact shadow
    const main = ctx.createRadialGradient(size * 0.5, size * 0.52, 6, size * 0.5, size * 0.52, 56);
    main.addColorStop(0, 'rgba(15, 23, 42, 0.36)');
    main.addColorStop(0.55, 'rgba(15, 23, 42, 0.16)');
    main.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = main;
    ctx.fillRect(0, 0, size, size);

    // Stronger contact darkening right under left & right feet
    [0.37, 0.63].forEach((fx) => {
      const fGrad = ctx.createRadialGradient(size * fx, size * 0.56, 2, size * fx, size * 0.56, 20);
      fGrad.addColorStop(0, 'rgba(15, 23, 42, 0.35)');
      fGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = fGrad;
      ctx.fillRect(0, 0, size, size);
    });
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

class DragonMascotRenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private rig: DragonMascotRig | null = null;
  private contactShadow: THREE.Mesh | null = null;
  private shadowMat: THREE.MeshBasicMaterial | null = null;
  private shadowTex: THREE.CanvasTexture | null = null;
  private isSoftwareGl = false;
  private failed = false;
  private lastRenderMs = -1000;
  private feetAnchorY = 0.86;
  private cachedIconDataUrl: string | null = null;
  private iconListeners = new Set<(url: string) => void>();

  private ensureInit(): boolean {
    if (this.failed || typeof window === 'undefined') return false;
    if (this.renderer && this.scene && this.camera && this.rig) return true;

    try {
      this.isSoftwareGl = detectSoftwareGl();

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !this.isSoftwareGl,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(RENDER_SIZE, RENDER_SIZE, false);
      renderer.setPixelRatio(1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.96;
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();

      // Studio environment reflection for rich vinyl/fabric contrast
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new RoomEnvironment();
      this.envRT = pmrem.fromScene(envScene, 0.04);
      scene.environment = this.envRT.texture;
      scene.environmentIntensity = 0.55;
      envScene.dispose();
      pmrem.dispose();

      // Balanced 3-point warm/cool studio lighting aligned with isometric top-left key light
      const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.45);
      keyLight.position.set(-2.4, 4.8, 3.6);
      scene.add(keyLight);

      const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xfde68a, 0.65);
      scene.add(hemiLight);

      const rimLight = new THREE.DirectionalLight(0xfef08a, 0.72);
      rimLight.position.set(2.8, 2.2, -3.0);
      scene.add(rimLight);

      const rig = createDragonMascot3D();
      // Natural 3/4 stance aligned to isometric tower face (shows face, GDGoC tee, and tail cleanly)
      rig.root.rotation.y = 0.28;

      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      rig.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh && !Array.isArray(obj.material)) {
          const m = obj.material as THREE.MeshStandardMaterial;
          if (m.map) m.map.anisotropy = maxAniso;
        }
      });
      scene.add(rig.root);

      // Isometric ground contact shadow lying flat on the XZ plane right under the feet
      const shadowTex = createFootContactShadowTexture();
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.9,
      });
      const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.25), shadowMat);
      contactShadow.rotation.x = -Math.PI / 2;
      contactShadow.rotation.z = 0.28;
      contactShadow.position.set(0, 0.002, 0.06);
      scene.add(contactShadow);

      // Orthographic camera matching TowerCanvas's exact 26.565 deg (dy/dx = 0.5) isometric pitch!
      const halfExtent = 1.42;
      const camera = new THREE.OrthographicCamera(
        -halfExtent,
        halfExtent,
        halfExtent,
        -halfExtent,
        0.1,
        30
      );
      const isoPitch = Math.atan(0.5); // ~26.565 deg matching toIso projection
      const dist = 7.0;
      const targetY = 0.95;
      camera.position.set(
        0,
        targetY + Math.sin(isoPitch) * dist,
        Math.cos(isoPitch) * dist
      );
      camera.lookAt(0, targetY, 0);
      camera.updateMatrixWorld();

      // Exact screen-space anchor fraction of world origin (0, 0, 0) where foot soles touch the block
      const feetProj = new THREE.Vector3(0, 0, 0).project(camera);
      this.feetAnchorY = (1 - feetProj.y) * 0.5;

      this.renderer = renderer;
      this.scene = scene;
      this.camera = camera;
      this.rig = rig;
      this.contactShadow = contactShadow;
      this.shadowMat = shadowMat;
      this.shadowTex = shadowTex;

      if (!this.isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      // Render crisp initial frame for Title Menu icon badge
      animateDragonMascot(rig, 0.35, null, false);
      renderer.render(scene, camera);
      this.cachedIconDataUrl = renderer.domElement.toDataURL('image/png');
      this.iconListeners.forEach((cb) => cb(this.cachedIconDataUrl!));

      return true;
    } catch {
      this.failed = true;
      return false;
    }
  }

  public getFeetAnchorY(): number {
    this.ensureInit();
    return this.feetAnchorY;
  }

  public getIconDataUrl(): string | null {
    if (!this.cachedIconDataUrl) {
      this.ensureInit();
    }
    return this.cachedIconDataUrl;
  }

  public subscribeIcon(cb: (url: string) => void): () => void {
    this.iconListeners.add(cb);
    const url = this.getIconDataUrl();
    if (url) cb(url);
    return () => {
      this.iconListeners.delete(cb);
    };
  }

  /**
   * Renders the 3D dragon canvas matched to the isometric tower angle.
   * On software WebGL, paces 3D re-renders cleanly while TowerCanvas animates 60fps elevation.
   */
  public getCanvasForFrame(
    timeMs: number,
    jumpProgress: number | null,
    jumpIsPerfect: boolean,
    isMilestone = false,
    windStrength = 0
  ): HTMLCanvasElement | null {
    if (!this.ensureInit() || !this.renderer || !this.scene || !this.camera || !this.rig) {
      return null;
    }

    const minIntervalMs = this.isSoftwareGl ? 85 : 0;
    if (timeMs - this.lastRenderMs >= minIntervalMs) {
      this.lastRenderMs = timeMs;
      animateDragonMascot(
        this.rig,
        timeMs * 0.001,
        jumpProgress,
        jumpIsPerfect,
        isMilestone,
        windStrength
      );

      if (this.contactShadow && this.shadowMat) {
        const lift = this.rig.character.position.y;
        const sc = Math.max(0.55, 1 - lift * 0.85);
        this.contactShadow.scale.set(sc, sc, 1);
        this.shadowMat.opacity = Math.max(0.32, 0.9 - lift * 1.1);
      }

      this.renderer.render(this.scene, this.camera);
    }

    return this.renderer.domElement;
  }

  public dispose(): void {
    if (this.rig) disposeObject3D(this.rig.root);
    if (this.contactShadow) {
      this.contactShadow.geometry.dispose();
    }
    this.shadowTex?.dispose();
    this.shadowMat?.dispose();
    this.envRT?.dispose();
    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.rig = null;
    this.contactShadow = null;
    this.shadowMat = null;
    this.shadowTex = null;
    this.envRT = null;
  }
}

export const dragonMascotRenderer = new DragonMascotRenderer();
