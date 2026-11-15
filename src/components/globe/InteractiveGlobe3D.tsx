"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { geoEquirectangular, geoGraticule10, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import {
  RotateCcw,
  Sun,
  ZoomIn,
  ZoomOut,
  Layers,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  MapPin,
} from "lucide-react";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { CountryIntelligenceProfile, IntelligenceLayerId } from "@/types/omnis";

const ISO3_TO_NUMERIC: Record<string, string> = {
  IND: "356",
  USA: "840",
  CHN: "156",
  DEU: "276",
  JPN: "392",
  GBR: "826",
  FRA: "250",
  BRA: "076",
  SGP: "702",
};

const CITY_NIGHT_CLUSTERS: [number, number, number][] = [
  // [lat, lng, intensity] — major populated urban corridors
  [28.61, 77.2, 1.0], // Delhi
  [19.07, 72.87, 1.0], // Mumbai
  [12.97, 77.59, 0.9], // Bengaluru
  [22.57, 88.36, 0.85], // Kolkata
  [13.08, 80.27, 0.85], // Chennai
  [40.71, -74.0, 1.0], // New York
  [34.05, -118.24, 0.95], // Los Angeles
  [41.87, -87.62, 0.85], // Chicago
  [37.77, -122.41, 0.85], // San Francisco
  [51.5, -0.12, 1.0], // London
  [48.85, 2.35, 0.95], // Paris
  [52.52, 13.4, 0.9], // Berlin
  [50.11, 8.68, 0.85], // Frankfurt
  [45.46, 9.19, 0.8], // Milan
  [35.67, 139.65, 1.0], // Tokyo
  [34.69, 135.5, 0.9], // Osaka
  [39.9, 116.4, 1.0], // Beijing
  [31.23, 121.47, 1.0], // Shanghai
  [22.54, 114.05, 0.95], // Shenzhen/HK
  [37.56, 126.97, 0.95], // Seoul
  [1.35, 103.82, 0.95], // Singapore
  [-23.55, -46.63, 0.95], // Sao Paulo
  [-22.9, -43.17, 0.85], // Rio de Janeiro
  [-33.86, 151.2, 0.85], // Sydney
  [30.04, 31.23, 0.9], // Cairo
  [25.2, 55.27, 0.85], // Dubai
  [55.75, 37.61, 0.85], // Moscow
  [-26.2, 28.04, 0.75], // Johannesburg
  [6.52, 3.37, 0.8], // Lagos
];

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
): { label: string; value: string; numericWeight: number; colorHex: number; cssColor: string } {
  switch (layer) {
    case "economics":
      return {
        label: "Nominal GDP",
        value: `$${country.gdpUsdBn.toLocaleString()}B (${country.gdpGrowthPct >= 0 ? "+" : ""}${country.gdpGrowthPct}%)`,
        numericWeight: Math.min(1.65, Math.max(0.7, Math.log10(country.gdpUsdBn) / 2.6)),
        colorHex: 0x3b82f6,
        cssColor: "#3b82f6",
      };
    case "demographics":
      return {
        label: "Population",
        value: `${(country.population / 1e6).toFixed(1)}M • Life Exp ${country.lifeExpectancyYears}y`,
        numericWeight: Math.min(1.65, Math.max(0.7, country.population / 5e8)),
        colorHex: 0x8b5cf6,
        cssColor: "#8b5cf6",
      };
    case "energy":
      return {
        label: "Clean Grid Share",
        value: `${country.energyProfile.renewableSharePct}% Clean • ${country.energyProfile.electricityGenerationTwh} TWh`,
        numericWeight: Math.min(1.65, Math.max(0.7, country.energyProfile.renewableSharePct / 45)),
        colorHex: 0x10b981,
        cssColor: "#10b981",
      };
    case "environment":
      return {
        label: "Temp Anomaly & CO₂",
        value: `+${country.environmentProfile.tempAnomalyC}°C • ${country.environmentProfile.co2PerCapitaTons}t/cap`,
        numericWeight: Math.min(1.65, Math.max(0.7, country.environmentProfile.tempAnomalyC)),
        colorHex: 0xf59e0b,
        cssColor: "#f59e0b",
      };
    case "technology":
      return {
        label: "AI & R&D Index",
        value: `AI ${country.technologyProfile.aiReadinessIndex} • R&D ${country.technologyProfile.rdSpendPctGdp}% GDP`,
        numericWeight: Math.min(1.65, Math.max(0.7, country.technologyProfile.aiReadinessIndex / 65)),
        colorHex: 0x06b6d4,
        cssColor: "#06b6d4",
      };
    case "international":
      return {
        label: "Multilateral Ties",
        value: `${country.internationalRelations.treatyMemberships.slice(0, 4).join(", ")}`,
        numericWeight: 1.15,
        colorHex: 0xec4899,
        cssColor: "#ec4899",
      };
    default:
      return {
        label: "Geographic Footprint",
        value: `${(country.areaSqKm / 1000).toFixed(0)}k km² • Capital: ${country.capital}`,
        numericWeight: 1.0,
        colorHex: 0x60a5fa,
        cssColor: "#60a5fa",
      };
  }
}

