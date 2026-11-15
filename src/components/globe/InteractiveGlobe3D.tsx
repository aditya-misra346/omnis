"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCcw, Sun, ZoomIn, ZoomOut, Layers, Play, Pause } from "lucide-react";
import type { CountryIntelligenceProfile, IntelligenceLayerId } from "@/types/omnis";

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export function getLayerMetricForCountry(
  country: CountryIntelligenceProfile,
  layer: IntelligenceLayerId
): { label: string; value: string; numericWeight: number; colorHex: number } {
  switch (layer) {
    case "economics":
      return {
        label: "Nominal GDP",
        value: `$${country.gdpUsdBn.toLocaleString()}B (${country.gdpGrowthPct >= 0 ? "+" : ""}${country.gdpGrowthPct}%)`,
        numericWeight: Math.min(1.8, Math.max(0.6, Math.log10(country.gdpUsdBn) / 2.5)),
        colorHex: 0x3b82f6,
      };
    case "demographics":
      return {
        label: "Population",
        value: `${(country.population / 1e6).toFixed(1)}M • Life Exp ${country.lifeExpectancyYears}y`,
        numericWeight: Math.min(1.8, Math.max(0.6, country.population / 5e8)),
        colorHex: 0x8b5cf6,
      };
    case "energy":
      return {
        label: "Renewable Grid Share",
        value: `${country.energyProfile.renewableSharePct}% Clean • ${country.energyProfile.electricityGenerationTwh} TWh`,
        numericWeight: Math.min(1.8, Math.max(0.6, country.energyProfile.renewableSharePct / 40)),
        colorHex: 0x10b981,
      };
    case "environment":
      return {
        label: "Temp Anomaly & CO2",
        value: `+${country.environmentProfile.tempAnomalyC}°C • ${country.environmentProfile.co2PerCapitaTons}t/cap`,
        numericWeight: Math.min(1.8, Math.max(0.6, country.environmentProfile.tempAnomalyC)),
        colorHex: 0xf59e0b,
      };
    case "technology":
      return {
        label: "AI & R&D Readiness",
        value: `AI Index ${country.technologyProfile.aiReadinessIndex} • R&D ${country.technologyProfile.rdSpendPctGdp}% GDP`,
        numericWeight: Math.min(1.8, Math.max(0.6, country.technologyProfile.aiReadinessIndex / 65)),
        colorHex: 0x06b6d4,
      };
    case "international":
      return {
        label: "Multilateral Alliances",
        value: `${country.internationalRelations.treatyMemberships.slice(0, 4).join(", ")}`,
        numericWeight: 1.15,
        colorHex: 0xec4899,
      };
    default:
      return {
        label: "Geographic Area",
        value: `${(country.areaSqKm / 1000).toFixed(0)}k km² • Capital: ${country.capital}`,
        numericWeight: 1.0,
        colorHex: 0x60a5fa,
      };
  }
}

