"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FlaskConical,
  RotateCcw,
  Bookmark,
  Check,
  Play,
  Pause,
  Info,
  Download,
  Share2,
} from "lucide-react";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import {
  OmnisButton,
  OmnisModuleHeader,
  OmnisSegmentedControl,
} from "@/components/ui/OmnisPrimitives";
import { OmnisParameterSlider } from "@/components/ui/OmnisParameterSlider";
import { OmnisMathBlock } from "@/components/ui/OmnisMathBlock";

const LAB_EQUATIONS_LATEX: Record<string, string> = {
  physics:
    "\\frac{d^2\\theta}{dt^2} + \\frac{b}{m}\\frac{d\\theta}{dt} + \\frac{g}{L}\\sin(\\theta) = 0 \\quad\\vert\\quad T \\approx 2\\pi\\sqrt{\\frac{L}{g}}",
  space:
    "v^2 = G M\\left(\\frac{2}{r} - \\frac{1}{a}\\right) \\quad\\vert\\quad r(\\theta) = \\frac{a(1 - e^2)}{1 + e\\cos\\theta}",
  chemistry:
    "E_{\\text{vib}} = \\left(v + \\frac{1}{2}\\right)\\hbar\\omega \\quad\\vert\\quad \\mu = q \\cdot d \\cdot \\cos\\!\\left(\\frac{\\theta}{2}\\right)",
  biology:
    "\\frac{dx}{dt} = \\alpha x - \\beta x y \\quad\\vert\\quad \\frac{dy}{dt} = \\delta x y - \\gamma y",
  climate:
    "\\frac{(1 - \\alpha)S_0}{4} = \\varepsilon\\sigma T_s^4 - 5.35\\ln\\!\\left(\\frac{C}{C_0}\\right)",
  engineering:
    "\\delta_{\\max} = \\frac{F L^3}{48 E I} \\quad\\vert\\quad SF = \\frac{\\sigma_{\\text{yield}}}{\\sigma_{\\text{axial}}}",
};

type LabCategoryId =
  | "physics"
  | "space"
  | "chemistry"
  | "biology"
  | "climate"
  | "engineering";

interface LabExperimentSpec {
  id: LabCategoryId;
  category: string;
  title: string;
  objective: string;
  background: string;
  equations: string;
  modelDisclosure: string;
  param1: { label: string; unit: string; min: number; max: number; step: number; defaultVal: number };
  param2: { label: string; unit: string; min: number; max: number; step: number; defaultVal: number };
  param3: { label: string; unit: string; min: number; max: number; step: number; defaultVal: number };
}