export function InteractiveGlobe3D({
  countries,
  selectedIso3,
  onSelectCountry,
  activeLayer,
  heightClass = "h-[480px]",
  compact = false,
}: {
  countries: CountryIntelligenceProfile[];
  selectedIso3: string;
  onSelectCountry: (iso3: string) => void;
  activeLayer: IntelligenceLayerId;
  heightClass?: string;
  compact?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { theme, motionPaused } = useOmnisStore();

  const [autoRotate, setAutoRotate] = useState(true);
  const [dayLightAngle, setDayLightAngle] = useState(35);
  const [zoomDistance, setZoomDistance] = useState(2.68);
  const [webglSupported, setWebglSupported] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<{
    name: string;
    metric: string;
    x: number;
    y: number;
  } | null>(null);

  const rotationRef = useRef({ x: 0.28, y: -2.95 });
  const targetRotationRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const autoRotateRef = useRef(autoRotate);
  const zoomRef = useRef(zoomDistance);
  const targetZoomRef = useRef(zoomDistance);
  const lightAngleRef = useRef(dayLightAngle);
  const reducedMotionRef = useRef(false);
  const motionPausedRef = useRef(motionPaused);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.iso3 === selectedIso3) ?? countries[0],
    [countries, selectedIso3]
  );

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) {
      reducedMotionRef.current = true;
      setAutoRotate(false);
    }
  }, []);

  useEffect(() => {
    motionPausedRef.current = motionPaused;
  }, [motionPaused]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    targetZoomRef.current = zoomDistance;
  }, [zoomDistance]);

  useEffect(() => {
    lightAngleRef.current = dayLightAngle;
  }, [dayLightAngle]);

  // Smooth damped target rotation when selected country changes
  useEffect(() => {
    const target = countries.find((c) => c.iso3 === selectedIso3);
    if (target) {
      const nextX = Math.max(-0.85, Math.min(0.85, (target.lat * Math.PI) / 180 * 0.65));
      const rawY = -((target.lng + 90) * Math.PI) / 180;
      targetRotationRef.current = { x: nextX, y: rawY };
    }
  }, [selectedIso3, countries]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    const isLight = theme === "light";
    const width = container.clientWidth || 720;
    const height = container.clientHeight || 480;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setSize(width, height);
    renderer.setPixelRatio(dpr);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, zoomRef.current);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 1. Geographically Accurate 2048x1024 Earth Canvas Texture from Natural Earth 110m TopoJSON
    const texW = 2048;
    const texH = 1024;
    const texCanvas = document.createElement("canvas");
    texCanvas.width = texW;
    texCanvas.height = texH;
    const ctx = texCanvas.getContext("2d");

    // 2. Emissive City Lights Map (for Dark Mode night hemisphere)
    const nightCanvas = document.createElement("canvas");
    nightCanvas.width = 1024;
    nightCanvas.height = 512;
    const nightCtx = nightCanvas.getContext("2d");

    const atlasCountries = feature(
      worldAtlas as unknown as Parameters<typeof feature>[0],
      (worldAtlas as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects
        .countries
    ) as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry, { name?: string }>;

    const projection = geoEquirectangular().fitExtent(
      [
        [0, 0],
        [texW, texH],
      ],
      { type: "Sphere" }
    );

    const selectedNumId = ISO3_TO_NUMERIC[selectedIso3];

    if (ctx) {
      // Bathymetric ocean base gradient
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, texH);
      if (isLight) {
        oceanGrad.addColorStop(0, "#d7e7f6");
        oceanGrad.addColorStop(0.5, "#b7d5f0");
        oceanGrad.addColorStop(1, "#cee2f4");
      } else {
        oceanGrad.addColorStop(0, "#051024");
        oceanGrad.addColorStop(0.5, "#081c3a");
        oceanGrad.addColorStop(1, "#051024");
      }
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, texW, texH);

      // Graticule coordinate meridians
      const pathGen = geoPath(projection, ctx);
      ctx.beginPath();
      pathGen(geoGraticule10());
      ctx.strokeStyle = isLight ? "rgba(29, 78, 216, 0.12)" : "rgba(96, 165, 250, 0.14)";
      ctx.lineWidth = 0.9;
      ctx.stroke();

      // Sovereign polygons from Natural Earth
      for (const feat of atlasCountries.features) {
        const isTarget = String(feat.id ?? "") === selectedNumId;
        ctx.beginPath();
        pathGen(feat);
        if (isTarget) {
          ctx.fillStyle = isLight ? "#2563eb" : "#1d4ed8";
          ctx.fill();
          ctx.strokeStyle = isLight ? "#ffffff" : "#93c5fd";
          ctx.lineWidth = 2.0;
          ctx.stroke();
        } else {
          ctx.fillStyle = isLight ? "#eef2ec" : "#10223b";
          ctx.fill();
          ctx.strokeStyle = isLight ? "rgba(71, 98, 128, 0.45)" : "rgba(125, 179, 252, 0.34)";
          ctx.lineWidth = 0.85;
          ctx.stroke();
        }
      }

      // Highlight continental coastal rim crisply
      ctx.beginPath();
      pathGen(atlasCountries);
      ctx.strokeStyle = isLight ? "rgba(30, 58, 138, 0.35)" : "rgba(147, 197, 253, 0.42)";
      ctx.lineWidth = 1.05;
      ctx.stroke();
    }

    if (nightCtx && !isLight) {
      nightCtx.fillStyle = "#000000";
      nightCtx.fillRect(0, 0, 1024, 512);
      for (const [lat, lng, intensity] of CITY_NIGHT_CLUSTERS) {
        const px = ((lng + 180) / 360) * 1024;
        const py = ((90 - lat) / 180) * 512;
        const rad = 11 * intensity;
        const glow = nightCtx.createRadialGradient(px, py, 0.5, px, py, rad);
        glow.addColorStop(0, `rgba(253, 224, 130, ${0.85 * intensity})`);
        glow.addColorStop(0.4, `rgba(245, 158, 11, ${0.35 * intensity})`);
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        nightCtx.fillStyle = glow;
        nightCtx.beginPath();
        nightCtx.arc(px, py, rad, 0, Math.PI * 2);
        nightCtx.fill();
      }
    }

    // 3. Procedural Translucent Cloud Layer Texture
    const cloudCanvas = document.createElement("canvas");
    cloudCanvas.width = 512;
    cloudCanvas.height = 256;
    const cloudCtx = cloudCanvas.getContext("2d");
    if (cloudCtx) {
      cloudCtx.clearRect(0, 0, 512, 256);
      for (let i = 0; i < 65; i++) {
        const cx = ((i * 73) % 512);
        const cy = 28 + ((i * 47) % 200);
        const rx = 22 + (i % 5) * 10;
        const ry = 6 + (i % 4) * 3;
        const grad = cloudCtx.createRadialGradient(cx, cy, 1, cx, cy, rx);
        grad.addColorStop(0, isLight ? "rgba(255,255,255,0.28)" : "rgba(226,238,255,0.22)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        cloudCtx.fillStyle = grad;
        cloudCtx.beginPath();
        cloudCtx.ellipse(cx, cy, rx, ry, (i % 3) * 0.25, 0, Math.PI * 2);
        cloudCtx.fill();
      }
    }

    const earthTexture = new THREE.CanvasTexture(texCanvas);
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = 4;

    const nightTexture = new THREE.CanvasTexture(nightCanvas);
    const cloudTexture = new THREE.CanvasTexture(cloudCanvas);

    const sphereGeo = new THREE.SphereGeometry(1, 64, 64);
    const sphereMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: isLight ? 0.72 : 0.62,
      metalness: isLight ? 0.04 : 0.12,
      emissive: isLight ? new THREE.Color(0x000000) : new THREE.Color(0xffb347),
      emissiveMap: isLight ? null : nightTexture,
      emissiveIntensity: isLight ? 0 : 0.85,
    });
    const earthMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(earthMesh);

    // Subtle Drifting Atmospheric Cloud Layer
    const cloudGeo = new THREE.SphereGeometry(1.014, 48, 48);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: isLight ? 0.38 : 0.45,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    globeGroup.add(cloudMesh);

    // GLSL Volumetric Fresnel Atmospheric Scattering Limb Shader
    const atmosGeo = new THREE.SphereGeometry(1.11, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 glowColor;
        uniform float intensityFactor;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
          gl_FragColor = vec4(glowColor, 1.0) * intensity * intensityFactor;
        }
      `,
      uniforms: {
        glowColor: { value: new THREE.Color(isLight ? 0x60a5fa : 0x3b82f6) },
        intensityFactor: { value: isLight ? 0.42 : 0.92 },
      },
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);

    // Subtle Deep-Space Starfield (Obsidian Dark Mode Only)
    let starsGeo: THREE.BufferGeometry | null = null;
    let starsMat: THREE.PointsMaterial | null = null;
    if (!isLight) {
      starsGeo = new THREE.BufferGeometry();
      const starPositions = new Float32Array(360 * 3);
      for (let i = 0; i < 360; i++) {
        // Deterministic quasi-random distribution on outer sphere
        const s1 = Math.sin(i * 12.9898) * 43758.5453;
        const s2 = Math.sin(i * 78.233) * 19341.1234;
        const u = s1 - Math.floor(s1);
        const v = s2 - Math.floor(s2);
        const theta = u * 2 * Math.PI;
        const phi = Math.acos(2 * v - 1);
        const r = 14 + (i % 5) * 2.5;
        starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = r * Math.cos(phi);
      }
      starsGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      starsMat = new THREE.PointsMaterial({
        color: 0xcbd5e1,
        size: 0.045,
        transparent: true,
        opacity: 0.55,
      });
      scene.add(new THREE.Points(starsGeo, starsMat));
    }

    // Sovereign Markers & 3D Data Pillars
    const markersGroup = new THREE.Group();
    globeGroup.add(markersGroup);

    const hitMeshes: THREE.Mesh[] = [];
    for (const c of countries) {
      const layerMeta = getLayerMetricForCountry(c, activeLayer);
      const isSelected = c.iso3 === selectedIso3;
      const basePos = latLngToVector3(c.lat, c.lng, 1.005);
      const topPos = latLngToVector3(
        c.lat,
        c.lng,
        1.018 + (isSelected ? 0.05 : 0.025 * layerMeta.numericWeight)
      );

      // Vertical data spire scaled to layer metric
      const spireGeo = new THREE.BufferGeometry().setFromPoints([basePos, topPos]);
      const spireMat = new THREE.LineBasicMaterial({
        color: isSelected ? (isLight ? 0x1d4ed8 : 0x38bdf8) : layerMeta.colorHex,
        transparent: true,
        opacity: isSelected ? 0.95 : 0.72,
      });
      markersGroup.add(new THREE.Line(spireGeo, spireMat));

      // Surface beacon node
      const markerGeo = new THREE.SphereGeometry(isSelected ? 0.028 : 0.019, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({
        color: isSelected ? (isLight ? 0x1d4ed8 : 0x7dd3fc) : layerMeta.colorHex,
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(topPos);
      marker.userData = { iso3: c.iso3, name: c.name, metric: layerMeta.value };
      markersGroup.add(marker);
      hitMeshes.push(marker);

      // Selected focus halo ring on surface
      const ringGeo = new THREE.RingGeometry(0.024, isSelected ? 0.052 : 0.035, 28);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isSelected ? (isLight ? 0x1d4ed8 : 0x60a5fa) : layerMeta.colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isSelected ? 0.88 : 0.45,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(latLngToVector3(c.lat, c.lng, 1.009));
      ring.lookAt(ring.position.clone().multiplyScalar(2));
      markersGroup.add(ring);
    }

    // Animated Great-Circle Trade & Knowledge Arcs + Flowing Telemetry Pulses
    const arcPulses: { curve: THREE.QuadraticBezierCurve3; mesh: THREE.Mesh; offset: number }[] = [];
    if (selectedCountry) {
      const startVec = latLngToVector3(selectedCountry.lat, selectedCountry.lng, 1.015);
      let idx = 0;
      for (const other of countries) {
        if (other.iso3 === selectedCountry.iso3) continue;
        const endVec = latLngToVector3(other.lat, other.lng, 1.015);
        const arcHeight = 1.14 + Math.min(0.24, startVec.distanceTo(endVec) * 0.14);
        const midVec = startVec
          .clone()
          .add(endVec)
          .multiplyScalar(0.5)
          .normalize()
          .multiplyScalar(arcHeight);
        const curve = new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(36));
        const lineMat = new THREE.LineBasicMaterial({
          color: isLight ? 0x2563eb : 0x60a5fa,
          transparent: true,
          opacity: isLight ? 0.34 : 0.3,
        });
        globeGroup.add(new THREE.Line(lineGeo, lineMat));

        const pulseGeo = new THREE.SphereGeometry(0.011, 8, 8);
        const pulseMat = new THREE.MeshBasicMaterial({
          color: isLight ? 0x1d4ed8 : 0x93c5fd,
        });
        const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
        globeGroup.add(pulseMesh);
        arcPulses.push({ curve, mesh: pulseMesh, offset: (idx * 0.19) % 1 });
        idx += 1;
      }
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 1.18 : 0.62);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xffffff, isLight ? 1.15 : 1.75);
    scene.add(sunLight);
    const rimLight = new THREE.DirectionalLight(isLight ? 0xe0f2fe : 0x3b82f6, isLight ? 0.4 : 0.55);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    let animFrameId = 0;
    let clockTime = 0;
    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const motionIdle = reducedMotionRef.current || motionPausedRef.current;
      clockTime += motionIdle ? 0 : 0.004;

      // Smooth damped camera target glide toward selected country
      if (targetRotationRef.current && !isDraggingRef.current) {
        const dx = targetRotationRef.current.x - rotationRef.current.x;
        let dy = targetRotationRef.current.y - rotationRef.current.y;
        while (dy > Math.PI) dy -= 2 * Math.PI;
        while (dy < -Math.PI) dy += 2 * Math.PI;
        rotationRef.current.x += dx * 0.08;
        rotationRef.current.y += dy * 0.08;
        if (Math.abs(dx) < 0.002 && Math.abs(dy) < 0.002) {
          targetRotationRef.current = null;
        }
      } else if (autoRotateRef.current && !isDraggingRef.current && !motionIdle) {
        rotationRef.current.y += 0.0014;
      }

      zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.12;
      globeGroup.rotation.x = rotationRef.current.x;
      globeGroup.rotation.y = rotationRef.current.y;
      cloudMesh.rotation.y = clockTime * 0.18;
      camera.position.z = zoomRef.current;

      const rad = (lightAngleRef.current * Math.PI) / 180;
      sunLight.position.set(Math.cos(rad) * 5, 1.9, Math.sin(rad) * 5);

      for (const p of arcPulses) {
        const t = (clockTime * 0.35 + p.offset) % 1;
        p.mesh.position.copy(p.curve.getPoint(t));
      }

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

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      targetRotationRef.current = null;
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (isDraggingRef.current) {
        const dx = e.clientX - prevMouseRef.current.x;
        const dy = e.clientY - prevMouseRef.current.y;
        rotationRef.current.y += dx * 0.0055;
        rotationRef.current.x = Math.max(-1.05, Math.min(1.05, rotationRef.current.x + dy * 0.0055));
        prevMouseRef.current = { x: e.clientX, y: e.clientY };
        setHoveredCountry(null);
        return;
      }

      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(hitMeshes);
      const hit = hits.find((h) => h.object.userData?.iso3);
      if (hit) {
        setHoveredCountry({
          name: hit.object.userData.name,
          metric: hit.object.userData.metric,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        renderer.domElement.style.cursor = "pointer";
      } else {
        setHoveredCountry(null);
        renderer.domElement.style.cursor = "grab";
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const moved =
        Math.hypot(
          e.clientX - pointerDownPosRef.current.x,
          e.clientY - pointerDownPosRef.current.y
        ) > 5;
      isDraggingRef.current = false;

      if (!moved) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(hitMeshes);
        const hitWithIso = hits.find((h) => h.object.userData?.iso3);
        if (hitWithIso?.object.userData?.iso3) {
          onSelectCountry(hitWithIso.object.userData.iso3);
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener("pointerdown", onPointerDown);
    domElem.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", handleResize);
      domElem.removeEventListener("pointerdown", onPointerDown);
      domElem.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      sphereGeo.dispose();
      sphereMat.dispose();
      earthTexture.dispose();
      nightTexture.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      cloudTexture.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      starsGeo?.dispose();
      starsMat?.dispose();
      renderer.dispose();
    };
  }, [countries, selectedIso3, activeLayer, onSelectCountry, selectedCountry, theme]);

  const activeLayerMeta = selectedCountry
    ? getLayerMetricForCountry(selectedCountry, activeLayer)
    : null;

  return (
    <div
      data-globe-stage="true"
      className={`${
        isFullscreen ? "fixed inset-4 z-50 h-[calc(100vh-2rem)]" : `relative w-full ${heightClass}`
      } omnis-card overflow-hidden select-none`}
      style={{
        background:
          theme === "light"
            ? "radial-gradient(circle at 52% 45%, #ffffff 0%, #e7eef8 58%, #dce6f4 100%)"
            : "radial-gradient(circle at 52% 45%, #0c172b 0%, #060b14 62%, #03050a 100%)",
      }}
    >
      {/* 3D WebGL Canvas */}
      {webglSupported ? (
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          aria-label="Interactive 3D Global Intelligence Globe"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-6 text-center text-sm text-[var(--text-secondary)]">
          Interactive Geodesic Projection Active — Select any country beacon below.
        </div>
      )}

      {/* Raycast 3D Beacon Tooltip */}
      {hoveredCountry && (
        <div
          className="pointer-events-none absolute z-20 omnis-glass-panel px-2.5 py-1.5 rounded-lg text-xs shadow-lg"
          style={{
            left: Math.min(hoveredCountry.x + 14, 340),
            top: Math.max(12, hoveredCountry.y - 38),
          }}
        >
          <div className="font-bold text-[var(--text-primary)]">{hoveredCountry.name}</div>
          <div className="text-[10px] tone-blue omnis-mono">{hoveredCountry.metric}</div>
        </div>
      )}

      {/* Responsive Top HUD Bar (Inspector + Camera Controls) */}
      <div className="absolute top-2.5 sm:top-3.5 inset-x-2.5 sm:inset-x-3.5 flex items-start justify-between gap-2 pointer-events-none">
        {/* Top-Left Compact Telemetry Inspector */}
        <div className="min-w-0 max-w-[192px] sm:max-w-[260px] omnis-glass-panel px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider tone-blue omnis-mono truncate">
            <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">Layer: {activeLayer}</span>
          </div>
          {selectedCountry && activeLayerMeta && (
            <div className="text-xs space-y-0.5 min-w-0">
              <div className="font-bold text-[var(--text-primary)] flex items-center gap-1 truncate">
                <span className="shrink-0">{selectedCountry.flagEmoji}</span>
                <span className="truncate">{selectedCountry.name}</span>
                <span className="text-[10px] omnis-mono text-[var(--text-muted)] shrink-0">
                  ({selectedCountry.iso3})
                </span>
              </div>
              <div className="text-[10.5px] sm:text-[11px] text-[var(--text-secondary)] omnis-mono truncate">
                {activeLayerMeta.value}
              </div>
              {!compact && (
                <div className="hidden sm:flex text-[10px] text-[var(--text-muted)] items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {selectedCountry.capital} • Pop {(selectedCountry.population / 1e6).toFixed(0)}M
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top-Right Instrument Camera Controls */}
        <div className="pointer-events-auto shrink-0 flex items-center gap-0.5 sm:gap-1 omnis-glass-panel p-1 sm:p-1.5 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setAutoRotate((prev) => !prev)}
            title={autoRotate ? "Pause Orbital Rotation" : "Resume Orbital Rotation"}
            className="p-1 sm:p-1.5 rounded-lg hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            {autoRotate ? <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setZoomDistance((z) => Math.max(1.85, Number((z - 0.25).toFixed(2))))}
            title="Zoom In"
            className="p-1 sm:p-1.5 rounded-lg hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomDistance((z) => Math.min(3.75, Number((z + 0.25).toFixed(2))))}
            title="Zoom Out"
            className="p-1 sm:p-1.5 rounded-lg hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <ZoomOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDayLightAngle((a) => (a + 45) % 360)}
            title="Cycle Solar Terminator Illumination"
            className="inline-flex items-center gap-1 p-1 sm:px-2 sm:py-1 rounded-lg hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5 tone-warning" />
            <span className="hidden sm:inline text-[11px] omnis-mono">{dayLightAngle}°</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setZoomDistance(2.68);
              const target = countries.find((c) => c.iso3 === selectedIso3);
              if (target) {
                targetRotationRef.current = {
                  x: Math.max(-0.85, Math.min(0.85, (target.lat * Math.PI) / 180 * 0.65)),
                  y: -((target.lng + 90) * Math.PI) / 180,
                };
              }
            }}
            title="Recenter Globe"
            className="p-1 sm:p-1.5 rounded-lg hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Globe"}
            className="p-1 sm:p-1.5 rounded-lg hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          </button>
        </div>
      </div>

      {/* Bottom Interactive Country Coordinate Selector Rail */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 overflow-x-auto py-1.5 px-2 rounded-xl omnis-glass-panel">
        {countries.map((c) => {
          const active = c.iso3 === selectedIso3;
          const layerInfo = getLayerMetricForCountry(c, activeLayer);
          return (
            <button
              key={c.iso3}
              type="button"
              onClick={() => onSelectCountry(c.iso3)}
              className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 border cursor-pointer ${
                active
                  ? "bg-[var(--accent-blue-solid)] text-white border-white/20 shadow-sm"
                  : "bg-[var(--bg-slate)] text-[var(--text-secondary)] border-transparent hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span>{c.flagEmoji}</span>
              <span className="font-semibold">{c.name}</span>
              <span className="text-[10px] opacity-85 omnis-mono hidden md:inline">
                {layerInfo.value.split("•")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
