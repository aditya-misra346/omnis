/**
 * OMNIS Shared WebGL2 Fluid Ink Engine
 *
 * Uses AT MOST ONE shared offscreen WebGL2RenderingContext across all `FluidInkText`
 * instances, compositing live Navier-Stokes dye advection onto lightweight per-target
 * 2D mirror canvases via glyph-synchronized `source-in` masking.
 *
 * Designed for React 19 StrictMode (reference-counted teardown) and strict isolation
 * from `InteractiveGlobe3D` (passive listeners, drag short-circuit, zero shared overlays).
 */

export interface GlyphSpringTransform {
  x: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
}

export interface CachedGlyphMetric {
  char: string;
  pivotX: number;
  pivotY: number;
  baselineOffsetY: number;
  fontString: string;
}

export interface InkTargetRegistration {
  id: string;
  wrapperEl: HTMLElement;
  mirrorCanvas: HTMLCanvasElement;
  getGlyphMetrics: () => CachedGlyphMetric[];
  getTransforms: () => GlyphSpringTransform[];
  onReadyChange: (ready: boolean) => void;
}

interface TargetState extends InkTargetRegistration {
  intersecting: boolean;
  bounds: { pageLeft: number; pageTop: number; width: number; height: number };
}

const SIM_W = 144;
const SIM_H = 72;
const JACOBI_ITERATIONS = 7;
const SLEEP_ENERGY_THRESHOLD = 0.006;

const FULLSCREEN_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const SPLAT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec2 uPoint;
uniform vec3 uValue;
uniform float uRadius;
out vec4 fragColor;
void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  float splat = exp(-dot(p, p) / max(uRadius, 0.0001));
  vec3 base = texture(uTarget, vUv).rgb;
  fragColor = vec4(base + splat * uValue, 1.0);
}`;

const DIVERGENCE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
out vec4 fragColor;
void main() {
  float L = texture(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
  float B = texture(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
  float div = 0.5 * (R - L + T - B);
  fragColor = vec4(div, 0.0, 0.0, 1.0);
}`;