export function InteractiveGlobe3D({
  countries,
  selectedIso3,
  onSelectCountry,
  activeLayer,
  heightClass = "h-[480px]",
}: {
  countries: CountryIntelligenceProfile[];
  selectedIso3: string;
  onSelectCountry: (iso3: string) => void;
  activeLayer: IntelligenceLayerId;
  heightClass?: string;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [dayLightAngle, setDayLightAngle] = useState(35);
  const [zoomDistance, setZoomDistance] = useState(2.75);
  const [webglSupported, setWebglSupported] = useState(true);

  const rotationRef = useRef({ x: 0.28, y: -1.25 });
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const autoRotateRef = useRef(autoRotate);
  const zoomRef = useRef(zoomDistance);
  const lightAngleRef = useRef(dayLightAngle);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    zoomRef.current = zoomDistance;
  }, [zoomDistance]);

  useEffect(() => {
    lightAngleRef.current = dayLightAngle;
  }, [dayLightAngle]);

  // Center globe rotation toward selected country when changed
  useEffect(() => {
    const target = countries.find((c) => c.iso3 === selectedIso3);
    if (target) {
      rotationRef.current = {
        x: Math.max(-0.8, Math.min(0.8, (target.lat * Math.PI) / 180 * 0.6)),
        y: -((target.lng + 90) * Math.PI) / 180,
      };
    }
  }, [selectedIso3, countries]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 480;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, zoomRef.current);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Procedural high-contrast Earth texture generated on an offscreen canvas
    const texCanvas = document.createElement("canvas");
    texCanvas.width = 1024;
    texCanvas.height = 512;
    const ctx = texCanvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, "#081226");
      grad.addColorStop(0.5, "#0b1d3a");
      grad.addColorStop(1, "#071020");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // Graticule lines
      ctx.strokeStyle = "rgba(59, 130, 246, 0.18)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= 1024; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }
      for (let y = 0; y <= 512; y += 42) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
      }

      // Stylized continental landmasses approximations for visual orientation
      ctx.fillStyle = "rgba(30, 64, 124, 0.72)";
      ctx.strokeStyle = "rgba(96, 165, 250, 0.55)";
      ctx.lineWidth = 1.5;
      const blobs = [
        // North America
        [160, 110, 150, 105],
        // South America
        [275, 275, 75, 130],
        // Europe
        [490, 95, 95, 70],
        // Africa
        [495, 195, 110, 145],
        // Asia & India
        [620, 105, 230, 135],
        [695, 210, 45, 55],
        // Australia
        [790, 320, 90, 65],
      ];
      for (const [bx, by, bw, bh] of blobs) {
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 24);
        ctx.fill();
        ctx.stroke();
      }
    }

    const earthTexture = new THREE.CanvasTexture(texCanvas);
    const sphereGeo = new THREE.SphereGeometry(1, 64, 64);
    const sphereMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.65,
      metalness: 0.15,
    });
    const earthMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(earthMesh);

    // Wireframe geodesic overlay
    const wireGeo = new THREE.SphereGeometry(1.003, 32, 24);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    globeGroup.add(wireMesh);

    // Atmospheric outer halo
    const atmosGeo = new THREE.SphereGeometry(1.065, 48, 48);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.11,
      side: THREE.BackSide,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);

    // Country markers & intelligence pillars
    const markersGroup = new THREE.Group();
    globeGroup.add(markersGroup);

    for (const c of countries) {
      const layerMeta = getLayerMetricForCountry(c, activeLayer);
      const isSelected = c.iso3 === selectedIso3;
      const surfacePos = latLngToVector3(c.lat, c.lng, 1.015);

      const markerGeo = new THREE.SphereGeometry(
        isSelected ? 0.032 : 0.021 * layerMeta.numericWeight,
        16,
        16
      );
      const markerMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x38bdf8 : layerMeta.colorHex,
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(surfacePos);
      marker.userData = { iso3: c.iso3 };
      markersGroup.add(marker);

      // Radial pulse ring
      const ringGeo = new THREE.RingGeometry(0.028, isSelected ? 0.056 : 0.04, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x60a5fa : layerMeta.colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isSelected ? 0.9 : 0.55,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(surfacePos);
      ring.lookAt(surfacePos.clone().multiplyScalar(2));
      markersGroup.add(ring);
    }

    // Trade & diplomatic arcs between selected country and partners
    const selectedCountry = countries.find((c) => c.iso3 === selectedIso3);
    if (selectedCountry) {
      const startVec = latLngToVector3(selectedCountry.lat, selectedCountry.lng, 1.02);
      for (const other of countries) {
        if (other.iso3 === selectedCountry.iso3) continue;
        const endVec = latLngToVector3(other.lat, other.lng, 1.02);
        const midVec = startVec.clone().add(endVec).multiplyScalar(0.5).normalize().multiplyScalar(1.26);
        const curve = new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);
        const points = curve.getPoints(32);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x3b82f6,
          transparent: true,
          opacity: 0.35,
        });
        const arcLine = new THREE.Line(lineGeo, lineMat);
        globeGroup.add(arcLine);
      }
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.55);
    scene.add(sunLight);

    let animFrameId = 0;
    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      if (autoRotateRef.current && !isDraggingRef.current) {
        rotationRef.current.y += 0.0022;
      }
      globeGroup.rotation.x = rotationRef.current.x;
      globeGroup.rotation.y = rotationRef.current.y;
      camera.position.z = zoomRef.current;

      const rad = (lightAngleRef.current * Math.PI) / 180;
      sunLight.position.set(Math.cos(rad) * 5, 1.8, Math.sin(rad) * 5);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 720;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Pointer interaction for dragging & raycasting country selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      rotationRef.current.y += dx * 0.005;
      rotationRef.current.x = Math.max(
        -1.1,
        Math.min(1.1, rotationRef.current.x + dy * 0.005)
      );
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved =
        Math.hypot(
          e.clientX - prevMouseRef.current.x,
          e.clientY - prevMouseRef.current.y
        ) > 5;
      isDraggingRef.current = false;

      if (!moved) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(markersGroup.children);
        const hitWithIso = hits.find((h) => h.object.userData?.iso3);
        if (hitWithIso?.object.userData?.iso3) {
          onSelectCountry(hitWithIso.object.userData.iso3);
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", handleResize);
      domElem.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      sphereGeo.dispose();
      sphereMat.dispose();
      earthTexture.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      renderer.dispose();
    };
  }, [countries, selectedIso3, activeLayer, onSelectCountry]);

  return (
    <div className={`relative w-full ${heightClass} omnis-card overflow-hidden select-none`}>
      {/* 3D WebGL Canvas Mount */}
      {webglSupported ? (
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          aria-label="Interactive 3D Global Intelligence Globe"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-6 text-center text-sm text-[var(--text-secondary)]">
          Interactive Geodesic Projection Active — Select any country node below.
        </div>
      )}

      {/* Top-Left Layer Telemetry Overlay */}
      <div className="absolute top-3.5 left-3.5 pointer-events-none space-y-1 bg-[var(--bg-obsidian)]/80 backdrop-blur-md px-3 py-2 rounded-lg border border-[var(--border-subtle)]">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-400">
          <Layers className="w-3.5 h-3.5" />
          Active Layer: {activeLayer}
        </div>
        <div className="text-[11px] text-[var(--text-secondary)]">
          Drag to rotate • Click markers or country pills to inspect
        </div>
      </div>

      {/* Top-Right Camera & Day/Night Controls */}
      <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 bg-[var(--bg-obsidian)]/85 backdrop-blur-md p-1.5 rounded-lg border border-[var(--border-subtle)] text-xs">
        <button
          type="button"
          onClick={() => setAutoRotate((prev) => !prev)}
          title={autoRotate ? "Pause Orbital Rotation" : "Resume Orbital Rotation"}
          className="p-1.5 rounded hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setZoomDistance((z) => Math.max(1.85, Number((z - 0.25).toFixed(2))))}
          title="Zoom In"
          className="p-1.5 rounded hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setZoomDistance((z) => Math.min(3.8, Number((z + 0.25).toFixed(2))))}
          title="Zoom Out"
          className="p-1.5 rounded hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setDayLightAngle((a) => (a + 45) % 360)}
          title="Cycle Solar Terminator (Day/Night Illumination)"
          className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline text-[11px] omnis-mono">{dayLightAngle}°</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setZoomDistance(2.75);
            rotationRef.current = { x: 0.28, y: -1.25 };
          }}
          title="Reset Globe View"
          className="p-1.5 rounded hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Interactive Country Coordinate Selector Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 overflow-x-auto py-1.5 px-2 rounded-lg bg-[var(--bg-obsidian)]/85 backdrop-blur-md border border-[var(--border-subtle)]">
        {countries.map((c) => {
          const active = c.iso3 === selectedIso3;
          const layerInfo = getLayerMetricForCountry(c, activeLayer);
          return (
            <button
              key={c.iso3}
              type="button"
              onClick={() => onSelectCountry(c.iso3)}
              className={`shrink-0 px-2.5 py-1.5 rounded-md text-xs transition-all flex items-center gap-2 border ${
                active
                  ? "bg-blue-600 text-white border-blue-400 shadow-sm"
                  : "bg-[var(--bg-slate)] text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]"
              }`}
            >
              <span>{c.flagEmoji}</span>
              <span className="font-semibold">{c.name}</span>
              <span className="text-[10px] opacity-80 omnis-mono hidden md:inline">
                {layerInfo.value.split("•")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
