"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { CountryIntelligenceProfile, IntelligenceLayerId } from "@/types/omnis";

const MIN_ZOOM = 1.85;
const MAX_ZOOM = 4.1;
const DEFAULT_ZOOM = 2.68;

const ISO3_TO_NUMERIC: Record<string, string> = {
  AFG: "004",
  AGO: "024",
  ALB: "008",
  ARE: "784",
  ARG: "032",
  ARM: "051",
  AUS: "036",
  AUT: "040",
  AZE: "031",
  BEL: "056",
  BGD: "050",
  BGR: "100",
  BIH: "070",
  BLR: "112",
  BOL: "068",
  BRA: "076",
  BWA: "072",
  CAN: "124",
  CHE: "756",
  CHL: "152",
  CHN: "156",
  CIV: "384",
  CMR: "120",
  COD: "180",
  COG: "178",
  COL: "170",
  CRI: "188",
  CUB: "192",
  CYP: "196",
  CZE: "203",
  DEU: "276",
  DNK: "208",
  DOM: "214",
  DZA: "012",
  ECU: "218",
  EGY: "818",
  ESP: "724",
  EST: "233",
  ETH: "231",
  FIN: "246",
  FJI: "242",
  FRA: "250",
  GBR: "826",
  GEO: "268",
  GHA: "288",
  GRC: "300",
  GRL: "304",
  GTM: "320",
  HND: "340",
  HRV: "191",
  HUN: "348",
  IDN: "360",
  IND: "356",
  IRL: "372",
  IRN: "364",
  IRQ: "368",
  ISL: "352",
  ISR: "376",
  ITA: "380",
  JAM: "388",
  JOR: "400",
  JPN: "392",
  KAZ: "398",
  KEN: "404",
  KHM: "116",
  KOR: "410",
  KWT: "414",
  LAO: "418",
  LBN: "422",
  LBY: "434",
  LKA: "144",
  LTU: "440",
  LUX: "442",
  LVA: "428",
  MAR: "504",
  MDA: "498",
  MDG: "450",
  MEX: "484",
  MLI: "466",
  MMR: "104",
  MNG: "496",
  MOZ: "508",
  MYS: "458",
  NAM: "516",
  NER: "562",
  NGA: "566",
  NLD: "528",
  NOR: "578",
  NPL: "524",
  NZL: "554",
  OMN: "512",
  PAK: "586",
  PAN: "591",
  PER: "604",
  PHL: "608",
  PNG: "598",
  POL: "616",
  PRK: "408",
  PRT: "620",
  PRY: "600",
  QAT: "634",
  ROU: "642",
  RUS: "643",
  RWA: "646",
  SAU: "682",
  SDN: "729",
  SEN: "686",
  SGP: "702",
  SRB: "688",
  SVK: "703",
  SVN: "705",
  SWE: "752",
  SYR: "760",
  THA: "764",
  TUN: "788",
  TUR: "792",
  TWN: "158",
  TZA: "834",
  UGA: "800",
  UKR: "804",
  URY: "858",
  USA: "840",
  UZB: "860",
  VEN: "862",
  VNM: "704",
  YEM: "887",
  ZAF: "710",
  ZMB: "894",
  ZWE: "716",
};

const NUMERIC_TO_ISO3: Record<string, string> = Object.fromEntries(
  Object.entries(ISO3_TO_NUMERIC).map(([iso3, numId]) => [numId, iso3])
);

interface PickCountryEntry {
  iso3: string;
  numId: string;
  name: string;
}