const PRESSURE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;
out vec4 fragColor;
void main() {
  float L = texture(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  float B = texture(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float div = texture(uDivergence, vUv).x;
  float p = (L + R + T + B - div) * 0.25;
  fragColor = vec4(p, 0.0, 0.0, 1.0);
}`;

const GRADIENT_SUBTRACT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
out vec4 fragColor;
void main() {
  float L = texture(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  float B = texture(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  vec2 vel = texture(uVelocity, vUv).xy;
  vel -= vec2(R - L, T - B) * 0.5;
  fragColor = vec4(vel, 0.0, 1.0);
}`;

const ADVECT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;
out vec4 fragColor;
void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexelSize * 32.0;
  vec4 result = uDissipation * texture(uSource, clamp(coord, 0.001, 0.999));
  fragColor = vec4(result.rgb, 1.0);
}`;

const DISPLAY_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform float uTime;
uniform float uTheme; // 0.0 = Obsidian Dark, 1.0 = Alabaster Light
uniform float uProceduralFallback;
out vec4 fragColor;

vec3 darkPalette(float f1, float f2, float vMag) {
  vec3 sapphire = vec3(0.145, 0.388, 0.922); // #2563eb
  vec3 electric = vec3(0.376, 0.647, 0.980); // #60a5fa
  vec3 cyan     = vec3(0.133, 0.827, 0.933); // #22d3ee
  vec3 violet   = vec3(0.655, 0.545, 0.980); // #a78bfa
  vec3 col = mix(sapphire, electric, clamp(f1 * 0.85 + 0.15, 0.0, 1.0));
  col = mix(col, cyan, clamp(f2 * 0.9 + vMag * 0.35, 0.0, 1.0));
  col = mix(col, violet, clamp(smoothstep(0.32, 0.88, f1 * 0.55 + f2 * 0.45), 0.0, 0.65));
  return col;
}

vec3 lightPalette(float f1, float f2, float vMag) {
  vec3 cobalt = vec3(0.114, 0.306, 0.847);   // #1d4ed8
  vec3 ocean  = vec3(0.008, 0.518, 0.780);   // #0284c7
  vec3 indigo = vec3(0.427, 0.157, 0.851);   // #6d28d9
  vec3 col = mix(cobalt, ocean, clamp(f1 * 0.8 + vMag * 0.3, 0.0, 1.0));
  col = mix(col, indigo, clamp(f2 * 0.78 + 0.12, 0.0, 0.85));
  // Relative luminance clamp so alabaster light text consistently holds >= 4.5:1 WCAG AA contrast
  float L = dot(pow(max(col, vec3(0.0)), vec3(2.2)), vec3(0.2126, 0.7152, 0.0722));
  if (L > 0.21) {
    col *= 0.21 / max(L, 0.001);
  }
  return col;
}

void main() {
  float f1 = 0.0;
  float f2 = 0.0;
  float vMag = 0.0;

  if (uProceduralFallback > 0.5) {
    f1 = 0.5 + 0.5 * sin(vUv.x * 6.2 + uTime * 1.1 + sin(vUv.y * 5.0 - uTime * 0.7));
    f2 = 0.5 + 0.5 * cos(vUv.y * 5.4 - uTime * 0.9 + cos(vUv.x * 4.5 + uTime * 0.6));
    vMag = 0.35 + 0.3 * sin((vUv.x + vUv.y) * 5.0 + uTime);
  } else {
    vec3 dye = texture(uDye, vUv).rgb;
    vec2 vel = texture(uVelocity, vUv).xy;
    float wave = 0.5 + 0.5 * sin(vUv.x * 4.2 + uTime * 0.75 + vel.x * 1.8);
    f1 = clamp(dye.r * 0.72 + wave * 0.28, 0.0, 1.0);
    f2 = clamp(dye.g * 0.78 + abs(dye.b) * 0.25 + vel.y * 0.25, 0.0, 1.0);
    vMag = clamp(length(vel) * 0.4, 0.0, 1.0);
  }

  vec3 color = uTheme > 0.5 ? lightPalette(f1, f2, vMag) : darkPalette(f1, f2, vMag);
  fragColor = vec4(color, 1.0);
}`;

interface FboHandle {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
}

interface DoubleFboHandle {
  read: FboHandle;
  write: FboHandle;
  swap: () => void;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }
  const prog = gl.createProgram();
  if (!prog) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

class SharedFluidInkEngine {
  private targets = new Map<string, TargetState>();
  private glCanvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private quadVao: WebGLVertexArrayObject | null = null;
  private quadVbo: WebGLBuffer | null = null;

  private programs: Record<string, WebGLProgram> = {};
  private fbos: {
    velocity?: DoubleFboHandle;
    dye?: DoubleFboHandle;
    pressure?: DoubleFboHandle;
    divergence?: FboHandle;
  } = {};

  private proceduralFallback = false;
  private contextLost = false;
  private initialized = false;

  private rafId = 0;
  private energy = 0;
  private awakeUntil = 0;
  private lastTickTime = 0;
  private lastPointerActivityTime = 0;
  private simTime = 0;
  private currentTheme: "dark" | "light" = "dark";
  private motionPaused = false;
  private prefersReducedMotion = false;
  private documentHidden = false;

  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private reducedMotionMq: MediaQueryList | null = null;
  private ambientIntervalId: ReturnType<typeof setInterval> | null = null;
  private isCoarsePointer = false;

  private pointerPrev: { x: number; y: number } | null = null;

  register(reg: InkTargetRegistration): () => void {
    const existing = this.targets.get(reg.id);
    if (existing) {
      this.targets.delete(reg.id);
    }

    const state: TargetState = {
      ...reg,
      intersecting: true,
      bounds: this.readBounds(reg.wrapperEl),
    };
    this.targets.set(reg.id, state);

    if (this.targets.size === 1) {
      this.mountGlobalResources();
    } else if (this.resizeObserver && this.intersectionObserver) {
      this.resizeObserver.observe(state.wrapperEl);
      this.intersectionObserver.observe(state.wrapperEl);
    }

    if (this.initialized && !this.contextLost && !this.isMotionDisabled()) {
      state.onReadyChange(true);
      this.seedInitialSwirl();
      this.wake(4500);
    } else {
      state.onReadyChange(false);
    }

    return () => this.unregister(reg.id);
  }

  unregister(id: string): void {
    const target = this.targets.get(id);
    if (!target) return;

    this.resizeObserver?.unobserve(target.wrapperEl);
    this.intersectionObserver?.unobserve(target.wrapperEl);
    target.onReadyChange(false);
    this.targets.delete(id);

    if (this.targets.size === 0) {
      this.disposeAllResources();
    }
  }

  setTheme(theme: "dark" | "light"): void {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    if (this.targets.size > 0 && !this.isMotionDisabled()) {
      this.seedInitialSwirl();
      this.wake(2400);
    }
  }

  setMotionPaused(paused: boolean): void {
    if (this.motionPaused === paused) return;
    this.motionPaused = paused;
    this.syncMotionState();
  }

  notifyLayoutChanged(id: string): void {
    const t = this.targets.get(id);
    if (t) {
      t.bounds = this.readBounds(t.wrapperEl);
      if (!this.isMotionDisabled() && this.initialized && !this.contextLost) {
        this.renderMirrorCanvas(t);
      }
    }
  }

  /** Trigger a localized touch ripple wave from mobile touch devices without blocking scroll. */
  pulseTouchWave(u: number, v: number, dx = 0.45, dy = 0.35): void {
    if (this.isMotionDisabled() || !this.initialized) return;
    const clampedU = Math.max(0.05, Math.min(0.95, u));
    const clampedV = Math.max(0.05, Math.min(0.95, v));
    const speed = Math.min(1, Math.hypot(dx, dy));
    this.splat(clampedU, clampedV, dx, dy, [
      0.38 + speed * 0.42,
      0.62 + speed * 0.32,
      0.72 + speed * 0.25,
    ]);
    this.lastPointerActivityTime = performance.now();
    this.wake(2800);
  }

  private isMotionDisabled(): boolean {
    return this.motionPaused || this.prefersReducedMotion || this.contextLost;
  }

  private syncMotionState(): void {
    const disabled = this.isMotionDisabled();
    for (const target of this.targets.values()) {
      target.onReadyChange(!disabled && this.initialized);
    }
    if (disabled) {
      this.stopLoop();
    } else if (this.initialized) {
      this.seedInitialSwirl();
      this.wake(3200);
    }
  }

  private readBounds(
    el: HTMLElement
  ): { pageLeft: number; pageTop: number; width: number; height: number } {
    const r = el.getBoundingClientRect();
    return {
      pageLeft: r.left + window.scrollX,
      pageTop: r.top + window.scrollY,
      width: Math.max(1, r.width),
      height: Math.max(1, r.height),
    };
  }

  private mountGlobalResources(): void {
    if (typeof window === "undefined") return;

    this.documentHidden = document.hidden;
    this.currentTheme =
      document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";

    this.reducedMotionMq = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
    this.prefersReducedMotion = Boolean(this.reducedMotionMq?.matches);
    this.reducedMotionMq?.addEventListener?.("change", this.handleReducedMotionChange);

    this.initWebGL2();

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        for (const t of this.targets.values()) {
          if (t.wrapperEl === entry.target) {
            t.bounds = this.readBounds(t.wrapperEl);
          }
        }
      }
      if (!this.isMotionDisabled() && this.initialized) {
        this.wake(1200);
      }
    });

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        let anyVisible = false;
        for (const entry of entries) {
          for (const t of this.targets.values()) {
            if (t.wrapperEl === entry.target) {
              t.intersecting = entry.isIntersecting;
              if (entry.isIntersecting) {
                t.bounds = this.readBounds(t.wrapperEl);
                anyVisible = true;
              }
            }
          }
        }
        if (anyVisible && !this.isMotionDisabled() && this.initialized) {
          this.wake(2400);
        }
      },
      { threshold: 0.05 }
    );

    for (const t of this.targets.values()) {
      this.resizeObserver.observe(t.wrapperEl);
      this.intersectionObserver.observe(t.wrapperEl);
    }

    window.addEventListener("pointermove", this.handlePointerMove, { passive: true });
    document.addEventListener("visibilitychange", this.handleVisibilityChange, { passive: true });

    // On coarse-pointer (mobile) viewports, run a gentle 0.35Hz autonomous harmonic phase shift when idle
    this.isCoarsePointer = Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);
    if (this.isCoarsePointer && !this.ambientIntervalId) {
      this.ambientIntervalId = setInterval(() => {
        if (
          this.isMotionDisabled() ||
          this.documentHidden ||
          !this.initialized ||
          this.targets.size === 0
        ) {
          return;
        }
        let anyVisible = false;
        for (const t of this.targets.values()) {
          if (t.intersecting) {
            anyVisible = true;
            break;
          }
        }
        if (!anyVisible) return;
        const now = performance.now();
        if (now - this.lastPointerActivityTime < 2200) return;
        const phase = now * 0.0022; // ~0.35Hz harmonic angular frequency
        const hx = 0.5 + 0.32 * Math.cos(phase);
        const hy = 0.5 + 0.24 * Math.sin(phase * 1.3);
        this.splat(hx, hy, Math.cos(phase) * 0.48, Math.sin(phase) * 0.42, [0.24, 0.38, 0.48]);
        this.wake(2600);
      }, 2850);
    }
  }

  private initWebGL2(): void {
    const canvas = document.createElement("canvas");
    canvas.width = SIM_W * 2;
    canvas.height = SIM_H * 2;
    // Keep the shared WebGL2 canvas DOM-attached offscreen so Chromium composites
    // it on GPU SharedImages rather than triggering a CPU ReadPixels stall during drawImage().
    canvas.setAttribute("aria-hidden", "true");
    canvas.tabIndex = -1;
    canvas.style.cssText =
      "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
    if (document.body) {
      document.body.appendChild(canvas);
    }

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
    });

    if (!gl) {
      canvas.remove();
      this.initialized = false;
      return;
    }

    this.glCanvas = canvas;
    this.gl = gl;

    canvas.addEventListener("webglcontextlost", this.handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", this.handleContextRestored, false);

    // Quad geometry
    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    if (!vao || !vbo) {
      this.disposeGLObjects();
      return;
    }
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.quadVao = vao;
    this.quadVbo = vbo;

    const displayProg = createProgram(gl, FULLSCREEN_VERT, DISPLAY_FRAG);
    if (!displayProg) {
      this.disposeGLObjects();
      return;
    }
    this.programs.display = displayProg;

    // Probe float FBO renderability cleanly so zero console warnings occur
    const floatExt = gl.getExtension("EXT_color_buffer_float");
    if (floatExt && this.initFluidFbos(gl)) {
      const splat = createProgram(gl, FULLSCREEN_VERT, SPLAT_FRAG);
      const div = createProgram(gl, FULLSCREEN_VERT, DIVERGENCE_FRAG);
      const press = createProgram(gl, FULLSCREEN_VERT, PRESSURE_FRAG);
      const grad = createProgram(gl, FULLSCREEN_VERT, GRADIENT_SUBTRACT_FRAG);
      const adv = createProgram(gl, FULLSCREEN_VERT, ADVECT_FRAG);

      if (splat && div && press && grad && adv) {
        this.programs.splat = splat;
        this.programs.divergence = div;
        this.programs.pressure = press;
        this.programs.gradient = grad;
        this.programs.advect = adv;
        this.proceduralFallback = false;
      } else {
        this.deleteFluidFbos();
        this.proceduralFallback = true;
      }
    } else {
      this.proceduralFallback = true;
    }

    this.initialized = true;
    this.contextLost = false;
    this.lastPointerActivityTime = performance.now();
    this.seedInitialSwirl();
  }

  private createFbo(gl: WebGL2RenderingContext, width: number, height: number): FboHandle | null {
    const tex = gl.createTexture();
    const fbo = gl.createFramebuffer();
    if (!tex || !fbo) {
      if (tex) gl.deleteTexture(tex);
      if (fbo) gl.deleteFramebuffer(fbo);
      return null;
    }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteTexture(tex);
      gl.deleteFramebuffer(fbo);
      return null;
    }
    return { texture: tex, fbo, width, height };
  }

  private createDoubleFbo(
    gl: WebGL2RenderingContext,
    width: number,
    height: number
  ): DoubleFboHandle | null {
    const a = this.createFbo(gl, width, height);
    const b = this.createFbo(gl, width, height);
    if (!a || !b) {
      if (a) {
        gl.deleteTexture(a.texture);
        gl.deleteFramebuffer(a.fbo);
      }
      if (b) {
        gl.deleteTexture(b.texture);
        gl.deleteFramebuffer(b.fbo);
      }
      return null;
    }
    return {
      read: a,
      write: b,
      swap() {
        const tmp = this.read;
        this.read = this.write;
        this.write = tmp;
      },
    };
  }

  private initFluidFbos(gl: WebGL2RenderingContext): boolean {
    const velocity = this.createDoubleFbo(gl, SIM_W, SIM_H);
    const dye = this.createDoubleFbo(gl, SIM_W, SIM_H);
    const pressure = this.createDoubleFbo(gl, SIM_W, SIM_H);
    const divergence = this.createFbo(gl, SIM_W, SIM_H);

    if (!velocity || !dye || !pressure || !divergence) {
      this.fbos = { velocity: velocity ?? undefined, dye: dye ?? undefined, pressure: pressure ?? undefined, divergence: divergence ?? undefined };
      this.deleteFluidFbos();
      return false;
    }

    this.fbos = { velocity, dye, pressure, divergence };
    return true;
  }

  private deleteFbo(gl: WebGL2RenderingContext, h?: FboHandle): void {
    if (!h) return;
    gl.deleteTexture(h.texture);
    gl.deleteFramebuffer(h.fbo);
  }

  private deleteFluidFbos(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.fbos.velocity) {
      this.deleteFbo(gl, this.fbos.velocity.read);
      this.deleteFbo(gl, this.fbos.velocity.write);
    }
    if (this.fbos.dye) {
      this.deleteFbo(gl, this.fbos.dye.read);
      this.deleteFbo(gl, this.fbos.dye.write);
    }
    if (this.fbos.pressure) {
      this.deleteFbo(gl, this.fbos.pressure.read);
      this.deleteFbo(gl, this.fbos.pressure.write);
    }
    this.deleteFbo(gl, this.fbos.divergence);
    this.fbos = {};
  }

  private disposeGLObjects(): void {
    const gl = this.gl;
    if (!gl) return;
    this.deleteFluidFbos();
    for (const p of Object.values(this.programs)) {
      gl.deleteProgram(p);
    }
    this.programs = {};
    if (this.quadVbo) gl.deleteBuffer(this.quadVbo);
    if (this.quadVao) gl.deleteVertexArray(this.quadVao);
    this.quadVbo = null;
    this.quadVao = null;
    if (this.glCanvas) {
      this.glCanvas.removeEventListener("webglcontextlost", this.handleContextLost);
      this.glCanvas.removeEventListener("webglcontextrestored", this.handleContextRestored);
      this.glCanvas.remove();
    }
    this.glCanvas = null;
    this.gl = null;
    this.initialized = false;
  }

  private disposeAllResources(): void {
    this.stopLoop();
    if (this.ambientIntervalId) {
      clearInterval(this.ambientIntervalId);
      this.ambientIntervalId = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("pointermove", this.handlePointerMove);
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
      this.reducedMotionMq?.removeEventListener?.("change", this.handleReducedMotionChange);
    }
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.resizeObserver = null;
    this.intersectionObserver = null;
    this.reducedMotionMq = null;
    this.pointerPrev = null;
    this.disposeGLObjects();
  }

  private blit(target: FboHandle | null, width: number, height: number): void {
    const gl = this.gl;
    if (!gl || !this.quadVao) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
    gl.viewport(0, 0, width, height);
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private splat(uvX: number, uvY: number, dx: number, dy: number, color: [number, number, number]): void {
    if (this.proceduralFallback || !this.gl || !this.fbos.velocity || !this.fbos.dye || !this.programs.splat) {
      return;
    }
    const gl = this.gl;
    const prog = this.programs.splat;
    gl.useProgram(prog);
    gl.uniform1f(gl.getUniformLocation(prog, "uAspect"), SIM_W / SIM_H);
    gl.uniform2f(gl.getUniformLocation(prog, "uPoint"), uvX, uvY);

    // Velocity splat
    gl.uniform1f(gl.getUniformLocation(prog, "uRadius"), 0.018);
    gl.uniform3f(gl.getUniformLocation(prog, "uValue"), dx * 0.45, dy * 0.45, 0.0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fbos.velocity.read.texture);
    gl.uniform1i(gl.getUniformLocation(prog, "uTarget"), 0);
    this.blit(this.fbos.velocity.write, SIM_W, SIM_H);
    this.fbos.velocity.swap();

    // Dye splat
    gl.uniform1f(gl.getUniformLocation(prog, "uRadius"), 0.032);
    gl.uniform3f(gl.getUniformLocation(prog, "uValue"), color[0], color[1], color[2]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fbos.dye.read.texture);
    gl.uniform1i(gl.getUniformLocation(prog, "uTarget"), 0);
    this.blit(this.fbos.dye.write, SIM_W, SIM_H);
    this.fbos.dye.swap();
  }

  private seedInitialSwirl(): void {
    if (this.proceduralFallback || !this.initialized) return;
    this.splat(0.24, 0.52, 0.9, 0.35, [0.45, 0.72, 0.3]);
    this.splat(0.55, 0.48, -0.7, 0.55, [0.35, 0.85, 0.55]);
    this.splat(0.82, 0.55, -0.5, -0.45, [0.68, 0.42, 0.85]);
  }

  private wake(durationMs = 2400): void {
    this.energy = 1.0;
    const targetUntil = performance.now() + durationMs;
    if (targetUntil > this.awakeUntil) {
      this.awakeUntil = targetUntil;
    }
    if (!this.rafId && !this.isMotionDisabled() && !this.documentHidden) {
      this.lastTickTime = performance.now();
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  private stopLoop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private handleReducedMotionChange = (e: MediaQueryListEvent): void => {
    this.prefersReducedMotion = e.matches;
    this.syncMotionState();
  };

  private handleVisibilityChange = (): void => {
    this.documentHidden = document.hidden;
    if (this.documentHidden) {
      this.stopLoop();
    } else if (!this.isMotionDisabled() && this.initialized) {
      this.wake(2400);
    }
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
    this.syncMotionState();
  };

  private handleContextRestored = (): void => {
    this.disposeGLObjects();
    this.initWebGL2();
    this.syncMotionState();
  };

  private handlePointerMove = (e: PointerEvent): void => {
    // Critical globe safety: never interfere while dragging (e.buttons !== 0) or hovering globe canvas
    if (e.buttons !== 0 || this.isMotionDisabled() || !this.initialized) return;
    if (e.target instanceof Element && e.target.closest('[data-globe-stage="true"]')) {
      this.pointerPrev = null;
      return;
    }

    const pageX = e.clientX + window.scrollX;
    const pageY = e.clientY + window.scrollY;
    const dx = this.pointerPrev ? pageX - this.pointerPrev.x : 0;
    const dy = this.pointerPrev ? pageY - this.pointerPrev.y : 0;
    this.pointerPrev = { x: pageX, y: pageY };

    let hitAny = false;
    for (const t of this.targets.values()) {
      if (!t.intersecting) continue;
      const b = t.bounds;
      const margin = 72;
      if (
        pageX >= b.pageLeft - margin &&
        pageX <= b.pageLeft + b.width + margin &&
        pageY >= b.pageTop - margin &&
        pageY <= b.pageTop + b.height + margin
      ) {
        hitAny = true;
        const u = Math.max(0.05, Math.min(0.95, (pageX - b.pageLeft) / b.width));
        const v = Math.max(0.05, Math.min(0.95, 1.0 - (pageY - b.pageTop) / b.height));
        const clampedDx = Math.max(-24, Math.min(24, dx)) * 0.14;
        const clampedDy = Math.max(-24, Math.min(24, -dy)) * 0.14;
        const speed = Math.min(1, Math.hypot(clampedDx, clampedDy));
        this.splat(u, v, clampedDx, clampedDy, [
          0.32 + speed * 0.45,
          0.42 + speed * 0.4,
          0.35 + speed * 0.35,
        ]);
      }
    }

    if (hitAny) {
      this.lastPointerActivityTime = performance.now();
      this.wake(3200);
    }
  };

  private stepSimulation(dt: number, now: number): void {
    const gl = this.gl;
    if (!gl || this.proceduralFallback) return;
    const { velocity, dye, pressure, divergence } = this.fbos;
    if (!velocity || !dye || !pressure || !divergence) return;

    // Subtle idle Lissajous micro-brush after 2.6s when visible and awake
    if (now - this.lastPointerActivityTime > 2600 && now < this.awakeUntil) {
      const t = this.simTime;
      const lx = 0.5 + 0.36 * Math.sin(0.45 * t);
      const ly = 0.5 + 0.28 * Math.sin(1.1 * t + 0.6);
      const vx = Math.cos(0.45 * t) * 0.55;
      const vy = Math.cos(1.1 * t + 0.6) * 0.55;
      this.splat(lx, ly, vx, vy, [0.16, 0.22, 0.2]);
    }

    const divProg = this.programs.divergence;
    const pressProg = this.programs.pressure;
    const gradProg = this.programs.gradient;
    const advProg = this.programs.advect;
    if (!divProg || !pressProg || !gradProg || !advProg) return;

    const texelX = 1.0 / SIM_W;
    const texelY = 1.0 / SIM_H;

    // 1. Divergence
    gl.useProgram(divProg);
    gl.uniform2f(gl.getUniformLocation(divProg, "uTexelSize"), texelX, texelY);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1i(gl.getUniformLocation(divProg, "uVelocity"), 0);
    this.blit(divergence, SIM_W, SIM_H);

    // 2. Jacobi pressure iterations (7 steps)
    gl.useProgram(pressProg);
    gl.uniform2f(gl.getUniformLocation(pressProg, "uTexelSize"), texelX, texelY);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, divergence.texture);
    gl.uniform1i(gl.getUniformLocation(pressProg, "uDivergence"), 1);
    for (let i = 0; i < JACOBI_ITERATIONS; i++) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pressure.read.texture);
      gl.uniform1i(gl.getUniformLocation(pressProg, "uPressure"), 0);
      this.blit(pressure.write, SIM_W, SIM_H);
      pressure.swap();
    }

    // 3. Gradient subtract
    gl.useProgram(gradProg);
    gl.uniform2f(gl.getUniformLocation(gradProg, "uTexelSize"), texelX, texelY);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pressure.read.texture);
    gl.uniform1i(gl.getUniformLocation(gradProg, "uPressure"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1i(gl.getUniformLocation(gradProg, "uVelocity"), 1);
    this.blit(velocity.write, SIM_W, SIM_H);
    velocity.swap();

    // 4. Advect velocity
    gl.useProgram(advProg);
    gl.uniform2f(gl.getUniformLocation(advProg, "uTexelSize"), texelX, texelY);
    gl.uniform1f(gl.getUniformLocation(advProg, "uDt"), dt);
    gl.uniform1f(gl.getUniformLocation(advProg, "uDissipation"), 0.982);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1i(gl.getUniformLocation(advProg, "uVelocity"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1i(gl.getUniformLocation(advProg, "uSource"), 1);
    this.blit(velocity.write, SIM_W, SIM_H);
    velocity.swap();

    // 5. Advect dye
    gl.uniform1f(gl.getUniformLocation(advProg, "uDissipation"), 0.992);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dye.read.texture);
    gl.uniform1i(gl.getUniformLocation(advProg, "uSource"), 1);
    this.blit(dye.write, SIM_W, SIM_H);
    dye.swap();
  }

  private renderWebGLDisplay(): void {
    const gl = this.gl;
    const prog = this.programs.display;
    if (!gl || !prog || !this.glCanvas) return;

    gl.useProgram(prog);
    gl.uniform1f(gl.getUniformLocation(prog, "uTime"), this.simTime);
    gl.uniform1f(gl.getUniformLocation(prog, "uTheme"), this.currentTheme === "light" ? 1.0 : 0.0);
    gl.uniform1f(
      gl.getUniformLocation(prog, "uProceduralFallback"),
      this.proceduralFallback ? 1.0 : 0.0
    );

    if (!this.proceduralFallback && this.fbos.dye && this.fbos.velocity) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fbos.dye.read.texture);
      gl.uniform1i(gl.getUniformLocation(prog, "uDye"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.fbos.velocity.read.texture);
      gl.uniform1i(gl.getUniformLocation(prog, "uVelocity"), 1);
    }

    this.blit(null, this.glCanvas.width, this.glCanvas.height);
  }

  private renderMirrorCanvas(t: TargetState): void {
    if (!this.glCanvas || !t.intersecting) return;
    const mirror = t.mirrorCanvas;
    const ctx = mirror.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.max(1, Math.round(t.bounds.width * dpr));
    const targetH = Math.max(1, Math.round(t.bounds.height * dpr));
    if (mirror.width !== targetW || mirror.height !== targetH) {
      mirror.width = targetW;
      mirror.height = targetH;
    }

    const metrics = t.getGlyphMetrics();
    if (metrics.length === 0) return;

    const transforms = t.getTransforms();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, t.bounds.width, t.bounds.height);

    // Paint synchronized glyph silhouettes
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    for (let i = 0; i < metrics.length; i++) {
      const m = metrics[i];
      const tr = transforms[i];
      if (!m.char.trim()) continue;
      ctx.font = m.fontString;
      ctx.save();
      if (tr) {
        ctx.translate(m.pivotX + tr.x, m.pivotY + tr.y);
        if (tr.rot !== 0) ctx.rotate((tr.rot * Math.PI) / 180);
        if (tr.sx !== 1 || tr.sy !== 1) ctx.scale(tr.sx, tr.sy);
      } else {
        ctx.translate(m.pivotX, m.pivotY);
      }
      ctx.fillText(m.char, 0, m.baselineOffsetY);
      ctx.restore();
    }

    // Clip shared WebGL2 fluid texture cleanly into the exact animated glyphs
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.drawImage(this.glCanvas, 0, 0, targetW, targetH);
    ctx.globalCompositeOperation = "source-over";
  }

  private tick = (now: number): void => {
    this.rafId = 0;

    if (this.isMotionDisabled() || this.documentHidden || this.targets.size === 0) {
      return;
    }

    let anyIntersecting = false;
    for (const t of this.targets.values()) {
      if (t.intersecting) {
        anyIntersecting = true;
        break;
      }
    }
    if (!anyIntersecting) {
      return;
    }

    const dt = Math.min(0.033, Math.max(0.004, (now - this.lastTickTime) / 1000));
    this.lastTickTime = now;
    this.simTime += dt;

    this.stepSimulation(dt, now);
    this.renderWebGLDisplay();

    for (const t of this.targets.values()) {
      this.renderMirrorCanvas(t);
    }

    if (now > this.awakeUntil) {
      this.energy *= 0.94;
    }

    if (this.energy > SLEEP_ENERGY_THRESHOLD || now <= this.awakeUntil) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  };
}

let singletonEngine: SharedFluidInkEngine | null = null;

export function getSharedFluidInkEngine(): SharedFluidInkEngine {
  if (!singletonEngine) {
    singletonEngine = new SharedFluidInkEngine();
  }
  return singletonEngine;
}