const LAB_EXPERIMENTS: LabExperimentSpec[] = [
  {
    id: "physics",
    category: "Physics",
    title: "Gravitational Pendulum, Damped Harmonic Motion & Wave Superposition",
    objective:
      "Observe how gravitational field strength (g), damping viscosity, and driving frequency govern angular acceleration and phase-space energy transfer.",
    background:
      "Classical mechanics models oscillatory restoration forces via second-order differential equations. Changing g (e.g., Moon 1.62 m/s² vs Earth 9.81 m/s² vs Jupiter 24.79 m/s²) directly shifts the natural resonant period T = 2π√(L/g).",
    equations: "d²θ/dt² + (b/m) dθ/dt + (g/L) sin(θ) = 0   |   T ≈ 2π √(L / g)",
    modelDisclosure:
      "Simplified Educational & Analytical Model: Uses symplectic Euler integration of the non-linear pendulum equation without aerodynamic turbulence.",
    param1: { label: "Gravity (g)", unit: "m/s²", min: 1.6, max: 25.0, step: 0.2, defaultVal: 9.8 },
    param2: { label: "Pendulum Length (L)", unit: "m", min: 0.5, max: 4.0, step: 0.25, defaultVal: 1.8 },
    param3: { label: "Damping Coefficient (b)", unit: "Ns/m", min: 0.0, max: 0.5, step: 0.02, defaultVal: 0.04 },
  },
  {
    id: "space",
    category: "Space & Astrophysics",
    title: "Keplerian Planetary Orbital Mechanics & Gravitational Well Simulator",
    objective:
      "Manipulate stellar mass, orbital eccentricity, and semi-major axis to verify Kepler's Third Law (T² ∝ a³) and vis-viva orbital velocity conservation.",
    background:
      "In a two-body gravitational system, a planet sweeps out equal areas in equal times (conservation of angular momentum), accelerating near perihelion and decelerating near aphelion.",
    equations: "v² = G·M (2/r - 1/a)   |   r(θ) = a(1 - e²) / (1 + e·cos θ)",
    modelDisclosure:
      "Simplified Educational Model: 2-body Newtonian Keplerian solver; omits general relativistic perihelion precession and N-body perturbations.",
    param1: { label: "Central Star Mass", unit: "M☉", min: 0.5, max: 3.0, step: 0.1, defaultVal: 1.0 },
    param2: { label: "Orbital Eccentricity (e)", unit: "", min: 0.0, max: 0.75, step: 0.05, defaultVal: 0.35 },
    param3: { label: "Semi-Major Axis (a)", unit: "AU", min: 0.6, max: 2.2, step: 0.1, defaultVal: 1.2 },
  },
  {
    id: "chemistry",
    category: "Chemistry",
    title: "Molecular Geometry, VSEPR Bond Angles & Vibrational Thermal Energy",
    objective:
      "Inspect covalent bond angles, dipole polarity, and thermal vibrational amplitude across triatomic and tetrahedral molecules.",
    background:
      "Valence Shell Electron Pair Repulsion (VSEPR) theory and molecular orbital hybridisation (sp³, sp², sp) determine 3D molecular geometry and infrared vibrational modes.",
    equations: "E_vib = (v + ½) ℏ ω   |   μ = q · d · cos(θ / 2)",
    modelDisclosure:
      "Simplified Educational Model: Harmonic ball-and-spring representation of covalent bonds.",
    param1: { label: "Bond Angle (θ)", unit: "deg", min: 90, max: 180, step: 1.5, defaultVal: 104.5 },
    param2: { label: "Thermal Excitation (T)", unit: "K", min: 100, max: 900, step: 50, defaultVal: 300 },
    param3: { label: "Electronegativity Δχ", unit: "Pauling", min: 0.0, max: 2.0, step: 0.1, defaultVal: 1.24 },
  },
  {
    id: "biology",
    category: "Biology & Ecosystems",
    title: "Lotka-Volterra Predator-Prey Population Dynamics & Carrying Capacity",
    objective:
      "Explore non-linear phase oscillations between autotrophic/herbivore prey and apex predator populations.",
    background:
      "Coupled first-order non-linear differential equations describe how trophic interactions produce endogenous population cycles without external periodic forcing.",
    equations: "dx/dt = αx - βxy   |   dy/dt = δxy - γy",
    modelDisclosure:
      "Simplified Educational Model: Deterministic continuous Lotka-Volterra system without spatial patchiness or stochastic extinction.",
    param1: { label: "Prey Growth Rate (α)", unit: "/yr", min: 0.3, max: 1.8, step: 0.1, defaultVal: 0.9 },
    param2: { label: "Predation Rate (β)", unit: "", min: 0.1, max: 0.8, step: 0.05, defaultVal: 0.35 },
    param3: { label: "Predator Mortality (γ)", unit: "/yr", min: 0.2, max: 1.2, step: 0.1, defaultVal: 0.6 },
  },
  {
    id: "climate",
    category: "Climate Systems",
    title: "Planetary Radiative Energy Balance, Ice-Albedo Feedback & CO2 Forcing",
    objective:
      "Calculate equilibrium planetary surface temperature from solar irradiance, planetary albedo, and atmospheric greenhouse optical depth.",
    background:
      "Earth's climate balances incoming shortwave solar radiation against outgoing longwave Stefan-Boltzmann infrared radiation trapped by greenhouse gases.",
    equations: "(1 - α) S₀ / 4 = ε σ T_s⁴ - 5.35 · ln(C / C₀)",
    modelDisclosure:
      "Simplified Educational Model: 0-dimensional radiative-convective energy balance model calibrated to IPCC AR6 radiative forcing constant.",
    param1: { label: "Atmospheric CO2", unit: "ppm", min: 280, max: 900, step: 10, defaultVal: 425 },
    param2: { label: "Planetary Albedo (α)", unit: "", min: 0.20, max: 0.40, step: 0.01, defaultVal: 0.30 },
    param3: { label: "Solar Constant (S₀)", unit: "W/m²", min: 1350, max: 1380, step: 2, defaultVal: 1361 },
  },
  {
    id: "engineering",
    category: "Structural Engineering",
    title: "Pratt Truss Bridge Structural Load Distribution, Deflection & Safety Factor",
    objective:
      "Analyze axial tension/compression member forces, mid-span bending deflection, and structural safety factor under live vehicular loads.",
    background:
      "In a Pratt truss bridge, diagonal web members resist tensile forces while vertical members absorb compressive loads. Increasing truss depth reduces chord bending stress.",
    equations: "δ_max = (F · L³) / (48 · E · I)   |   SF = σ_yield / σ_axial",
    modelDisclosure:
      "Simplified Educational Model: Pin-jointed linear elastic Euler-Bernoulli truss approximation.",
    param1: { label: "Applied Mid-Span Load", unit: "kN", min: 100, max: 1500, step: 50, defaultVal: 550 },
    param2: { label: "Bridge Span Length (L)", unit: "m", min: 20, max: 80, step: 5, defaultVal: 40 },
    param3: { label: "Steel Truss Depth (h)", unit: "m", min: 3, max: 12, step: 0.5, defaultVal: 6.5 },
  },
];

function parseLabParam(
  raw: string | null,
  spec: { min: number; max: number; defaultVal: number }
): number {
  if (raw === null || raw.trim() === "") return spec.defaultVal;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return spec.defaultVal;
  return Math.min(spec.max, Math.max(spec.min, parsed));
}

function LaboratoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCatParam = (searchParams.get("cat") ?? searchParams.get("module")) as LabCategoryId | null;
  const resolvedUrlCat =
    urlCatParam && LAB_EXPERIMENTS.some((e) => e.id === urlCatParam)
      ? urlCatParam
      : null;

  const [activeId, setActiveId] = useState<LabCategoryId>(resolvedUrlCat ?? "physics");
  const [running, setRunning] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const exp = LAB_EXPERIMENTS.find((e) => e.id === activeId) ?? LAB_EXPERIMENTS[0];

  const [p1, setP1] = useState(() => parseLabParam(searchParams.get("p1"), exp.param1));
  const [p2, setP2] = useState(() => parseLabParam(searchParams.get("p2"), exp.param2));
  const [p3, setP3] = useState(() => parseLabParam(searchParams.get("p3"), exp.param3));
  const lastSyncedLabQueryRef = useRef<string | null>(null);
  const hasMountedLabRef = useRef(false);

  const { theme, motionPaused, addWorkspaceItem, setActiveContext } = useOmnisStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 720, height: 320 });
  const simTimeRef = useRef(0);
  const pendulumRef = useRef({ theta: 0.65, omega: 0, dragging: false });
  const orbitDraggingRef = useRef(false);
  const [activeTrussPanel, setActiveTrussPanel] = useState<number | null>(2);
  const [hoverTrussPanel, setHoverTrussPanel] = useState<number | null>(null);
  const [interactiveReadout, setInteractiveReadout] = useState<string | null>(null);
  const [manualDrawTick, setManualDrawTick] = useState(0);
  const labLiveRef = useRef({
    activeId,
    p1,
    p2,
    p3,
    running,
    motionPaused,
    theme,
    canvasSize,
    activeTrussPanel,
    hoverTrussPanel,
  });
  labLiveRef.current = {
    activeId,
    p1,
    p2,
    p3,
    running,
    motionPaused,
    theme,
    canvasSize,
    activeTrussPanel,
    hoverTrussPanel,
  };

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const syncSize = () => {
      const nextW = Math.max(320, el.clientWidth || 720);
      const nextH = Math.max(240, el.clientHeight || 320);
      setCanvasSize((prev) =>
        Math.abs(prev.width - nextW) > 2 || Math.abs(prev.height - nextH) > 2
          ? { width: nextW, height: nextH }
          : prev
      );
    };
    syncSize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSize) : null;
    ro?.observe(el);
    window.addEventListener("resize", syncSize);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", syncSize);
    };
  }, []);

  const urlP1 = searchParams.get("p1");
  const urlP2 = searchParams.get("p2");
  const urlP3 = searchParams.get("p3");

  useEffect(() => {
    const currentQs = searchParams.toString();
    if (lastSyncedLabQueryRef.current !== null && currentQs === lastSyncedLabQueryRef.current) {
      return;
    }
    if (resolvedUrlCat && resolvedUrlCat !== activeId) {
      const targetExp = LAB_EXPERIMENTS.find((e) => e.id === resolvedUrlCat) ?? LAB_EXPERIMENTS[0];
      setActiveId(resolvedUrlCat);
      setP1(parseLabParam(urlP1, targetExp.param1));
      setP2(parseLabParam(urlP2, targetExp.param2));
      setP3(parseLabParam(urlP3, targetExp.param3));
    } else if (urlP1 !== null || urlP2 !== null || urlP3 !== null) {
      if (urlP1 !== null) setP1(parseLabParam(urlP1, exp.param1));
      if (urlP2 !== null) setP2(parseLabParam(urlP2, exp.param2));
      if (urlP3 !== null) setP3(parseLabParam(urlP3, exp.param3));
    }
  }, [searchParams, resolvedUrlCat, urlP1, urlP2, urlP3, activeId, exp]);

  useEffect(() => {
    setActiveContext("Digital World Laboratory", exp.title);
  }, [exp.title, setActiveContext]);

  useEffect(() => {
    if (!hasMountedLabRef.current) {
      hasMountedLabRef.current = true;
      return;
    }
    const params = new URLSearchParams({
      cat: activeId,
      p1: String(p1),
      p2: String(p2),
      p3: String(p3),
    });
    const qs = params.toString();
    lastSyncedLabQueryRef.current = qs;
    router.replace(`/laboratory?${qs}`, { scroll: false });
  }, [activeId, p1, p2, p3, router]);

  const handleSelectDiscipline = (nextId: LabCategoryId) => {
    const nextExp = LAB_EXPERIMENTS.find((e) => e.id === nextId) ?? LAB_EXPERIMENTS[0];
    setActiveId(nextId);
    setP1(nextExp.param1.defaultVal);
    setP2(nextExp.param2.defaultVal);
    setP3(nextExp.param3.defaultVal);
    pendulumRef.current = { theta: 0.65, omega: 0, dragging: false };
    orbitDraggingRef.current = false;
    setInteractiveReadout(null);
  };

  const handleCopyLabLink = () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams({
      cat: activeId,
      p1: String(p1),
      p2: String(p2),
      p3: String(p3),
    });
    const shareUrl = `${window.location.origin}/laboratory?${params.toString()}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleExportLabPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = Math.max(1, canvas.width / Math.max(1, canvasSize.width));
    const footerH = Math.round(48 * scale);
    const outCanvas = document.createElement("canvas");
    outCanvas.width = canvas.width;
    outCanvas.height = canvas.height + footerH;
    const oCtx = outCanvas.getContext("2d");
    if (!oCtx) {
      const link = document.createElement("a");
      link.download = `omnis-lab-${activeId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      return;
    }
    const isLight = theme === "light";
    oCtx.fillStyle = isLight ? "#FAF8F5" : "#070B14";
    oCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    oCtx.drawImage(canvas, 0, 0);
    oCtx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.14)" : "rgba(148, 163, 184, 0.22)";
    oCtx.lineWidth = Math.max(1, Math.round(scale));
    oCtx.beginPath();
    oCtx.moveTo(0, canvas.height);
    oCtx.lineTo(outCanvas.width, canvas.height);
    oCtx.stroke();
    oCtx.fillStyle = isLight ? "#0F172A" : "#E2E8F0";
    oCtx.font = `600 ${Math.round(11 * scale)}px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace`;
    const telemetryLine = `OMNIS DIGITAL WORLD LABORATORY • ${exp.category.toUpperCase()} • ${exp.param1.label}=${p1}${exp.param1.unit} | ${exp.param2.label}=${p2}${exp.param2.unit} | ${exp.param3.label}=${p3}${exp.param3.unit}`;
    oCtx.fillText(telemetryLine, Math.round(14 * scale), canvas.height + Math.round(footerH * 0.62), outCanvas.width - Math.round(28 * scale));

    const link = document.createElement("a");
    link.download = `omnis-lab-${activeId}.png`;
    link.href = outCanvas.toDataURL("image/png");
    link.click();
  };

  // Dedicated backing-store HiDPI resize effect (prevents GPU texture thrashing during slider drags & hovers)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvasSize.width;
    const H = canvasSize.height;
    const dpr = Math.min(window.devicePixelRatio || 1, W < 640 ? 1.5 : 2);
    const targetW = Math.round(W * dpr);
    const targetH = Math.round(H * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }, [canvasSize]);

  // Real-time interactive High-DPI & Dual-Theme Canvas Solver Loop (reads parameters via ref to avoid rAF restart)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isContinuous = activeId === "physics" || activeId === "space";
    let frameId = 0;
    let lastFrameTime = performance.now();

    const render = (now: number = performance.now()) => {
      const snap = labLiveRef.current;
      const isLight = snap.theme === "light";
      const W = snap.canvasSize.width;
      const H = snap.canvasSize.height;
      const dpr = Math.min(window.devicePixelRatio || 1, W < 640 ? 1.5 : 2);

      const palette = {
        bg: isLight ? "#FAF8F5" : "#05070C",
        grid: isLight ? "rgba(15, 23, 42, 0.08)" : "rgba(148, 163, 184, 0.11)",
        ink: isLight ? "#0F172A" : "#F8FAFC",
        muted: isLight ? "#475569" : "#94A3B8",
        blue: isLight ? "#1D4ED8" : "#3B82F6",
        cyan: isLight ? "#0284C7" : "#38BDF8",
        emerald: isLight ? "#059669" : "#10B981",
        amber: isLight ? "#B45309" : "#F59E0B",
        danger: isLight ? "#DC2626" : "#EF4444",
        rod: isLight ? "#334155" : "#94A3B8",
      };

      const isAnimating =
        snap.running && !snap.motionPaused && !pendulumRef.current.dragging && !orbitDraggingRef.current;
      const { p1: curP1, p2: curP2, p3: curP3 } = snap;
      const dt = Math.min(0.033, Math.max(0.001, (now - lastFrameTime) / 1000)) * 60;
      lastFrameTime = now;
      if (isAnimating) simTimeRef.current += 0.025 * dt;
      const t = simTimeRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, W, H);

      // Clean laboratory coordinate grid
      ctx.strokeStyle = palette.grid;
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      if (snap.activeId === "physics") {
        if (isAnimating) {
          const alpha =
            -(curP1 / curP2) * Math.sin(pendulumRef.current.theta) -
            curP3 * pendulumRef.current.omega;
          pendulumRef.current.omega += alpha * (0.035 * dt);
          pendulumRef.current.theta += pendulumRef.current.omega * (0.035 * dt);
        }
        const theta = pendulumRef.current.theta;
        const pivotX = W * 0.28;
        const pivotY = 56;
        const rodPx = Math.min(200, curP2 * 52);
        const bobX = pivotX + rodPx * Math.sin(theta);
        const bobY = pivotY + rodPx * Math.cos(theta);

        // Pivot anchor
        ctx.fillStyle = palette.muted;
        ctx.fillRect(pivotX - 24, pivotY - 6, 48, 6);

        // Vertical equilibrium guide
        ctx.strokeStyle = palette.grid;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(pivotX, pivotY + rodPx + 24);
        ctx.stroke();
        ctx.setLineDash([]);

        // Rod + Interactive Bob Handle
        ctx.strokeStyle = palette.rod;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();

        ctx.strokeStyle = palette.cyan;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bobX, bobY, 22, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = palette.blue;
        ctx.beginPath();
        ctx.arc(bobX, bobY, 17, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = palette.ink;
        ctx.font = "600 13px monospace";
        ctx.fillText(
          `θ = ${((theta * 180) / Math.PI).toFixed(1)}°`,
          Math.min(W - 104, Math.max(12, bobX - 30)),
          Math.min(H - 12, bobY + 34)
        );

        // Harmonic wave trace on right side
        ctx.strokeStyle = palette.emerald;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let i = 0; i < 270; i++) {
          const wx = W * 0.52 + i;
          const wy =
            H / 2 +
            Math.sin(t * Math.sqrt(curP1 / curP2) - i * 0.04) *
              68 *
              Math.exp(-curP3 * (i / 90));
          if (i === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();

        ctx.fillStyle = palette.muted;
        ctx.font = "600 12.5px monospace";
        const waveLabelX = Math.min(W * 0.5, Math.max(16, W - 400));
        ctx.fillText("Oscillatory Phase-Wave Envelope (Drag bob to set θ)", waveLabelX, 34, W - waveLabelX - 16);
      } else if (snap.activeId === "space") {
        const cx = W / 2 + 28;
        const cy = H / 2;
        const aPx = curP3 * 95;
        const e = curP2;
        const bPx = aPx * Math.sqrt(1 - e * e);
        const cFocus = aPx * e;

        // Orbit ellipse
        ctx.strokeStyle = isLight ? "rgba(29, 78, 216, 0.6)" : "rgba(59, 130, 246, 0.65)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, aPx, bPx, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Central star at focus
        const starX = cx - cFocus;
        const starY = cy;
        ctx.fillStyle = palette.amber;
        ctx.beginPath();
        ctx.arc(starX, starY, 13 + curP1 * 4, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting planet
        const angularSpeed = Math.sqrt(curP1 / Math.pow(curP3, 3)) * 1.4;
        const angle = t * angularSpeed;
        const px = cx + aPx * Math.cos(angle);
        const py = cy + bPx * Math.sin(angle);

        ctx.strokeStyle = isLight ? "rgba(180, 83, 9, 0.45)" : "rgba(251, 191, 36, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(starX, starY);
        ctx.lineTo(px, py);
        ctx.stroke();

        ctx.fillStyle = palette.cyan;
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fill();

        const peri = (curP3 * (1 - curP2)).toFixed(2);
        const apo = (curP3 * (1 + curP2)).toFixed(2);
        ctx.fillStyle = palette.muted;
        ctx.font = "600 12.5px monospace";
        ctx.fillText(`Focus Star (${curP1.toFixed(1)} M☉)`, Math.max(16, starX - 48), starY + 36, W - 32);
        ctx.fillText(`Periapsis: ${peri} AU  |  Apoapsis: ${apo} AU  |  Drag orbit to reshape a/e`, 20, 28, W - 40);
      } else if (snap.activeId === "chemistry") {
        const cx = W / 2;
        const cy = H / 2 - 18;
        const halfRad = ((curP1 / 2) * Math.PI) / 180;
        const vib = Math.sin(t * 6) * (curP2 / 120);
        const bondLen = 115 + vib;

        const h1x = cx - bondLen * Math.sin(halfRad);
        const h1y = cy + bondLen * Math.cos(halfRad);
        const h2x = cx + bondLen * Math.sin(halfRad);
        const h2y = cy + bondLen * Math.cos(halfRad);

        ctx.strokeStyle = palette.rod;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(h1x, h1y);
        ctx.moveTo(cx, cy);
        ctx.lineTo(h2x, h2y);
        ctx.stroke();

        ctx.strokeStyle = palette.amber;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(cx, cy, 46, Math.PI / 2 - halfRad, Math.PI / 2 + halfRad);
        ctx.stroke();

        ctx.fillStyle = palette.danger;
        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = palette.blue;
        ctx.beginPath();
        ctx.arc(h1x, h1y, 17, 0, Math.PI * 2);
        ctx.arc(h2x, h2y, 17, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = palette.ink;
        ctx.font = "700 14px monospace";
        ctx.fillText(`θ = ${curP1.toFixed(1)}°`, cx - 34, cy + 74);
      } else if (snap.activeId === "biology") {
        ctx.lineWidth = 2.6;
        let prey = 40;
        let pred = 15;
        const dt = 0.04;
        const preyPts: [number, number][] = [];
        const predPts: [number, number][] = [];
        const plotTop = W < 450 ? 64 : 46;
        const plotBot = H - 28;
        const plotSpan = Math.max(80, plotBot - plotTop);

        for (let i = 0; i < 260; i++) {
          const dPrey = curP1 * prey - curP2 * 0.05 * prey * pred;
          const dPred = 0.02 * curP2 * prey * pred - curP3 * pred;
          prey = Math.max(2, Math.min(120, prey + dPrey * dt));
          pred = Math.max(2, Math.min(120, pred + dPred * dt));
          const x = 36 + (i / 260) * Math.max(120, W - 72);
          preyPts.push([x, plotBot - (prey / 120) * plotSpan]);
          predPts.push([x, plotBot - (pred / 120) * plotSpan]);
        }

        ctx.strokeStyle = palette.emerald;
        ctx.beginPath();
        preyPts.forEach(([x, y], idx) => (idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.stroke();

        ctx.strokeStyle = palette.amber;
        ctx.beginPath();
        predPts.forEach(([x, y], idx) => (idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.stroke();

        ctx.font = "600 13px monospace";
        ctx.fillStyle = palette.emerald;
        ctx.fillText("● Prey Population (x)", 24, 28);
        ctx.fillStyle = palette.amber;
        if (W < 450) {
          ctx.fillText("● Predator Population (y)", 24, 48, W - 44);
        } else {
          ctx.fillText("● Predator Population (y)", 224, 28, W - 240);
        }
      } else if (snap.activeId === "climate") {
        const forcing = 5.35 * Math.log(curP1 / 280);
        const eqTempC = 14.0 + forcing * 0.8 - (curP2 - 0.3) * 85 + (curP3 - 1361) * 0.07;

        const oceanH = Math.round(H * 0.2);
        const airTop = Math.max(66, Math.round(H * 0.36));
        ctx.fillStyle = eqTempC > 16 ? "#b45309" : "#1d4ed8";
        ctx.fillRect(0, H - oceanH, W, oceanH);

        ctx.strokeStyle = palette.amber;
        ctx.lineWidth = 3;
        const beamCount = W < 440 ? 4 : 5;
        for (let i = 0; i < beamCount; i++) {
          const sx = ((i + 0.65) / (beamCount + 0.3)) * W;
          ctx.beginPath();
          ctx.moveTo(sx, airTop);
          ctx.lineTo(Math.min(W - 18, sx + 24), H - oceanH - 10);
          ctx.stroke();
        }

        ctx.fillStyle = `rgba(220, 38, 38, ${Math.min(0.42, Math.max(0.09, (curP1 - 260) / 1400))})`;
        ctx.fillRect(0, airTop, W, H - oceanH - airTop);

        ctx.fillStyle = palette.ink;
        ctx.font = W < 440 ? "700 13px monospace" : "700 15px monospace";
        ctx.fillText(
          `Equilibrium Global Mean Temp: ${eqTempC.toFixed(2)} °C  |  ΔF = +${forcing.toFixed(2)} W/m²`,
          20,
          38,
          W - 40
        );
      } else {
        // Pratt Truss Bridge Structural Analysis with interactive bay highlighting
        const marginX = W < 440 ? 28 : 72;
        const leftX = marginX;
        const rightX = W - marginX;
        const baseY = H * 0.66;
        const depthPx = curP3 * 9;
        const deflection = (curP1 * Math.pow(curP2, 2)) / (45000 * Math.pow(curP3, 2));

        const panels = 6;
        const panelW = (rightX - leftX) / panels;
        const focusedBay = snap.hoverTrussPanel ?? snap.activeTrussPanel;

        for (let i = 0; i < panels; i++) {
          const x1 = leftX + i * panelW;
          const x2 = leftX + (i + 1) * panelW;
          const def1 = Math.sin((i / panels) * Math.PI) * deflection * 14;
          const def2 = Math.sin(((i + 1) / panels) * Math.PI) * deflection * 14;
          const isBayFocused = focusedBay === i;

          ctx.lineWidth = isBayFocused ? 5 : 3;

          if (isBayFocused) {
            ctx.fillStyle = isLight ? "rgba(2, 132, 199, 0.12)" : "rgba(56, 189, 248, 0.14)";
            ctx.fillRect(x1, baseY - depthPx - 4, panelW, depthPx + Math.max(def1, def2) + 8);
          }

          // Bottom chord (tension)
          ctx.strokeStyle = isBayFocused ? palette.cyan : palette.blue;
          ctx.beginPath();
          ctx.moveTo(x1, baseY + def1);
          ctx.lineTo(x2, baseY + def2);
          ctx.stroke();

          // Top chord (compression)
          ctx.strokeStyle = isBayFocused ? palette.cyan : palette.amber;
          ctx.beginPath();
          ctx.moveTo(x1, baseY - depthPx + def1);
          ctx.lineTo(x2, baseY - depthPx + def2);
          ctx.stroke();

          // Verticals & diagonals
          ctx.strokeStyle = isBayFocused ? palette.cyan : palette.rod;
          ctx.beginPath();
          ctx.moveTo(x1, baseY + def1);
          ctx.lineTo(x1, baseY - depthPx + def1);
          ctx.moveTo(x1, baseY - depthPx + def1);
          ctx.lineTo(x2, baseY + def2);
          ctx.stroke();
        }

        ctx.font = "600 12.5px monospace";
        const legendX = W < 580 ? 24 : 72;
        ctx.fillStyle = palette.blue;
        ctx.fillText("━ Bottom Chord (Tension)", legendX, 32);
        ctx.fillStyle = palette.amber;
        if (W < 580) {
          ctx.fillText("━ Top Chord (Compression) • Click bay to inspect strut force", legendX, 50, W - 48);
        } else {
          ctx.fillText("━ Top Chord (Compression) • Click bay to inspect strut force", 272, 32, W - 290);
        }
      }

      if (isAnimating && isContinuous) {
        frameId = requestAnimationFrame(render);
      }
    };

    if (isContinuous && running && !motionPaused && !pendulumRef.current.dragging && !orbitDraggingRef.current) {
      frameId = requestAnimationFrame(render);
    } else {
      render();
    }
    return () => cancelAnimationFrame(frameId);
  }, [activeId, running, motionPaused, canvasSize, manualDrawTick]);

  // Trigger a lightweight single canvas paint (without resizing bitmap) when parameters update in paused or discrete states
  useEffect(() => {
    const isContinuous = activeId === "physics" || activeId === "space";
    if (!isContinuous || !running || motionPaused) {
      setManualDrawTick((k) => k + 1);
    }
  }, [activeId, running, motionPaused, p1, p2, p3, theme, activeTrussPanel, hoverTrussPanel]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (activeId === "physics") {
      const pivotX = canvasSize.width * 0.28;
      const pivotY = 56;
      if (cx < canvasSize.width * 0.55) {
        pendulumRef.current.dragging = true;
        const theta = Math.max(-1.42, Math.min(1.42, Math.atan2(cx - pivotX, Math.max(12, cy - pivotY))));
        pendulumRef.current.theta = theta;
        pendulumRef.current.omega = 0;
        setInteractiveReadout(`Pendulum Bob Angle θ = ${((theta * 180) / Math.PI).toFixed(1)}° (Released from rest)`);
        setManualDrawTick((k) => k + 1);
      }
    } else if (activeId === "space") {
      orbitDraggingRef.current = true;
      const centerX = canvasSize.width / 2 + 28;
      const centerY = canvasSize.height / 2;
      const dist = Math.hypot(cx - centerX, cy - centerY);
      const nextA = Math.max(0.6, Math.min(2.2, Number((dist / 95).toFixed(1))));
      const nextE = Math.max(
        0.0,
        Math.min(0.75, Number((Math.abs(cx - centerX) / Math.max(90, dist) * 0.65).toFixed(2)))
      );
      setP3(nextA);
      setP2(nextE);
      setInteractiveReadout(
        `Adjusted Orbit: a = ${nextA.toFixed(1)} AU, e = ${nextE.toFixed(2)} (Peri ${(nextA * (1 - nextE)).toFixed(2)} AU / Apo ${(nextA * (1 + nextE)).toFixed(2)} AU)`
      );
    } else if (activeId === "engineering") {
      const marginX = canvasSize.width < 440 ? 28 : 72;
      const leftX = marginX;
      const rightX = canvasSize.width - marginX;
      const panelW = (rightX - leftX) / 6;
      const bayIdx = Math.max(0, Math.min(5, Math.floor((cx - leftX) / Math.max(1, panelW))));
      setActiveTrussPanel(bayIdx);
      const momentFactor = Math.sin(((bayIdx + 0.5) / 6) * Math.PI);
      const axialForceKn = ((p1 * (p2 / 4) * momentFactor) / Math.max(1, p3)).toFixed(1);
      const localSf = Math.max(0.8, (350 * p3) / (p1 * 1.4 * Math.max(0.55, momentFactor))).toFixed(2);
      setInteractiveReadout(
        `Truss Bay #${bayIdx + 1}: Axial Load ${axialForceKn} kN (Bottom Chord TENSION / Top COMPRESSION) • Local SF ${localSf}x`
      );
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (activeId === "physics" && pendulumRef.current.dragging) {
      const pivotX = canvasSize.width * 0.28;
      const pivotY = 56;
      const theta = Math.max(-1.42, Math.min(1.42, Math.atan2(cx - pivotX, Math.max(12, cy - pivotY))));
      pendulumRef.current.theta = theta;
      pendulumRef.current.omega = 0;
      setInteractiveReadout(`Dragging Pendulum θ = ${((theta * 180) / Math.PI).toFixed(1)}°`);
      setManualDrawTick((k) => k + 1);
    } else if (activeId === "space" && orbitDraggingRef.current) {
      const centerX = canvasSize.width / 2 + 28;
      const centerY = canvasSize.height / 2;
      const dist = Math.hypot(cx - centerX, cy - centerY);
      const nextA = Math.max(0.6, Math.min(2.2, Number((dist / 95).toFixed(1))));
      setP3(nextA);
      setInteractiveReadout(
        `Orbital Semi-Major Axis a = ${nextA.toFixed(1)} AU (Peri ${(nextA * (1 - p2)).toFixed(2)} AU)`
      );
    } else if (activeId === "engineering") {
      const marginX = canvasSize.width < 440 ? 28 : 72;
      const leftX = marginX;
      const rightX = canvasSize.width - marginX;
      if (cx >= leftX && cx <= rightX) {
        const panelW = (rightX - leftX) / 6;
        const bayIdx = Math.max(0, Math.min(5, Math.floor((cx - leftX) / Math.max(1, panelW))));
        if (hoverTrussPanel !== bayIdx) setHoverTrussPanel(bayIdx);
      } else if (hoverTrussPanel !== null) {
        setHoverTrussPanel(null);
      }
    }
  };

  const handleCanvasPointerUp = () => {
    if (pendulumRef.current.dragging) {
      pendulumRef.current.dragging = false;
      setManualDrawTick((k) => k + 1);
    }
    if (orbitDraggingRef.current) {
      orbitDraggingRef.current = false;
      setManualDrawTick((k) => k + 1);
    }
  };

  const handleSaveLab = () => {
    addWorkspaceItem({
      type: "lab",
      title: `Laboratory: ${exp.title}`,
      subtitle: `${exp.category} • Params: [${p1}, ${p2}, ${p3}]`,
      folder: "Scenario Simulations",
      tags: ["Digital Lab", exp.category],
      href: `/laboratory?cat=${encodeURIComponent(exp.id)}&p1=${p1}&p2=${p2}&p3=${p3}`,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const observationText =
    activeId === "physics"
      ? `Natural Period T = ${(2 * Math.PI * Math.sqrt(p2 / p1)).toFixed(2)} s | ω₀ = ${Math.sqrt(p1 / p2).toFixed(2)} rad/s`
      : activeId === "space"
      ? `Orbital Period T = ${Math.sqrt(Math.pow(p3, 3) / p1).toFixed(2)} yr | Perihelion = ${(p3 * (1 - p2)).toFixed(2)} AU | Aphelion = ${(p3 * (1 + p2)).toFixed(2)} AU`
      : activeId === "chemistry"
      ? `Bond Angle = ${p1}° | Dipole Index = ${(p3 * Math.cos(((p1 / 2) * Math.PI) / 180) * 2.4).toFixed(2)} Debye`
      : activeId === "biology"
      ? `Equilibrium Prey x* = ${(p3 / (0.02 * p2)).toFixed(1)} | Predator y* = ${(p1 / (0.05 * p2)).toFixed(1)}`
      : activeId === "climate"
      ? `ΔF = +${(5.35 * Math.log(p1 / 280)).toFixed(2)} W/m² | Eq. Temp = ${(14.0 + 5.35 * Math.log(p1 / 280) * 0.8 - (p2 - 0.3) * 85 + (p3 - 1361) * 0.07).toFixed(2)} °C`
      : `Mid-Span Deflection δ = ${((p1 * Math.pow(p2, 2)) / (45000 * Math.pow(p3, 2))).toFixed(2)} cm | Safety Factor = ${Math.max(0.8, (350 * p3) / (p1 * 1.4)).toFixed(2)}x`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & 6 Discipline Switcher */}
      <OmnisModuleHeader
        moduleTag="MODULE 06 • DIGITAL WORLD SCIENTIFIC & ENGINEERING LABORATORY"
        title={exp.title}
        subtitle={exp.objective}
        icon={<FlaskConical className="w-3.5 h-3.5" />}
        actions={
          <>
            <OmnisButton variant="secondary" onClick={handleCopyLabLink}>
              {copiedLink ? <Check className="w-3.5 h-3.5 tone-verified" /> : <Share2 className="w-3.5 h-3.5 tone-blue" />}
              <span>{copiedLink ? "Link Copied" : "Copy Link"}</span>
            </OmnisButton>
            <OmnisButton variant="secondary" onClick={handleExportLabPng}>
              <Download className="w-3.5 h-3.5 tone-cyan" />
              <span>Export PNG</span>
            </OmnisButton>
            <OmnisButton onClick={handleSaveLab}>
              {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{savedNotice ? "Experiment Saved" : "Save Experiment"}</span>
            </OmnisButton>
          </>
        }
      >
        <div className="pt-1 overflow-x-auto max-w-full">
          <OmnisSegmentedControl
            groupId="lab-discipline-tabs"
            ariaLabel="Digital World Laboratory Discipline"
            size="sm"
            value={activeId}
            onChange={(val) => handleSelectDiscipline(val as LabCategoryId)}
            options={LAB_EXPERIMENTS.map((item) => ({
              value: item.id,
              label: item.category,
            }))}
          />
        </div>
      </OmnisModuleHeader>

      {/* Interactive Simulator + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls & Governing Equations */}
        <div className="lg:col-span-4 min-w-0 omnis-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
              Experimental Parameters
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRunning((r) => !r)}
                className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[var(--text-primary)] cursor-pointer"
                title={running ? "Pause Simulation" : "Resume Simulation"}
                aria-label={running ? "Pause Simulation" : "Resume Simulation"}
              >
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setP1(exp.param1.defaultVal);
                  setP2(exp.param2.defaultVal);
                  setP3(exp.param3.defaultVal);
                }}
                className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[var(--text-primary)] cursor-pointer"
                title="Reset Parameters"
                aria-label="Reset Parameters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {[
            { spec: exp.param1, val: p1, setVal: setP1 },
            { spec: exp.param2, val: p2, setVal: setP2 },
            { spec: exp.param3, val: p3, setVal: setP3 },
          ].map(({ spec, val, setVal }) => (
            <OmnisParameterSlider
              key={spec.label}
              label={spec.label}
              unit={spec.unit}
              min={spec.min}
              max={spec.max}
              step={spec.step}
              baselineValue={spec.defaultVal}
              value={val}
              accent="blue"
              onChange={setVal}
              onReset={() => setVal(spec.defaultVal)}
            />
          ))}

          <OmnisMathBlock
            label="Governing Mathematical Equations"
            latex={LAB_EQUATIONS_LATEX[exp.id] ?? exp.equations}
          />

          <div className="p-3.5 rounded-xl badge-tone-warning text-[12.5px] sm:text-[13px] flex items-start gap-2.5 leading-relaxed">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{exp.modelDisclosure}</span>
          </div>
        </div>

        {/* Right Live Visualisation Canvas & Learning Context */}
        <div className="lg:col-span-8 min-w-0 space-y-6">
          <div className="omnis-card p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] sm:text-[13px]">
              <span className="font-bold tone-blue uppercase tracking-wider omnis-mono">
                Live Mathematical Simulation Canvas
              </span>
              <span className="omnis-mono tone-verified font-semibold">{observationText}</span>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden relative">
              <canvas
                ref={canvasRef}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
                onPointerLeave={handleCanvasPointerUp}
                className="w-full h-72 block touch-none cursor-crosshair"
              />
              {motionPaused ? (
                <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md omnis-hud-pill text-xs omnis-mono font-semibold tone-warning">
                  Motion Paused
                </span>
              ) : null}
            </div>

            {interactiveReadout ? (
              <div className="px-3.5 py-2.5 rounded-lg badge-tone-cyan text-[13px] omnis-mono font-semibold">
                {interactiveReadout}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="omnis-card p-5 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider tone-blue omnis-mono">
                Experimental Objective
              </div>
              <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">{exp.objective}</p>
            </div>
            <div className="omnis-card p-5 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider tone-verified omnis-mono">
                Scientific Background & Physical Interpretation
              </div>
              <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">{exp.background}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LaboratoryPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto">
          <OmnisLoader label="Initialising Digital World Scientific Laboratory..." />
        </div>
      }
    >
      <LaboratoryContent />
    </Suspense>
  );
}