const CITY_NIGHT_CLUSTERS: [number, number, number][] = [
  [28.61, 77.2, 1.0],
  [19.07, 72.87, 1.0],
  [12.97, 77.59, 0.9],
  [22.57, 88.36, 0.85],
  [13.08, 80.27, 0.85],
  [40.71, -74.0, 1.0],
  [34.05, -118.24, 0.95],
  [41.87, -87.62, 0.85],
  [37.77, -122.41, 0.85],
  [51.5, -0.12, 1.0],
  [48.85, 2.35, 0.95],
  [52.52, 13.4, 0.9],
  [50.11, 8.68, 0.85],
  [45.46, 9.19, 0.8],
  [35.67, 139.65, 1.0],
  [34.69, 135.5, 0.9],
  [39.9, 116.4, 1.0],
  [31.23, 121.47, 1.0],
  [22.54, 114.05, 0.95],
  [37.56, 126.97, 0.95],
  [1.35, 103.82, 0.95],
  [-23.55, -46.63, 0.95],
  [-22.9, -43.17, 0.85],
  [-33.86, 151.2, 0.85],
  [30.04, 31.23, 0.9],
  [25.2, 55.27, 0.85],
  [55.75, 37.61, 0.85],
  [-26.2, 28.04, 0.75],
  [6.52, 3.37, 0.8],
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function disposeGroupChildren(group: THREE.Group): void {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if ("geometry" in child && child.geometry instanceof THREE.BufferGeometry) {
      child.geometry.dispose();
    }
    if ("material" in child && child.material) {
      const mat = child.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else if (mat instanceof THREE.Material) {
        mat.dispose();
      }
    }
  }
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
        numericWeight: Math.min(1.65, Math.max(0.7, Math.log10(Math.max(10, country.gdpUsdBn)) / 2.6)),
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

interface GlobeSceneHandle {
  earthCanvas: HTMLCanvasElement;
  earthTexture: THREE.CanvasTexture;
  roughnessCanvas: HTMLCanvasElement;
  roughnessTexture: THREE.CanvasTexture;
  nightCanvas: HTMLCanvasElement;
  nightTexture: THREE.CanvasTexture;
  cloudCanvas: HTMLCanvasElement;
  cloudTexture: THREE.CanvasTexture;
  sphereMat: THREE.MeshStandardMaterial;
  cloudMat: THREE.MeshStandardMaterial;
  atmosMat: THREE.ShaderMaterial;
  starsPoints: THREE.Points;
  ambientLight: THREE.AmbientLight;
  sunLight: THREE.DirectionalLight;
  rimLight: THREE.DirectionalLight;
  globeGroup: THREE.Group;
  markersGroup: THREE.Group;
  arcsGroup: THREE.Group;
  atlasCountries: GeoJSON.FeatureCollection<GeoJSON.Geometry, { name?: string }>;
  pickBuffer: Uint8ClampedArray;
  pickWidth: number;
  pickHeight: number;
  pickIndexToEntry: (PickCountryEntry | null)[];
  sunUniforms: {
    uSunDirection: { value: THREE.Vector3 };
    uCityLightsEnabled: { value: number };
    uIsLightMode: { value: number };
  };
}

export function InteractiveGlobe3D({
  countries,
  selectedIso3,
  onSelectCountry,
  activeLayer,
  heightClass = "h-[480px]",
  compact = false,
  wheelZoomMode = "always",
}: {
  countries: CountryIntelligenceProfile[];
  selectedIso3: string;
  onSelectCountry: (iso3: string) => void;
  activeLayer: IntelligenceLayerId;
  heightClass?: string;
  compact?: boolean;
  wheelZoomMode?: "always" | "engaged";
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const { theme, motionPaused } = useOmnisStore();

  const [autoRotate, setAutoRotate] = useState(true);
  const [dayLightAngle, setDayLightAngle] = useState(35);
  const [utcScrubberOpen, setUtcScrubberOpen] = useState(false);
  const [zoomDistance, setZoomDistance] = useState(DEFAULT_ZOOM);
  const [webglSupported, setWebglSupported] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [railScrollState, setRailScrollState] = useState({ left: false, right: false });
  const [stageDims, setStageDims] = useState({ width: 720, height: 480 });
  const [hoveredCountry, setHoveredCountry] = useState<{
    name: string;
    metric: string;
    x: number;
    y: number;
  } | null>(null);

  const rotationRef = useRef({ x: 0.28, y: -2.95 });
  const targetQuatRef = useRef<THREE.Quaternion | null>(null);
  const flightTotalAngleRef = useRef(0);
  const isDraggingRef = useRef(false);
  const engagedRef = useRef(false);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const autoRotateRef = useRef(autoRotate);
  const zoomRef = useRef(zoomDistance);
  const targetZoomRef = useRef(zoomDistance);
  const lightAngleRef = useRef(dayLightAngle);
  const reducedMotionRef = useRef(false);
  const motionPausedRef = useRef(motionPaused);
  const wheelZoomModeRef = useRef(wheelZoomMode);
  const isFullscreenRef = useRef(isFullscreen);
  const onSelectCountryRef = useRef(onSelectCountry);
  const themeRef = useRef(theme);
  const selectedIso3Ref = useRef(selectedIso3);
  const activeLayerRef = useRef(activeLayer);
  const countriesRef = useRef(countries);
  const hoveredIso3Ref = useRef<string | null>(null);
  const hitMeshesRef = useRef<THREE.Mesh[]>([]);
  const arcPulsesRef = useRef<
    { curve: THREE.QuadraticBezierCurve3; mesh: THREE.Mesh; offset: number }[]
  >([]);
  const sceneHandleRef = useRef<GlobeSceneHandle | null>(null);

  themeRef.current = theme;
  selectedIso3Ref.current = selectedIso3;
  activeLayerRef.current = activeLayer;
  countriesRef.current = countries;

  const selectedCountry = useMemo(
    () => countries.find((c) => c.iso3 === selectedIso3) ?? countries[0],
    [countries, selectedIso3]
  );

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

  useEffect(() => {
    wheelZoomModeRef.current = wheelZoomMode;
  }, [wheelZoomMode]);

  useEffect(() => {
    isFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  useEffect(() => {
    onSelectCountryRef.current = onSelectCountry;
  }, [onSelectCountry]);

  useEffect(() => {
    const target = countries.find((c) => c.iso3 === selectedIso3);
    if (target) {
      const nextX = Math.max(-0.85, Math.min(0.85, (target.lat * Math.PI) / 180 * 0.65));
      const rawY = -((target.lng + 90) * Math.PI) / 180;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(nextX, rawY, 0, "XYZ"));
      targetQuatRef.current = q;
      const handle = sceneHandleRef.current;
      flightTotalAngleRef.current = handle ? handle.globeGroup.quaternion.angleTo(q) : 0.8;
    }
  }, [selectedIso3, countries]);

  // Monitor rail horizontal scroll state for overflow chevrons & masks
  const updateRailScrollState = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setRailScrollState({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateRailScrollState();
    window.addEventListener("resize", updateRailScrollState);
    return () => window.removeEventListener("resize", updateRailScrollState);
  }, [countries.length, activeLayer, updateRailScrollState]);

  // Helper: paint theme-aware Earth surface, roughness map, clouds, night city lights & lighting in-place
  const paintEarthSurfaceAndAtmosphere = useCallback(
    (
      handle: GlobeSceneHandle,
      currentTheme: "dark" | "light",
      currentSelectedIso3: string,
      currentHoveredIso3: string | null = hoveredIso3Ref.current
    ) => {
      const isLight = currentTheme === "light";
      const {
        earthCanvas,
        earthTexture,
        roughnessCanvas,
        roughnessTexture,
        nightCanvas,
        nightTexture,
        cloudCanvas,
        cloudTexture,
        atlasCountries,
        sphereMat,
        cloudMat,
        atmosMat,
        starsPoints,
        ambientLight,
        sunLight,
        rimLight,
        sunUniforms,
      } = handle;

      const texW = earthCanvas.width;
      const texH = earthCanvas.height;
      const ctx = earthCanvas.getContext("2d");
      if (ctx) {
        const projection = geoEquirectangular().fitExtent(
          [
            [0, 0],
            [texW, texH],
          ],
          { type: "Sphere" }
        );
        const oceanGrad = ctx.createLinearGradient(0, 0, 0, texH);
        if (isLight) {
          oceanGrad.addColorStop(0, "#D8E8F8");
          oceanGrad.addColorStop(0.5, "#C2DCF4");
          oceanGrad.addColorStop(1, "#D8E8F8");
        } else {
          oceanGrad.addColorStop(0, "#051024");
          oceanGrad.addColorStop(0.5, "#081c3a");
          oceanGrad.addColorStop(1, "#051024");
        }
        ctx.fillStyle = oceanGrad;
        ctx.fillRect(0, 0, texW, texH);

        const pathGen = geoPath(projection, ctx);
        ctx.beginPath();
        pathGen(geoGraticule10());
        ctx.strokeStyle = isLight ? "rgba(29, 78, 216, 0.12)" : "rgba(96, 165, 250, 0.14)";
        ctx.lineWidth = 0.9;
        ctx.stroke();

        const selectedNumId = ISO3_TO_NUMERIC[currentSelectedIso3];
        const hoveredNumId = currentHoveredIso3 ? ISO3_TO_NUMERIC[currentHoveredIso3] : undefined;
        for (const feat of atlasCountries.features) {
          const featId = String(feat.id ?? "").padStart(3, "0");
          const isTarget = Boolean(selectedNumId && featId === selectedNumId);
          const isHovered = Boolean(hoveredNumId && !isTarget && featId === hoveredNumId);
          ctx.beginPath();
          pathGen(feat);
          if (isTarget) {
            ctx.fillStyle = isLight ? "#1d4ed8" : "#2563eb";
            ctx.fill();
            ctx.strokeStyle = isLight ? "#ffffff" : "#93c5fd";
            ctx.lineWidth = 2.0;
            ctx.stroke();
          } else if (isHovered) {
            ctx.fillStyle = isLight ? "rgba(29, 78, 216, 0.20)" : "rgba(96, 165, 250, 0.28)";
            ctx.fill();
            ctx.strokeStyle = isLight ? "#1D4ED8" : "#93C5FD";
            ctx.lineWidth = 1.6;
            ctx.stroke();
          } else {
            ctx.fillStyle = isLight ? "#F4F1EA" : "#10223b";
            ctx.fill();
            ctx.strokeStyle = isLight ? "rgba(71, 98, 128, 0.45)" : "rgba(125, 179, 252, 0.34)";
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        pathGen(atlasCountries);
        ctx.strokeStyle = isLight ? "rgba(30, 58, 138, 0.35)" : "rgba(147, 197, 253, 0.42)";
        ctx.lineWidth = 1.05;
        ctx.stroke();
        earthTexture.needsUpdate = true;
      }

      // Procedural Ocean Specular & Matte Land Roughness Map (1024x512)
      const rCtx = roughnessCanvas.getContext("2d");
      if (rCtx) {
        const rW = roughnessCanvas.width;
        const rH = roughnessCanvas.height;
        const rProj = geoEquirectangular().fitExtent(
          [
            [0, 0],
            [rW, rH],
          ],
          { type: "Sphere" }
        );
        const rPath = geoPath(rProj, rCtx);
        rCtx.fillStyle = "rgb(68, 68, 68)"; // specular ocean (~0.27 roughness)
        rCtx.fillRect(0, 0, rW, rH);
        rCtx.fillStyle = "rgb(225, 225, 225)"; // matte land terrain (~0.88 roughness)
        rCtx.beginPath();
        rPath(atlasCountries);
        rCtx.fill();
        roughnessTexture.needsUpdate = true;
      }

      const nightCtx = nightCanvas.getContext("2d");
      if (nightCtx) {
        nightCtx.fillStyle = "#000000";
        nightCtx.fillRect(0, 0, nightCanvas.width, nightCanvas.height);
        for (const [lat, lng, intensity] of CITY_NIGHT_CLUSTERS) {
          const px = ((lng + 180) / 360) * nightCanvas.width;
          const py = ((90 - lat) / 180) * nightCanvas.height;
          const rad = 11 * intensity;
          const glow = nightCtx.createRadialGradient(px, py, 0.5, px, py, rad);
          glow.addColorStop(0, `rgba(253, 224, 130, ${0.88 * intensity})`);
          glow.addColorStop(0.4, `rgba(245, 158, 11, ${0.38 * intensity})`);
          glow.addColorStop(1, "rgba(0, 0, 0, 0)");
          nightCtx.fillStyle = glow;
          nightCtx.beginPath();
          nightCtx.arc(px, py, rad, 0, Math.PI * 2);
          nightCtx.fill();
        }
        nightTexture.needsUpdate = true;
      }

      const cloudCtx = cloudCanvas.getContext("2d");
      if (cloudCtx) {
        cloudCtx.clearRect(0, 0, cloudCanvas.width, cloudCanvas.height);
        for (let i = 0; i < 65; i++) {
          const cx = (i * 73) % cloudCanvas.width;
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
        cloudTexture.needsUpdate = true;
      }

      sphereMat.roughnessMap = roughnessTexture;
      sphereMat.roughness = 1.0;
      sphereMat.metalness = 0.18;
      sphereMat.emissive.setHex(0xffb347);
      sphereMat.emissiveMap = nightTexture;
      sphereMat.emissiveIntensity = isLight ? 0.85 : 0.92;
      sphereMat.needsUpdate = true;

      sunUniforms.uCityLightsEnabled.value = isLight ? 0.48 : 1.0;
      sunUniforms.uIsLightMode.value = isLight ? 1.0 : 0.0;

      cloudMat.opacity = isLight ? 0.36 : 0.44;
      atmosMat.uniforms.glowColor.value.setHex(isLight ? 0x60a5fa : 0x3b82f6);
      atmosMat.uniforms.intensityFactor.value = isLight ? 0.4 : 0.92;
      atmosMat.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      atmosMat.needsUpdate = true;

      starsPoints.visible = !isLight;
      ambientLight.intensity = isLight ? 1.18 : 0.62;
      sunLight.intensity = isLight ? 1.15 : 1.75;
      rimLight.color.setHex(isLight ? 0xe0f2fe : 0x3b82f6);
      rimLight.intensity = isLight ? 0.4 : 0.55;
    },
    []
  );

  // Lifecycle Effect A: Initialize Three.js WebGL context ONCE on mount
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

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 480;
    setStageDims({ width, height });
    const dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);
    renderer.setSize(width, height);
    renderer.setPixelRatio(dpr);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, zoomRef.current);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const earthCanvas = document.createElement("canvas");
    earthCanvas.width = 2048;
    earthCanvas.height = 1024;
    const roughnessCanvas = document.createElement("canvas");
    roughnessCanvas.width = 1024;
    roughnessCanvas.height = 512;
    const nightCanvas = document.createElement("canvas");
    nightCanvas.width = 1024;
    nightCanvas.height = 512;
    const cloudCanvas = document.createElement("canvas");
    cloudCanvas.width = 512;
    cloudCanvas.height = 256;

    const earthTexture = new THREE.CanvasTexture(earthCanvas);
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = 4;
    const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
    const nightTexture = new THREE.CanvasTexture(nightCanvas);
    const cloudTexture = new THREE.CanvasTexture(cloudCanvas);

    const atlasCountries = feature(
      worldAtlas as unknown as Parameters<typeof feature>[0],
      (worldAtlas as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects
        .countries
    ) as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry, { name?: string }>;

    // Build 1024x512 Country ID Pick Buffer once for universal 130-country hover/click selection
    const pickWidth = 1024;
    const pickHeight = 512;
    const pickCanvas = document.createElement("canvas");
    pickCanvas.width = pickWidth;
    pickCanvas.height = pickHeight;
    const pickIndexToEntry: (PickCountryEntry | null)[] = [null];
    let pickBuffer = new Uint8ClampedArray(pickWidth * pickHeight * 4);
    const pCtx = pickCanvas.getContext("2d", { willReadFrequently: true });
    if (pCtx) {
      pCtx.imageSmoothingEnabled = false;
      pCtx.fillStyle = "rgb(0, 0, 0)";
      pCtx.fillRect(0, 0, pickWidth, pickHeight);
      const pickProjection = geoEquirectangular().fitExtent(
        [
          [0, 0],
          [pickWidth, pickHeight],
        ],
        { type: "Sphere" }
      );
      const pickPath = geoPath(pickProjection, pCtx);
      let nextIdx = 1;
      for (const feat of atlasCountries.features) {
        const numId = String(feat.id ?? "").padStart(3, "0");
        const iso3 = NUMERIC_TO_ISO3[numId];
        if (!iso3) continue;
        const idx = nextIdx++;
        pickIndexToEntry[idx] = {
          iso3,
          numId,
          name: feat.properties?.name || iso3,
        };
        const r = idx & 255;
        const g = (idx >> 8) & 255;
        pCtx.beginPath();
        pickPath(feat);
        pCtx.fillStyle = `rgb(${r}, ${g}, 255)`;
        pCtx.fill();
      }
      pickBuffer = pCtx.getImageData(0, 0, pickWidth, pickHeight).data;
    }

    const sunUniforms = {
      uSunDirection: { value: new THREE.Vector3(1, 0.35, 0.5).normalize() },
      uCityLightsEnabled: { value: 1.0 },
      uIsLightMode: { value: 0.0 },
    };

    const sphereGeo = new THREE.SphereGeometry(1, 64, 64);
    const sphereMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughnessMap: roughnessTexture,
      roughness: 1.0,
      metalness: 0.18,
      emissive: new THREE.Color(0xffb347),
      emissiveMap: nightTexture,
      emissiveIntensity: 0.92,
    });
    sphereMat.customProgramCacheKey = () => "omnis-solar-terminator-v2";
    sphereMat.onBeforeCompile = (shader) => {
      shader.uniforms.uSunDirection = sunUniforms.uSunDirection;
      shader.uniforms.uCityLightsEnabled = sunUniforms.uCityLightsEnabled;
      shader.uniforms.uIsLightMode = sunUniforms.uIsLightMode;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
varying vec3 vWorldNormal;`
        )
        .replace(
          "#include <worldpos_vertex>",
          `#include <worldpos_vertex>
vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
uniform vec3 uSunDirection;
uniform float uCityLightsEnabled;
uniform float uIsLightMode;
varying vec3 vWorldNormal;`
        )
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
float omnisLightDot = dot(normalize(vWorldNormal), normalize(uSunDirection));
float omnisDayFactor = clamp((omnisLightDot + 0.22) / 0.57, 0.0, 1.0);
if (uIsLightMode > 0.5 && omnisDayFactor < 0.999) {
  vec3 twilightTint = mix(vec3(0.18, 0.24, 0.35), vec3(1.0), smoothstep(0.0, 0.35, omnisDayFactor));
  diffuseColor.rgb *= mix(twilightTint, vec3(1.0), 0.18);
}`
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
float omnisSunDot = dot(normalize(vWorldNormal), normalize(uSunDirection));
float omnisNightMask = smoothstep(0.18, -0.22, omnisSunDot);
totalEmissiveRadiance *= omnisNightMask * uCityLightsEnabled;`
        );
    };
    const earthMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(earthMesh);

    const cloudGeo = new THREE.SphereGeometry(1.014, 48, 48);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    globeGroup.add(cloudMesh);

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
        glowColor: { value: new THREE.Color(0x3b82f6) },
        intensityFactor: { value: 0.92 },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);

    const starsGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(360 * 3);
    for (let i = 0; i < 360; i++) {
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
    const starsMat = new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 0.045,
      transparent: true,
      opacity: 0.55,
    });
    const starsPoints = new THREE.Points(starsGeo, starsMat);
    scene.add(starsPoints);

    const markersGroup = new THREE.Group();
    const arcsGroup = new THREE.Group();
    globeGroup.add(markersGroup);
    globeGroup.add(arcsGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.62);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.75);
    scene.add(sunLight);
    const rimLight = new THREE.DirectionalLight(0x3b82f6, 0.55);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    const handle: GlobeSceneHandle = {
      earthCanvas,
      earthTexture,
      roughnessCanvas,
      roughnessTexture,
      nightCanvas,
      nightTexture,
      cloudCanvas,
      cloudTexture,
      sphereMat,
      cloudMat,
      atmosMat,
      starsPoints,
      ambientLight,
      sunLight,
      rimLight,
      globeGroup,
      markersGroup,
      arcsGroup,
      atlasCountries,
      pickBuffer,
      pickWidth,
      pickHeight,
      pickIndexToEntry,
      sunUniforms,
    };
    sceneHandleRef.current = handle;

    const scratchEuler = new THREE.Euler(0, 0, 0, "XYZ");
    const scratchQuat = new THREE.Quaternion();
    let animFrameId = 0;
    let clockTime = 0;
    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const motionIdle = reducedMotionRef.current || motionPausedRef.current;
      clockTime += motionIdle ? 0 : 0.004;

      let cameraFlightLift = 0;
      if (targetQuatRef.current && !isDraggingRef.current) {
        const angleRemaining = globeGroup.quaternion.angleTo(targetQuatRef.current);
        globeGroup.quaternion.slerp(targetQuatRef.current, 0.085);
        scratchEuler.setFromQuaternion(globeGroup.quaternion, "XYZ");
        rotationRef.current.x = scratchEuler.x;
        rotationRef.current.y = scratchEuler.y;
        const totalAngle = flightTotalAngleRef.current;
        if (totalAngle > 0.15) {
          const flightProgress = Math.max(0, Math.min(1, 1 - angleRemaining / totalAngle));
          cameraFlightLift = Math.sin(flightProgress * Math.PI) * 0.24;
        }
        if (angleRemaining < 0.003) {
          globeGroup.quaternion.copy(targetQuatRef.current);
          scratchEuler.setFromQuaternion(globeGroup.quaternion, "XYZ");
          rotationRef.current.x = scratchEuler.x;
          rotationRef.current.y = scratchEuler.y;
          targetQuatRef.current = null;
          flightTotalAngleRef.current = 0;
        }
      } else {
        if (autoRotateRef.current && !isDraggingRef.current && !motionIdle) {
          rotationRef.current.y += 0.0014;
        }
        scratchEuler.set(rotationRef.current.x, rotationRef.current.y, 0, "XYZ");
        scratchQuat.setFromEuler(scratchEuler);
        globeGroup.quaternion.copy(scratchQuat);
      }

      zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.12;
      cloudMesh.rotation.y = clockTime * 0.18;
      camera.position.z = zoomRef.current + cameraFlightLift;

      const rad = (lightAngleRef.current * Math.PI) / 180;
      sunLight.position.set(Math.cos(rad) * 5, 1.9, Math.sin(rad) * 5);
      sunUniforms.uSunDirection.value.copy(sunLight.position).normalize();

      for (const p of arcPulsesRef.current) {
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
      const nextDpr = Math.min(window.devicePixelRatio || 1, w < 768 ? 1.5 : 2);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(nextDpr);
      renderer.setSize(w, h);
      setStageDims({ width: w, height: h });
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);
    window.addEventListener("resize", handleResize);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const samplePickBufferAtUv = (uv: THREE.Vector2): PickCountryEntry | null => {
      const px = Math.max(0, Math.min(pickWidth - 1, Math.floor(uv.x * pickWidth)));
      const py = Math.max(0, Math.min(pickHeight - 1, Math.floor((1 - uv.y) * pickHeight)));
      const offset = (py * pickWidth + px) * 4;
      const b = pickBuffer[offset + 2];
      if (b < 245) return null; // Reject ocean background and anti-aliased edge blends
      const idx = pickBuffer[offset] | (pickBuffer[offset + 1] << 8);
      if (idx <= 0 || idx >= pickIndexToEntry.length) return null;
      return pickIndexToEntry[idx] ?? null;
    };

    const setHoveredIsoAndRepaint = (nextIso3: string | null) => {
      if (hoveredIso3Ref.current === nextIso3) return;
      hoveredIso3Ref.current = nextIso3;
      const currentHandle = sceneHandleRef.current;
      if (currentHandle) {
        paintEarthSurfaceAndAtmosphere(
          currentHandle,
          themeRef.current,
          selectedIso3Ref.current,
          nextIso3
        );
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      engagedRef.current = true;
      isDraggingRef.current = true;
      targetQuatRef.current = null;
      flightTotalAngleRef.current = 0;
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (isDraggingRef.current) {
        const dx = e.clientX - prevMouseRef.current.x;
        const dy = e.clientY - prevMouseRef.current.y;
        rotationRef.current.y += dx * 0.0055;
        rotationRef.current.x = Math.max(
          -1.05,
          Math.min(1.05, rotationRef.current.x + dy * 0.0055)
        );
        prevMouseRef.current = { x: e.clientX, y: e.clientY };
        setHoveredCountry(null);
        setHoveredIsoAndRepaint(null);
        return;
      }

      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(hitMeshesRef.current);
      const hit = hits.find((h) => h.object.userData?.iso3);
      if (hit) {
        setHoveredCountry({
          name: hit.object.userData.name,
          metric: hit.object.userData.metric,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        setHoveredIsoAndRepaint(hit.object.userData.iso3);
        renderer.domElement.style.cursor = "pointer";
        return;
      }

      // Universal 130-country surface raycast fallback using Country ID Pick Buffer
      const earthHits = raycaster.intersectObject(earthMesh, false);
      const surfaceHit = earthHits[0];
      const picked = surfaceHit?.uv ? samplePickBufferAtUv(surfaceHit.uv) : null;
      if (picked) {
        const matchedProfile = countriesRef.current.find((c) => c.iso3 === picked.iso3);
        const layerMeta = matchedProfile
          ? getLayerMetricForCountry(matchedProfile, activeLayerRef.current)
          : null;
        setHoveredCountry({
          name: matchedProfile ? `${matchedProfile.flagEmoji} ${matchedProfile.name}` : `${picked.name} (${picked.iso3})`,
          metric: layerMeta ? layerMeta.value : `Sovereign Dossier • Click to inspect ${picked.iso3}`,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        setHoveredIsoAndRepaint(picked.iso3);
        renderer.domElement.style.cursor = "pointer";
      } else {
        setHoveredCountry(null);
        setHoveredIsoAndRepaint(null);
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
        const hits = raycaster.intersectObjects(hitMeshesRef.current);
        const hitWithIso = hits.find((h) => h.object.userData?.iso3);
        if (hitWithIso?.object.userData?.iso3) {
          onSelectCountryRef.current(hitWithIso.object.userData.iso3);
          return;
        }
        const earthHits = raycaster.intersectObject(earthMesh, false);
        const picked = earthHits[0]?.uv ? samplePickBufferAtUv(earthHits[0].uv) : null;
        if (picked?.iso3) {
          onSelectCountryRef.current(picked.iso3);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      const canZoom =
        wheelZoomModeRef.current === "always" ||
        engagedRef.current ||
        isFullscreenRef.current ||
        e.ctrlKey ||
        e.metaKey;
      if (!canZoom) return;
      e.preventDefault();
      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Number((targetZoomRef.current + e.deltaY * 0.0018).toFixed(2)))
      );
      targetZoomRef.current = nextZoom;
      setZoomDistance(nextZoom);
    };

    const domElem = renderer.domElement;
    domElem.addEventListener("pointerdown", onPointerDown);
    domElem.addEventListener("pointermove", onPointerMove);
    domElem.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      sceneHandleRef.current = null;
      cancelAnimationFrame(animFrameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
      domElem.removeEventListener("pointerdown", onPointerDown);
      domElem.removeEventListener("pointermove", onPointerMove);
      domElem.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerup", onPointerUp);
      disposeGroupChildren(markersGroup);
      disposeGroupChildren(arcsGroup);
      hitMeshesRef.current = [];
      arcPulsesRef.current = [];
      sphereGeo.dispose();
      sphereMat.dispose();
      earthTexture.dispose();
      roughnessTexture.dispose();
      nightTexture.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      cloudTexture.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      starsGeo.dispose();
      starsMat.dispose();
      renderer.dispose();
    };
  }, []);

  // Lifecycle Effect B: Re-rasterize textures & materials in-place on theme or selected country change
  useEffect(() => {
    const handle = sceneHandleRef.current;
    if (!handle) return;
    paintEarthSurfaceAndAtmosphere(handle, theme, selectedIso3);
  }, [theme, selectedIso3, paintEarthSurfaceAndAtmosphere]);

  // Lifecycle Effect C: Rebuild data markers & great-circle arcs with explicit GPU disposal
  useEffect(() => {
    const handle = sceneHandleRef.current;
    if (!handle) return;
    const isLight = theme === "light";
    const { markersGroup, arcsGroup } = handle;

    disposeGroupChildren(markersGroup);
    disposeGroupChildren(arcsGroup);

    const newHits: THREE.Mesh[] = [];
    for (const c of countries) {
      const layerMeta = getLayerMetricForCountry(c, activeLayer);
      const isSelected = c.iso3 === selectedIso3;
      const basePos = latLngToVector3(c.lat, c.lng, 1.005);
      const topPos = latLngToVector3(
        c.lat,
        c.lng,
        1.018 + (isSelected ? 0.05 : 0.025 * layerMeta.numericWeight)
      );

      const spireGeo = new THREE.BufferGeometry().setFromPoints([basePos, topPos]);
      const spireMat = new THREE.LineBasicMaterial({
        color: isSelected ? (isLight ? 0x1d4ed8 : 0x38bdf8) : layerMeta.colorHex,
        transparent: true,
        opacity: isSelected ? 0.95 : 0.72,
      });
      markersGroup.add(new THREE.Line(spireGeo, spireMat));

      const markerGeo = new THREE.SphereGeometry(isSelected ? 0.028 : 0.019, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({
        color: isSelected ? (isLight ? 0x1d4ed8 : 0x7dd3fc) : layerMeta.colorHex,
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(topPos);
      marker.userData = { iso3: c.iso3, name: c.name, metric: layerMeta.value };
      markersGroup.add(marker);
      newHits.push(marker);

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
    hitMeshesRef.current = newHits;

    const newPulses: { curve: THREE.QuadraticBezierCurve3; mesh: THREE.Mesh; offset: number }[] = [];
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
        arcsGroup.add(new THREE.Line(lineGeo, lineMat));

        const pulseGeo = new THREE.SphereGeometry(0.011, 8, 8);
        const pulseMat = new THREE.MeshBasicMaterial({
          color: isLight ? 0x1d4ed8 : 0x93c5fd,
        });
        const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
        arcsGroup.add(pulseMesh);
        newPulses.push({ curve, mesh: pulseMesh, offset: (idx * 0.19) % 1 });
        idx += 1;
      }
    }
    arcPulsesRef.current = newPulses;
  }, [countries, selectedIso3, activeLayer, selectedCountry, theme]);

  const activeLayerMeta = selectedCountry
    ? getLayerMetricForCountry(selectedCountry, activeLayer)
    : null;

  const tooltipLeft = hoveredCountry
    ? Math.max(12, Math.min(hoveredCountry.x + 14, Math.max(16, stageDims.width - 210)))
    : 12;
  const tooltipTop = hoveredCountry
    ? Math.max(12, Math.min(hoveredCountry.y - 38, Math.max(16, stageDims.height - 72)))
    : 12;

  const handleResetView = () => {
    setZoomDistance(DEFAULT_ZOOM);
    const target = countries.find((c) => c.iso3 === selectedIso3);
    if (target) {
      const nextX = Math.max(-0.85, Math.min(0.85, (target.lat * Math.PI) / 180 * 0.65));
      const rawY = -((target.lng + 90) * Math.PI) / 180;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(nextX, rawY, 0, "XYZ"));
      targetQuatRef.current = q;
      const handle = sceneHandleRef.current;
      flightTotalAngleRef.current = handle ? handle.globeGroup.quaternion.angleTo(q) : 0.8;
    }
  };

  return (
    <div
      ref={stageRef}
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

      {hoveredCountry ? (
        <div
          className="pointer-events-none absolute z-20 max-w-[216px] omnis-hud-pill px-2.5 py-1.5 rounded-lg text-xs"
          style={{ left: tooltipLeft, top: tooltipTop }}
        >
          <div className="font-bold text-[var(--text-primary)] truncate">{hoveredCountry.name}</div>
          <div className="text-[10px] tone-blue omnis-mono omnis-tabular truncate">
            {hoveredCountry.metric}
          </div>
        </div>
      ) : null}

      {/* Top HUD Bar */}
      <div className="absolute top-2.5 sm:top-3.5 inset-x-2.5 sm:inset-x-3.5 flex items-start justify-between gap-2 pointer-events-none">
        <div className="min-w-0 max-w-[168px] sm:max-w-[260px] omnis-hud-pill px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider tone-blue omnis-mono truncate">
            <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">Layer: {activeLayer}</span>
          </div>
          {selectedCountry && activeLayerMeta ? (
            <div className="text-xs space-y-0.5 min-w-0">
              <div className="font-bold text-[var(--text-primary)] flex items-center gap-1 truncate">
                <span className="shrink-0">{selectedCountry.flagEmoji}</span>
                <span className="truncate">{selectedCountry.name}</span>
                <span className="text-[10px] omnis-mono text-[var(--text-muted)] shrink-0">
                  ({selectedCountry.iso3})
                </span>
              </div>
              <div className="text-[10.5px] sm:text-[11px] text-[var(--text-secondary)] omnis-mono omnis-tabular truncate">
                {activeLayerMeta.value}
              </div>
              {!compact ? (
                <div className="hidden sm:flex text-[10px] text-[var(--text-muted)] items-center gap-1 truncate omnis-tabular">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {selectedCountry.capital} • Pop {(selectedCountry.population / 1e6).toFixed(0)}M
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="pointer-events-auto shrink-0 flex flex-wrap justify-end items-center gap-0.5 sm:gap-1 omnis-hud-pill p-1 sm:p-1.5 rounded-xl text-xs max-w-[58%] sm:max-w-none">
          <button
            type="button"
            onClick={() => setAutoRotate((prev) => !prev)}
            title={autoRotate ? "Pause Orbital Rotation" : "Resume Orbital Rotation"}
            aria-label={autoRotate ? "Pause Orbital Rotation" : "Resume Orbital Rotation"}
            className="min-h-[38px] min-w-[38px] sm:min-h-[34px] sm:min-w-[34px] inline-flex items-center justify-center rounded-md hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() =>
              setZoomDistance((z) => Math.max(MIN_ZOOM, Number((z - 0.25).toFixed(2))))
            }
            title="Zoom In"
            aria-label="Zoom In"
            className="min-h-[38px] min-w-[38px] sm:min-h-[34px] sm:min-w-[34px] inline-flex items-center justify-center rounded-md hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setZoomDistance((z) => Math.min(MAX_ZOOM, Number((z + 0.25).toFixed(2))))
            }
            title="Zoom Out"
            aria-label="Zoom Out"
            className="min-h-[38px] min-w-[38px] sm:min-h-[34px] sm:min-w-[34px] inline-flex items-center justify-center rounded-md hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 px-1 sm:px-2 py-0.5 rounded-lg bg-[var(--bg-slate)]/75 border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                setDayLightAngle((a) => (a + 45) % 360);
                setUtcScrubberOpen((prev) => !prev);
              }}
              title="Orbital UTC Solar Terminator Time (Click to cycle / scrub)"
              aria-label="Orbital UTC Solar Terminator Scrubber"
              className="min-h-[38px] sm:min-h-[30px] inline-flex items-center gap-1 px-1 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
            >
              <Sun className="w-3.5 h-3.5 tone-warning shrink-0" />
              <span className="text-[10.5px] omnis-mono omnis-tabular font-semibold whitespace-nowrap">
                {(() => {
                  const totalMins = Math.round((((dayLightAngle % 360) + 360) % 360) * 4) % 1440;
                  const hh = String(Math.floor(totalMins / 60)).padStart(2, "0");
                  const mm = String(totalMins % 60).padStart(2, "0");
                  return `${hh}:${mm} UTC`;
                })()}
              </span>
            </button>
            <input
              type="range"
              min={0}
              max={360}
              step={5}
              value={dayLightAngle}
              onChange={(e) => setDayLightAngle(Number(e.target.value))}
              aria-label="Orbital UTC Time Angle"
              title={`Solar longitude angle: ${dayLightAngle}°`}
              className={`${
                utcScrubberOpen ? "block w-20" : "hidden md:block w-16 lg:w-20"
              } h-1.5 cursor-pointer`}
            />
          </div>
          <button
            type="button"
            onClick={handleResetView}
            title="Reset View"
            aria-label="Reset View"
            className="min-h-[38px] min-w-[38px] sm:min-h-[34px] sm:min-w-[34px] inline-flex items-center justify-center rounded-md hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Globe"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen Globe"}
            className="min-h-[38px] min-w-[38px] sm:min-h-[34px] sm:min-w-[34px] inline-flex items-center justify-center rounded-md hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Bottom Interactive Country Coordinate Selector Rail with Scroll Affordances */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1 py-1.5 px-1.5 rounded-xl omnis-hud-pill">
        {railScrollState.left ? (
          <button
            type="button"
            onClick={() => railRef.current?.scrollBy({ left: -200, behavior: "smooth" })}
            aria-label="Scroll countries left"
            className="shrink-0 min-h-[40px] min-w-[40px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        ) : null}

        <div
          ref={railRef}
          onScroll={updateRailScrollState}
          className={`flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto px-0.5 ${
            railScrollState.left && railScrollState.right
              ? "[mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-20px),transparent)]"
              : railScrollState.right
                ? "[mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]"
                : railScrollState.left
                  ? "[mask-image:linear-gradient(to_right,transparent,black_24px)]"
                  : ""
          }`}
        >
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
                <span className="text-[10px] opacity-85 omnis-mono omnis-tabular hidden md:inline">
                  {layerInfo.value.split("•")[0].trim()}
                </span>
              </button>
            );
          })}
        </div>

        {railScrollState.right ? (
          <button
            type="button"
            onClick={() => railRef.current?.scrollBy({ left: 200, behavior: "smooth" })}
            aria-label="Scroll countries right"
            className="shrink-0 min-h-[40px] min-w-[40px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
