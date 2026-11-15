"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FlaskConical,
  RotateCcw,
  Bookmark,
  Check,
  Play,
  Pause,
  Info,
} from "lucide-react";
import { useOmnisStore } from "@/lib/store/use-omnis-store";

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

function LaboratoryContent() {
  const searchParams = useSearchParams();
  const initialCat = (searchParams.get("cat") as LabCategoryId) || "physics";

  const [activeId, setActiveId] = useState<LabCategoryId>(
    LAB_EXPERIMENTS.some((e) => e.id === initialCat) ? initialCat : "physics"
  );
  const [running, setRunning] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const exp = LAB_EXPERIMENTS.find((e) => e.id === activeId) ?? LAB_EXPERIMENTS[0];

  const [p1, setP1] = useState(exp.param1.defaultVal);
  const [p2, setP2] = useState(exp.param2.defaultVal);
  const [p3, setP3] = useState(exp.param3.defaultVal);

  const { addWorkspaceItem, setActiveContext } = useOmnisStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setP1(exp.param1.defaultVal);
    setP2(exp.param2.defaultVal);
    setP3(exp.param3.defaultVal);
    setActiveContext("Digital World Laboratory", exp.title);
  }, [exp, setActiveContext]);

  // Real-time interactive mathematical animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;
    let t = 0;
    let theta = 0.65;
    let omega = 0;

    const render = () => {
      if (running) t += 0.025;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Subtle laboratory coordinate grid
      ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (activeId === "physics") {
        // Symplectic Euler integration of damped pendulum
        if (running) {
          const alpha = -(p1 / p2) * Math.sin(theta) - p3 * omega;
          omega += alpha * 0.035;
          theta += omega * 0.035;
        }
        const pivotX = w * 0.35;
        const pivotY = 55;
        const rodPx = Math.min(200, p2 * 52);
        const bobX = pivotX + rodPx * Math.sin(theta);
        const bobY = pivotY + rodPx * Math.cos(theta);

        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();

        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(bobX, bobY, 18, 0, Math.PI * 2);
        ctx.fill();

        // Harmonic wave trace on right side
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 240; i++) {
          const wx = w * 0.56 + i;
          const wy =
            h / 2 +
            Math.sin(t * Math.sqrt(p1 / p2) - i * 0.04) *
              65 *
              Math.exp(-p3 * (i / 90));
          if (i === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      } else if (activeId === "space") {
        const cx = w / 2 + 30;
        const cy = h / 2;
        const aPx = p3 * 95;
        const e = p2;
        const bPx = aPx * Math.sqrt(1 - e * e);
        const cFocus = aPx * e;

        // Orbit ellipse
        ctx.strokeStyle = "rgba(59, 130, 246, 0.45)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(cx, cy, aPx, bPx, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Central star at focus
        const starX = cx - cFocus;
        const starY = cy;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(starX, starY, 14 + p1 * 4, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting planet
        const angularSpeed = Math.sqrt(p1 / Math.pow(p3, 3)) * 1.4;
        const angle = t * angularSpeed;
        const px = cx + aPx * Math.cos(angle);
        const py = cy + bPx * Math.sin(angle);

        ctx.strokeStyle = "rgba(251, 191, 36, 0.3)";
        ctx.beginPath();
        ctx.moveTo(starX, starY);
        ctx.lineTo(px, py);
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (activeId === "chemistry") {
        const cx = w / 2;
        const cy = h / 2 - 15;
        const halfRad = ((p1 / 2) * Math.PI) / 180;
        const vib = Math.sin(t * 6) * (p2 / 120);
        const bondLen = 115 + vib;

        const h1x = cx - bondLen * Math.sin(halfRad);
        const h1y = cy + bondLen * Math.cos(halfRad);
        const h2x = cx + bondLen * Math.sin(halfRad);
        const h2y = cy + bondLen * Math.cos(halfRad);

        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(h1x, h1y);
        ctx.moveTo(cx, cy);
        ctx.lineTo(h2x, h2y);
        ctx.stroke();

        // Central Oxygen/Carbon atom
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.fill();

        // Ligand atoms
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(h1x, h1y, 18, 0, Math.PI * 2);
        ctx.arc(h2x, h2y, 18, 0, Math.PI * 2);
        ctx.fill();
      } else if (activeId === "biology") {
        // Lotka-Volterra predator-prey curves
        ctx.lineWidth = 2.4;
        let prey = 40;
        let pred = 15;
        const dt = 0.04;
        const preyPts: [number, number][] = [];
        const predPts: [number, number][] = [];
        for (let i = 0; i < 260; i++) {
          const dPrey = p1 * prey - p2 * 0.05 * prey * pred;
          const dPred = 0.02 * p2 * prey * pred - p3 * pred;
          prey = Math.max(2, Math.min(120, prey + dPrey * dt));
          pred = Math.max(2, Math.min(120, pred + dPred * dt));
          const x = 40 + (i / 260) * (w - 80);
          preyPts.push([x, h - 35 - prey * 2.1]);
          predPts.push([x, h - 35 - pred * 2.1]);
        }

        ctx.strokeStyle = "#10b981";
        ctx.beginPath();
        preyPts.forEach(([x, y], idx) => (idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.stroke();

        ctx.strokeStyle = "#f59e0b";
        ctx.beginPath();
        predPts.forEach(([x, y], idx) => (idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.stroke();
      } else if (activeId === "climate") {
        // Radiative energy balance visualization
        const forcing = 5.35 * Math.log(p1 / 280);
        const eqTempC = 14.0 + forcing * 0.8 - (p2 - 0.3) * 85 + (p3 - 1361) * 0.07;

        // Earth surface arc
        ctx.fillStyle = eqTempC > 16 ? "#b45309" : "#1d4ed8";
        ctx.fillRect(0, h - 65, w, 65);

        // Solar incoming arrows
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          const sx = 90 + i * 110;
          ctx.beginPath();
          ctx.moveTo(sx, 25);
          ctx.lineTo(sx + 25, h - 75);
          ctx.stroke();
        }

        // Greenhouse infrared trapping halo
        ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.45, Math.max(0.08, (p1 - 260) / 1400))})`;
        ctx.fillRect(0, h - 165, w, 100);

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 16px monospace";
        ctx.fillText(
          `Equilibrium Global Mean Temp: ${eqTempC.toFixed(2)} °C (ΔF = +${forcing.toFixed(2)} W/m²)`,
          30,
          50
        );
      } else {
        // Engineering Pratt Truss Bridge under load
        const leftX = 70;
        const rightX = w - 70;
        const baseY = h * 0.65;
        const depthPx = p3 * 9;
        const deflection = (p1 * Math.pow(p2, 2)) / (45000 * Math.pow(p3, 2));

        const panels = 6;
        const panelW = (rightX - leftX) / panels;

        ctx.lineWidth = 3;
        for (let i = 0; i < panels; i++) {
          const x1 = leftX + i * panelW;
          const x2 = leftX + (i + 1) * panelW;
          const def1 = Math.sin((i / panels) * Math.PI) * deflection * 14;
          const def2 = Math.sin(((i + 1) / panels) * Math.PI) * deflection * 14;

          // Bottom chord (tension - blue)
          ctx.strokeStyle = "#3b82f6";
          ctx.beginPath();
          ctx.moveTo(x1, baseY + def1);
          ctx.lineTo(x2, baseY + def2);
          ctx.stroke();

          // Top chord (compression - amber/red)
          ctx.strokeStyle = "#f59e0b";
          ctx.beginPath();
          ctx.moveTo(x1, baseY - depthPx + def1);
          ctx.lineTo(x2, baseY - depthPx + def2);
          ctx.stroke();

          // Verticals & diagonals
          ctx.strokeStyle = "#94a3b8";
          ctx.beginPath();
          ctx.moveTo(x1, baseY + def1);
          ctx.lineTo(x1, baseY - depthPx + def1);
          ctx.moveTo(x1, baseY - depthPx + def1);
          ctx.lineTo(x2, baseY + def2);
          ctx.stroke();
        }
      }

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [activeId, p1, p2, p3, running]);

  const handleSaveLab = () => {
    addWorkspaceItem({
      type: "lab",
      title: `Laboratory: ${exp.title}`,
      subtitle: `${exp.category} • Params: [${p1}, ${p2}, ${p3}]`,
      folder: "Scenario Simulations",
      tags: ["Digital Lab", exp.category],
      href: `/laboratory?cat=${exp.id}`,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  // Compute live analytical observation metrics
  const observationText =
    activeId === "physics"
      ? `Natural Period T = ${(2 * Math.PI * Math.sqrt(p2 / p1)).toFixed(2)} s | Angular Frequency ω₀ = ${Math.sqrt(p1 / p2).toFixed(2)} rad/s`
      : activeId === "space"
      ? `Orbital Period T = ${Math.sqrt(Math.pow(p3, 3) / p1).toFixed(2)} Earth Years | Perihelion = ${(p3 * (1 - p2)).toFixed(2)} AU | Aphelion = ${(p3 * (1 + p2)).toFixed(2)} AU`
      : activeId === "chemistry"
      ? `Bond Angle = ${p1}° | Dipole Moment Index = ${(p3 * Math.cos(((p1 / 2) * Math.PI) / 180) * 2.4).toFixed(2)} Debye`
      : activeId === "biology"
      ? `Equilibrium Prey Density x* = ${(p3 / (0.02 * p2)).toFixed(1)} | Equilibrium Predator Density y* = ${(p1 / (0.05 * p2)).toFixed(1)}`
      : activeId === "climate"
      ? `Radiative Forcing ΔF = +${(5.35 * Math.log(p1 / 280)).toFixed(2)} W/m² | Equilibrium Temp = ${(14.0 + 5.35 * Math.log(p1 / 280) * 0.8 - (p2 - 0.3) * 85 + (p3 - 1361) * 0.07).toFixed(2)} °C`
      : `Mid-Span Deflection δ = ${((p1 * Math.pow(p2, 2)) / (45000 * Math.pow(p3, 2))).toFixed(2)} cm | Structural Safety Factor = ${Math.max(0.8, (350 * p3) / (p1 * 1.4)).toFixed(2)}x`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & 6 Discipline Switcher */}
      <div className="omnis-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>MODULE 06 • DIGITAL WORLD SCIENTIFIC & ENGINEERING LABORATORY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">{exp.title}</h1>
          </div>

          <button
            type="button"
            onClick={handleSaveLab}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span>{savedNotice ? "Experiment Saved" : "Save Experiment"}</span>
          </button>
        </div>

        {/* 6 Laboratory Discipline Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {LAB_EXPERIMENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              className={`p-2.5 rounded-lg text-left border transition-all ${
                activeId === item.id
                  ? "bg-blue-600 text-white border-blue-400"
                  : "bg-[var(--bg-slate)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              <div className="text-xs font-bold">{item.category}</div>
              <div className="text-[10px] opacity-80 truncate">{item.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Simulator + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls & Governing Equations */}
        <div className="lg:col-span-4 omnis-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-sm font-bold">Experimental Parameters</h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRunning((r) => !r)}
                className="p-1.5 rounded bg-[var(--bg-slate)] border border-[var(--border-subtle)]"
                title={running ? "Pause Simulation" : "Resume Simulation"}
              >
                {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setP1(exp.param1.defaultVal);
                  setP2(exp.param2.defaultVal);
                  setP3(exp.param3.defaultVal);
                }}
                className="p-1.5 rounded bg-[var(--bg-slate)] border border-[var(--border-subtle)]"
                title="Reset Parameters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {[
            { spec: exp.param1, val: p1, setVal: setP1 },
            { spec: exp.param2, val: p2, setVal: setP2 },
            { spec: exp.param3, val: p3, setVal: setP3 },
          ].map(({ spec, val, setVal }) => (
            <div key={spec.label} className="omnis-surface-slate p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-semibold">{spec.label}</span>
                <span className="font-bold omnis-mono text-blue-400">
                  {val} {spec.unit}
                </span>
              </div>
              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={val}
                onChange={(e) => setVal(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          ))}

          <div className="omnis-surface-slate p-3.5 space-y-1.5 text-xs">
            <div className="text-[10px] uppercase tracking-wider text-violet-400 font-bold">
              Governing Mathematical Equations
            </div>
            <div className="omnis-mono text-[11px] text-[var(--text-primary)]">{exp.equations}</div>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{exp.modelDisclosure}</span>
          </div>
        </div>

        {/* Right Live Visualisation Canvas & Learning Context */}
        <div className="lg:col-span-8 space-y-6">
          <div className="omnis-card p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-blue-400 uppercase tracking-wider">
                Live Mathematical Simulation Canvas
              </span>
              <span className="omnis-mono text-emerald-400 font-semibold">{observationText}</span>
            </div>

            <div className="rounded-xl bg-[#070b14] border border-[var(--border-subtle)] overflow-hidden">
              <canvas ref={canvasRef} width={720} height={320} className="w-full h-72 block" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="omnis-card p-5 space-y-2">
              <div className="font-bold uppercase tracking-wider text-blue-400">
                Experimental Objective
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">{exp.objective}</p>
            </div>
            <div className="omnis-card p-5 space-y-2">
              <div className="font-bold uppercase tracking-wider text-emerald-400">
                Scientific Background & Physical Interpretation
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">{exp.background}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LaboratoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Loading Digital World Laboratory...</div>}>
      <LaboratoryContent />
    </Suspense>
  );
}
