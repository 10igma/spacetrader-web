// Lets PixiJS run under a strict Content-Security-Policy (no eval): needed for app stores and embeds.
import 'pixi.js/unsafe-eval';
import { Application, Geometry, Mesh, Shader } from 'pixi.js';
import { SPACE_FRAG, SPACE_VERT } from './space.glsl.ts';

type Vec3 = [number, number, number];

interface Uniforms {
  uTime: number;
  uRes: Float32Array;
  uPointer: Float32Array;
  uPlanet: Float32Array;
  uRift: Float32Array;
  uFlash: number;
  uDetail: number;
  uWarp: number;
  uSeed: number;
  uAtmo: Float32Array;
  uWater: Float32Array;
  uLand: Float32Array;
}

export interface WorldLook {
  seed: number;
  atmo: [number, number, number];
  water: [number, number, number];
  land: [number, number, number];
}

const QUALITY_STEPS = [1, 0.75, 0.55] as const;

/**
 * The GPU stage behind the DOM UI. Owns the render loop and exposes a small
 * set of animatable targets. Screens never touch WebGL directly.
 */
export class Stage {
  private app = new Application();
  private u!: Uniforms;
  private start = performance.now();
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private planet = { cur: [0.3, 0.52, 0.62] as Vec3, target: [0.3, 0.52, 0.62] as Vec3 };
  private rift = { color: [1, 1, 1] as Vec3, cur: 0, target: 0 };
  private flash = 0;
  private warp = { cur: 0, target: 0 };
  private quality = 0;
  private frameTimes: number[] = [];
  private baseDpr = 1;
  private fixedQuality = false;

  async init(canvas: HTMLCanvasElement): Promise<void> {
    const params = new URLSearchParams(location.search);
    this.baseDpr = Math.min(window.devicePixelRatio || 1, 2);
    const forced = params.get('q');
    if (forced === 'high') { this.quality = 0; this.fixedQuality = true; }
    if (forced === 'low') { this.quality = 2; this.fixedQuality = true; }

    await this.app.init({
      canvas,
      resizeTo: window,
      preference: 'webgl',
      antialias: false,
      autoDensity: true,
      backgroundColor: 0x02030a,
      resolution: this.baseDpr * QUALITY_STEPS[this.quality]!,
      powerPreference: 'high-performance',
    });

    const geometry = new Geometry({
      attributes: {
        aPosition: [-1, -1, 1, -1, 1, 1, -1, 1],
        aUV: [0, 0, 1, 0, 1, 1, 0, 1],
      },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    const shader = Shader.from({
      gl: { vertex: SPACE_VERT, fragment: SPACE_FRAG },
      resources: {
        space: {
          uTime: { value: 0, type: 'f32' },
          uRes: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uPointer: { value: new Float32Array([0, 0]), type: 'vec2<f32>' },
          uPlanet: { value: new Float32Array(this.planet.cur), type: 'vec3<f32>' },
          uRift: { value: new Float32Array([1, 1, 1, 0]), type: 'vec4<f32>' },
          uFlash: { value: 0, type: 'f32' },
          uDetail: { value: 1, type: 'f32' },
          uWarp: { value: 0, type: 'f32' },
          uSeed: { value: 3, type: 'f32' },
          uAtmo: { value: new Float32Array([0.16, 0.56, 1.0]), type: 'vec3<f32>' },
          uWater: { value: new Float32Array([0.008, 0.06, 0.11]), type: 'vec3<f32>' },
          uLand: { value: new Float32Array([0.11, 0.085, 0.07]), type: 'vec3<f32>' },
        },
      },
    });
    this.u = (shader.resources.space as { uniforms: Uniforms }).uniforms;
    this.app.stage.addChild(new Mesh({ geometry, shader }));

    window.addEventListener('pointermove', (e) => {
      this.pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    });
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null || e.beta == null) return;
      this.pointer.tx = Math.max(-1, Math.min(1, e.gamma / 30));
      this.pointer.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    });

    this.app.ticker.add((ticker) => this.frame(ticker.deltaMS));
  }

  /** Planet placement in screen-width units, y up, origin at screen center. */
  setPlanet(x: number, y: number, radius: number): void {
    this.planet.target = [x, y, radius];
  }

  /** Jump the planet to a position without easing (used while it is hidden by warp). */
  snapPlanet(x: number, y: number, radius: number): void {
    this.planet.cur = [x, y, radius];
    this.planet.target = [x, y, radius];
  }

  /** Swap which world is rendered. Do this while the planet is off screen. */
  setWorld(look: WorldLook): void {
    if (!this.u) return;
    this.u.uSeed = look.seed;
    this.u.uAtmo.set(look.atmo);
    this.u.uWater.set(look.water);
    this.u.uLand.set(look.land);
  }

  setWarp(amount: number): void {
    this.warp.target = amount;
  }

  setRift(color: Vec3 | null, intensity: number): void {
    if (color) this.rift.color = color;
    this.rift.target = intensity;
  }

  pulse(amount = 0.6): void {
    this.flash = Math.max(this.flash, amount);
  }

  private frame(dtMs: number): void {
    const dt = Math.min(dtMs, 100) / 1000;
    const k = (rate: number): number => 1 - Math.exp(-dt * rate);
    const w = this.app.renderer.width, h = this.app.renderer.height;

    this.pointer.x += (this.pointer.tx - this.pointer.x) * k(4);
    this.pointer.y += (this.pointer.ty - this.pointer.y) * k(4);
    for (let i = 0; i < 3; i++) {
      this.planet.cur[i]! += (this.planet.target[i]! - this.planet.cur[i]!) * k(2.2);
    }
    this.rift.cur += (this.rift.target - this.rift.cur) * k(this.rift.target > this.rift.cur ? 5 : 7);
    this.flash *= Math.exp(-dt * 5);
    this.warp.cur += (this.warp.target - this.warp.cur) * k(this.warp.target > this.warp.cur ? 2.2 : 3.2);
    this.u.uWarp = this.warp.cur;

    this.u.uTime = (performance.now() - this.start) / 1000;
    this.u.uRes[0] = w; this.u.uRes[1] = h;
    this.u.uPointer[0] = this.pointer.x; this.u.uPointer[1] = this.pointer.y;
    this.u.uPlanet.set(this.planet.cur);
    this.u.uRift[0] = this.rift.color[0]; this.u.uRift[1] = this.rift.color[1];
    this.u.uRift[2] = this.rift.color[2]; this.u.uRift[3] = this.rift.cur;
    this.u.uFlash = this.flash;
    this.u.uDetail = this.quality >= 2 ? 0 : 1;

    this.adaptQuality(dtMs);
  }

  /** Step resolution down if the device cannot hold the frame budget. */
  private adaptQuality(dtMs: number): void {
    if (this.fixedQuality || this.quality >= QUALITY_STEPS.length - 1) return;
    this.frameTimes.push(dtMs);
    if (this.frameTimes.length < 90) return;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const median = sorted[45]!;
    this.frameTimes = [];
    if (median > 22) {
      this.quality += 1;
      this.app.renderer.resolution = this.baseDpr * QUALITY_STEPS[this.quality]!;
      this.app.renderer.resize(window.innerWidth, window.innerHeight);
    }
  }
}
