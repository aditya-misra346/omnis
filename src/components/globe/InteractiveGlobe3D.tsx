"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { geoCentroid, geoEquirectangular, geoGraticule10, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import {
  RotateCcw,
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
import {
  ISO3_TO_NUMERIC,
  NUMERIC_TO_ISO3,
  buildPlaceholderCountryProfile,
} from "@/lib/data/world-catalog";
import { applyOfficialSurveyOfIndiaBoundaries } from "@/lib/data/india-soi-official";
import {
  formatPopulationHuman,
  formatSignedPct,
  formatSignedValue,
  getEffectiveGdpUsdBn,
  hasEnergyProfileData,
  hasSectorMetricValue,
} from "@/lib/formatters";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import { dateFromUtcMinutes, getSunVectorInEarthFrame } from "@/lib/solarTime";
import { CountrySolarClockBadge, SolarSyncHudControl } from "@/components/solar/SolarBadges";
import { useFullscreenBodyLock } from "@/components/ui/OmnisPrimitives";
import type { CountryIntelligenceProfile, IntelligenceLayerId } from "@/types/omnis";

const MIN_ZOOM = 1.85;
const MAX_ZOOM = 4.1;
const DEFAULT_ZOOM = 2.68;
const SCRATCH_SUN_VEC = new THREE.Vector3();

interface PickCountryEntry {
  iso3: string;
  numId: string;
  name: string;
}

const CITY_NIGHT_CLUSTERS: [number, number, number][] = [
  [28.61, 77.2, 1.0],
  [19.07, 72.87, 1.0],
  [12.97, 77.59, 0.92],
  [22.57, 88.36, 0.88],
  [13.08, 80.27, 0.88],
  [17.38, 78.48, 0.9],
  [23.02, 72.57, 0.86],
  [18.52, 73.85, 0.84],
  [26.91, 75.78, 0.8],
  [26.84, 80.94, 0.82],
  [9.93, 76.26, 0.78],
  [26.14, 91.73, 0.76],
  [34.08, 74.79, 0.78],
  [40.71, -74.0, 1.0],
  [34.05, -118.24, 0.95],
  [41.87, -87.62, 0.85],
  [37.77, -122.41, 0.85],
  [29.76, -95.36, 0.85],
  [43.65, -79.38, 0.85],
  [19.43, -99.13, 0.9],
  [51.5, -0.12, 1.0],
  [48.85, 2.35, 0.95],
  [52.52, 13.4, 0.9],
  [50.11, 8.68, 0.85],
  [45.46, 9.19, 0.8],
  [40.41, -3.7, 0.85],
  [41.01, 28.97, 0.9],
  [35.67, 139.65, 1.0],
  [34.69, 135.5, 0.9],
  [39.9, 116.4, 1.0],
  [31.23, 121.47, 1.0],
  [22.54, 114.05, 0.95],
  [25.03, 121.56, 0.9],
  [37.56, 126.97, 0.95],
  [13.75, 100.5, 0.85],
  [3.13, 101.68, 0.8],
  [1.35, 103.82, 0.95],
  [-6.2, 106.84, 0.9],
  [-23.55, -46.63, 0.95],
  [-22.9, -43.17, 0.85],
  [-33.86, 151.2, 0.85],
  [30.04, 31.23, 0.9],
  [25.2, 55.27, 0.85],
  [24.71, 46.67, 0.85],
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

function latLngToGlobeAngles(lat: number, lng: number): { x: number; y: number } {
  // Pitch by full latitude + 3.5° downward optical framing offset so northern crowns clear the top HUD bar
  const opticalLat = lat + 3.5;
  const x = Math.max(-0.95, Math.min(0.95, (opticalLat * Math.PI) / 180));
  const y = -((lng + 90) * Math.PI) / 180;
  return { x, y };
}

function shortestAngleDelta(fromRad: number, toRad: number): number {
  return Math.atan2(Math.sin(toRad - fromRad), Math.cos(toRad - fromRad));
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
  const effectiveGdp = getEffectiveGdpUsdBn(country);
  switch (layer) {
    case "economics":
      return {
        label: "Nominal GDP",
        value:
          effectiveGdp !== null
            ? `$${effectiveGdp.toLocaleString()}B (${formatSignedPct(country.gdpGrowthPct)})`
            : "GDP N/A",
        numericWeight: Math.min(1.65, Math.max(0.7, Math.log10(Math.max(10, effectiveGdp ?? 10)) / 2.6)),
        colorHex: 0x3b82f6,
        cssColor: "#3b82f6",
      };
    case "demographics": {
      const popLabel = country.population > 0 ? `${(country.population / 1e6).toFixed(1)}M` : "Pop N/A";
      const lifeExp = hasSectorMetricValue(country, country.lifeExpectancyYears)
        ? `${country.lifeExpectancyYears}y`
        : "N/A";
      return {
        label: "Population",
        value: `${popLabel} • Life Exp ${lifeExp}`,
        numericWeight: Math.min(1.65, Math.max(0.7, country.population / 5e8)),
        colorHex: 0x8b5cf6,
        cssColor: "#8b5cf6",
      };
    }
    case "energy":
      return {
        label: "Clean Grid Share",
        value: hasEnergyProfileData(country)
          ? `${country.energyProfile.renewableSharePct}% Clean • ${country.energyProfile.electricityGenerationTwh} TWh`
          : "Energy N/A",
        numericWeight: Math.min(
          1.65,
          Math.max(0.7, hasEnergyProfileData(country) ? country.energyProfile.renewableSharePct / 45 : 0.7)
        ),
        colorHex: 0x10b981,
        cssColor: "#10b981",
      };
    case "environment":
      return {
        label: "Temp Anomaly & CO₂",
        value: hasSectorMetricValue(country, country.environmentProfile.co2PerCapitaTons)
          ? `${formatSignedValue(country.environmentProfile.tempAnomalyC, "°C")} • ${country.environmentProfile.co2PerCapitaTons}t/cap`
          : "Emissions N/A",
        numericWeight: Math.min(1.65, Math.max(0.7, country.environmentProfile.tempAnomalyC)),
        colorHex: 0xf59e0b,
        cssColor: "#f59e0b",
      };
    case "technology":
      return {
        label: "AI & R&D Index",
        value: hasSectorMetricValue(country, country.technologyProfile.aiReadinessIndex)
          ? `AI ${country.technologyProfile.aiReadinessIndex} • R&D ${country.technologyProfile.rdSpendPctGdp}% GDP`
          : "Tech Index N/A",
        numericWeight: Math.min(
          1.65,
          Math.max(0.7, hasSectorMetricValue(country, country.technologyProfile.aiReadinessIndex) ? country.technologyProfile.aiReadinessIndex / 65 : 0.7)
        ),
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
        value: `${country.areaSqKm > 0 ? `${(country.areaSqKm / 1000).toFixed(0)}k km²` : "Area N/A"} • Capital: ${country.capital}`,
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
  bordersGroup: THREE.Group;
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
  const railButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { theme, motionPaused } = useOmnisStore();

  const [autoRotate, setAutoRotate] = useState(true);
  const [scrubUtcMinutes, setScrubUtcMinutes] = useState<number | null>(null);
  const [utcScrubberOpen, setUtcScrubberOpen] = useState(false);
  const [zoomDistance, setZoomDistance] = useState(DEFAULT_ZOOM);
  const [webglSupported, setWebglSupported] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchOrbitLocked, setTouchOrbitLocked] = useState(false);
  const [railScrollState, setRailScrollState] = useState({ left: false, right: false });
  const [stageDims, setStageDims] = useState({ width: 720, height: 480 });
  const [hoveredCountry, setHoveredCountry] = useState<{
    iso3: string;
    name: string;
    metric: string;
    x: number;
    y: number;
  } | null>(null);

  const geoCentroids = useMemo(() => {
    const atlas = applyOfficialSurveyOfIndiaBoundaries(
      feature(
        worldAtlas as unknown as Parameters<typeof feature>[0],
        (worldAtlas as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects
          .countries
      ) as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry, { name?: string }>
    );
    const map: Record<string, { lat: number; lng: number; name: string }> = {};
    for (const feat of atlas.features) {
      const numId = String(feat.id ?? "").padStart(3, "0");
      const iso3 = NUMERIC_TO_ISO3[numId];
      if (!iso3) continue;
      const [lng, lat] = geoCentroid(feat);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        map[iso3] = { lat, lng, name: feat.properties?.name || iso3 };
      }
    }
    return map;
  }, []);

  const initialTarget =
    countries.find((c) => c.iso3 === selectedIso3) ??
    geoCentroids[selectedIso3] ??
    { lat: 20.5937, lng: 78.9629 };
  const initialGlobeAngles = latLngToGlobeAngles(initialTarget.lat, initialTarget.lng);

  const rotationRef = useRef({ x: initialGlobeAngles.x, y: initialGlobeAngles.y });
  const flightTargetRef = useRef<{ x: number; y: number; totalAngle: number } | null>(null);
  const flightTotalAngleRef = useRef(0);
  const lastFlownIsoRef = useRef<string | null>(selectedIso3);
  const dragVelocityRef = useRef({ x: 0, y: 0 });
  const idleSpinBlendRef = useRef(1);
  const clockTimeRef = useRef(0);
  const lastPointerMoveTimeRef = useRef(0);
  const isDraggingRef = useRef(false);
  const engagedRef = useRef(false);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const autoRotateRef = useRef(autoRotate);
  const zoomRef = useRef(zoomDistance);
  const targetZoomRef = useRef(zoomDistance);
  const solarModeRef = useRef<"live" | "scrub">("live");
  const scrubMinutesRef = useRef(720);
  const reducedMotionRef = useRef(false);
  const motionPausedRef = useRef(motionPaused);
  const wheelZoomModeRef = useRef(wheelZoomMode);
  const isFullscreenRef = useRef(isFullscreen);
  const touchOrbitLockedRef = useRef(false);
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

  useEffect(() => {
    themeRef.current = theme;
    selectedIso3Ref.current = selectedIso3;
    activeLayerRef.current = activeLayer;
    countriesRef.current = countries;
  }, [theme, selectedIso3, activeLayer, countries]);

  const matchedCountry = useMemo(
    () => countries.find((c) => c.iso3 === selectedIso3) ?? null,
    [countries, selectedIso3]
  );

  const selectedCountry = useMemo(
    () => matchedCountry ?? (geoCentroids[selectedIso3] ? null : countries[0]),
    [matchedCountry, geoCentroids, selectedIso3, countries]
  );

  const selectedCoords = useMemo(() => {
    if (matchedCountry) return { iso3: matchedCountry.iso3, lat: matchedCountry.lat, lng: matchedCountry.lng };
    const centroid = geoCentroids[selectedIso3];
    if (centroid) return { iso3: selectedIso3, lat: centroid.lat, lng: centroid.lng };
    const fallback = countries[0];
    return fallback ? { iso3: fallback.iso3, lat: fallback.lat, lng: fallback.lng } : null;
  }, [matchedCountry, geoCentroids, selectedIso3, countries]);

  const focusGlobeOnCoords = useCallback((lat: number, lng: number) => {
    const nextAngles = latLngToGlobeAngles(lat, lng);
    const deltaY = shortestAngleDelta(rotationRef.current.y, nextAngles.y);
    const continuousTargetY = rotationRef.current.y + deltaY;
    const totalAngle = Math.hypot(nextAngles.x - rotationRef.current.x, deltaY);
    flightTargetRef.current = {
      x: nextAngles.x,
      y: continuousTargetY,
      totalAngle,
    };
    flightTotalAngleRef.current = totalAngle;
    dragVelocityRef.current.x = 0;
    dragVelocityRef.current.y = 0;
    idleSpinBlendRef.current = 0;
  }, []);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) {
      reducedMotionRef.current = true;
      const timer = window.setTimeout(() => setAutoRotate(false), 0);
      return () => window.clearTimeout(timer);
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

  const scrubOverrideDate = useMemo(
    () => (scrubUtcMinutes !== null ? dateFromUtcMinutes(scrubUtcMinutes) : null),
    [scrubUtcMinutes]
  );

  useEffect(() => {
    wheelZoomModeRef.current = wheelZoomMode;
  }, [wheelZoomMode]);

  useEffect(() => {
    isFullscreenRef.current = isFullscreen;
    touchOrbitLockedRef.current = touchOrbitLocked || isFullscreen;
  }, [isFullscreen, touchOrbitLocked]);

  useFullscreenBodyLock(isFullscreen, () => setIsFullscreen(false));

  useEffect(() => {
    onSelectCountryRef.current = onSelectCountry;
  }, [onSelectCountry]);

  useEffect(() => {
    if (!selectedIso3) {
      lastFlownIsoRef.current = null;
      return;
    }
    const target =
      countriesRef.current.find((c) => c.iso3 === selectedIso3) ??
      geoCentroids[selectedIso3];
    if (!target) return;
    if (lastFlownIsoRef.current === selectedIso3) return;
    lastFlownIsoRef.current = selectedIso3;
    focusGlobeOnCoords(target.lat, target.lng);
  }, [selectedIso3, geoCentroids, focusGlobeOnCoords]);

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
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        pathGen(geoGraticule10());
        ctx.strokeStyle = isLight ? "rgba(29, 78, 216, 0.12)" : "rgba(96, 165, 250, 0.14)";
        ctx.lineWidth = 1.6;
        ctx.stroke();

        const selectedNumId = ISO3_TO_NUMERIC[currentSelectedIso3];
        const hoveredNumId = currentHoveredIso3 ? ISO3_TO_NUMERIC[currentHoveredIso3] : undefined;
        let targetFeat: GeoJSON.Feature<GeoJSON.Geometry, { name?: string }> | null = null;
        let hoveredFeat: GeoJSON.Feature<GeoJSON.Geometry, { name?: string }> | null = null;

        // Pass 1: Render all base sovereign landmasses and borders
        for (const feat of atlasCountries.features) {
          const featId = String(feat.id ?? "").padStart(3, "0");
          const isTarget = Boolean(selectedNumId && featId === selectedNumId);
          const isHovered = Boolean(hoveredNumId && !isTarget && featId === hoveredNumId);
          if (isTarget) {
            targetFeat = feat;
            continue;
          }
          if (isHovered) {
            hoveredFeat = feat;
            continue;
          }
          ctx.beginPath();
          pathGen(feat);
          ctx.fillStyle = isLight ? "#F4F1EA" : "#10223b";
          ctx.fill();
          ctx.strokeStyle = isLight ? "rgba(71, 98, 128, 0.48)" : "rgba(125, 179, 252, 0.38)";
          ctx.lineWidth = 1.65;
          ctx.stroke();
        }

        // Pass 2: Render hovered country above base landmasses
        if (hoveredFeat) {
          ctx.beginPath();
          pathGen(hoveredFeat);
          ctx.fillStyle = isLight ? "rgba(29, 78, 216, 0.22)" : "rgba(96, 165, 250, 0.30)";
          ctx.fill();
          ctx.strokeStyle = isLight ? "#1D4ED8" : "#93C5FD";
          ctx.lineWidth = 3.0;
          ctx.stroke();
        }

        // Pass 3: Render selected sovereign country LAST on top of all neighbors with outer halo & crisp border
        if (targetFeat) {
          ctx.beginPath();
          pathGen(targetFeat);
          ctx.fillStyle = isLight ? "#1d4ed8" : "#2563eb";
          ctx.fill();

          ctx.strokeStyle = isLight ? "rgba(29, 78, 216, 0.32)" : "rgba(56, 189, 248, 0.44)";
          ctx.lineWidth = 6.5;
          ctx.stroke();

          ctx.strokeStyle = isLight ? "#ffffff" : "#bae6fd";
          ctx.lineWidth = 2.8;
          ctx.stroke();
        }
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
        for (let idx = 0; idx < CITY_NIGHT_CLUSTERS.length; idx++) {
          const [lat, lng, intensity] = CITY_NIGHT_CLUSTERS[idx];
          const px = ((lng + 180) / 360) * nightCanvas.width;
          const py = ((90 - lat) / 180) * nightCanvas.height;

          // Wide atmospheric metro bloom (subtle) + sharp illuminated urban core
          const haloRad = 9.0 * intensity;
          const halo = nightCtx.createRadialGradient(px, py, 0.5, px, py, haloRad);
          halo.addColorStop(0, `rgba(255, 240, 180, ${0.88 * intensity})`);
          halo.addColorStop(0.24, `rgba(251, 191, 36, ${0.42 * intensity})`);
          halo.addColorStop(0.6, `rgba(245, 158, 11, ${0.14 * intensity})`);
          halo.addColorStop(1, "rgba(0, 0, 0, 0)");
          nightCtx.fillStyle = halo;
          nightCtx.beginPath();
          nightCtx.arc(px, py, haloRad, 0, Math.PI * 2);
          nightCtx.fill();

          // Sharp white-gold city core pinpoint
          const coreRad = 2.6 * intensity;
          const core = nightCtx.createRadialGradient(px, py, 0, px, py, coreRad);
          core.addColorStop(0, `rgba(255, 250, 224, ${Math.min(1, 0.98 * intensity)})`);
          core.addColorStop(1, "rgba(255, 240, 180, 0)");
          nightCtx.fillStyle = core;
          nightCtx.beginPath();
          nightCtx.arc(px, py, coreRad, 0, Math.PI * 2);
          nightCtx.fill();

          // Deterministic satellite urban corridor sparks around each megacity
          for (let s = 1; s <= 5; s++) {
            const angle = idx * 1.9 + s * 1.27;
            const dist = (3.2 + (s % 3) * 2.4) * intensity;
            const sx = px + Math.cos(angle) * dist * 1.35;
            const sy = py + Math.sin(angle) * dist * 0.85;
            const sr = 1.65 * intensity;
            const sg = nightCtx.createRadialGradient(sx, sy, 0, sx, sy, sr);
            sg.addColorStop(0, `rgba(253, 224, 130, ${0.65 * intensity})`);
            sg.addColorStop(1, "rgba(0, 0, 0, 0)");
            nightCtx.fillStyle = sg;
            nightCtx.beginPath();
            nightCtx.arc(sx, sy, sr, 0, Math.PI * 2);
            nightCtx.fill();
          }
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
      window.setTimeout(() => setWebglSupported(false), 0);
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
    globeGroup.quaternion.setFromEuler(
      new THREE.Euler(rotationRef.current.x, rotationRef.current.y, 0, "XYZ")
    );
    scene.add(globeGroup);

    const earthCanvas = document.createElement("canvas");
    earthCanvas.width = 4096;
    earthCanvas.height = 2048;
    const roughnessCanvas = document.createElement("canvas");
    roughnessCanvas.width = 2048;
    roughnessCanvas.height = 1024;
    const nightCanvas = document.createElement("canvas");
    nightCanvas.width = 2048;
    nightCanvas.height = 1024;
    const cloudCanvas = document.createElement("canvas");
    cloudCanvas.width = 512;
    cloudCanvas.height = 256;

    const earthTexture = new THREE.CanvasTexture(earthCanvas);
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy() || 8);
    const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
    const nightTexture = new THREE.CanvasTexture(nightCanvas);
    const cloudTexture = new THREE.CanvasTexture(cloudCanvas);

    const atlasCountries = applyOfficialSurveyOfIndiaBoundaries(
      feature(
        worldAtlas as unknown as Parameters<typeof feature>[0],
        (worldAtlas as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects
          .countries
      ) as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry, { name?: string }>
    );

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
    sphereMat.customProgramCacheKey = () => "omnis-solar-terminator-v3";
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
float omnisDayFactor = smoothstep(-0.10, 0.16, omnisLightDot);
float omnisTwilightBand = smoothstep(-0.15, -0.01, omnisLightDot) * (1.0 - smoothstep(-0.01, 0.17, omnisLightDot));
if (uIsLightMode > 0.5) {
  vec3 nightTintLight = vec3(0.28, 0.36, 0.54);
  vec3 shadedLight = diffuseColor.rgb * mix(nightTintLight, vec3(1.0), 0.22 + 0.78 * omnisDayFactor);
  shadedLight = mix(shadedLight, shadedLight + vec3(0.22, 0.11, 0.03), omnisTwilightBand * 0.55);
  diffuseColor.rgb = shadedLight;
} else {
  vec3 nightTintDark = vec3(0.36, 0.44, 0.62);
  vec3 shadedDark = diffuseColor.rgb * mix(nightTintDark, vec3(1.0), omnisDayFactor);
  shadedDark = mix(shadedDark, shadedDark + vec3(0.18, 0.09, 0.02), omnisTwilightBand * 0.48);
  diffuseColor.rgb = shadedDark;
}`
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
float omnisSunDot = dot(normalize(vWorldNormal), normalize(uSunDirection));
float omnisEmissiveDay = smoothstep(-0.08, 0.14, omnisSunDot);
float omnisNightMask = pow(1.0 - omnisEmissiveDay, 1.65);
float omnisEmissiveGain = uIsLightMode > 0.5 ? 0.92 : 1.55;
totalEmissiveRadiance *= omnisNightMask * omnisEmissiveGain * uCityLightsEnabled;`
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
        varying vec3 vWorldNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        uniform vec3 glowColor;
        uniform float intensityFactor;
        uniform vec3 uSunDirection;
        uniform float uIsLightMode;
        void main() {
          float fresnel = pow(clamp(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.2), 3.2);
          float sunDot = dot(normalize(vWorldNormal), normalize(uSunDirection));
          float dayLimb = smoothstep(-0.22, 0.38, sunDot);
          float twilightLimb = exp(-pow(sunDot * 4.5, 2.0));
          vec3 twilightTint = uIsLightMode > 0.5 ? vec3(0.90, 0.48, 0.20) : vec3(0.98, 0.52, 0.22);
          vec3 limbColor = mix(glowColor * (0.24 + 0.76 * dayLimb), twilightTint, twilightLimb * 0.52);
          float limbGain = 0.35 + 0.65 * dayLimb + 0.28 * twilightLimb;
          gl_FragColor = vec4(limbColor, 1.0) * fresnel * intensityFactor * limbGain;
        }
      `,
      uniforms: {
        glowColor: { value: new THREE.Color(0x3b82f6) },
        intensityFactor: { value: 0.92 },
        uSunDirection: sunUniforms.uSunDirection,
        uIsLightMode: sunUniforms.uIsLightMode,
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

    const bordersGroup = new THREE.Group();
    const markersGroup = new THREE.Group();
    const arcsGroup = new THREE.Group();
    globeGroup.add(bordersGroup);
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
      bordersGroup,
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
    paintEarthSurfaceAndAtmosphere(handle, themeRef.current, selectedIso3Ref.current);

    const scratchEuler = new THREE.Euler(rotationRef.current.x, rotationRef.current.y, 0, "XYZ");
    let animFrameId = 0;
    let lastFrameTime = performance.now();
    let isViewportVisible = true;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        lastFrameTime = performance.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const intersectionObserver =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              if (entry) {
                isViewportVisible = entry.isIntersecting;
                if (entry.isIntersecting) {
                  lastFrameTime = performance.now();
                }
              }
            },
            { threshold: 0.02 }
          )
        : null;
    intersectionObserver?.observe(container);

    const animate = (now: number) => {
      animFrameId = requestAnimationFrame(animate);
      const rawDelta = Math.max(0.001, (now - lastFrameTime) / 1000);
      lastFrameTime = now;
      if (!isViewportVisible || document.visibilityState === "hidden") {
        return;
      }

      // Clamp frame delta at 50ms so texture/GeoJSON decode spikes NEVER jump the globe
      const dt = Math.min(rawDelta, 0.05);
      const motionIdle = reducedMotionRef.current || motionPausedRef.current;
      if (!motionIdle) {
        clockTimeRef.current += dt * 0.24;
      }
      const clockTime = clockTimeRef.current;

      let cameraFlightLift = 0;
      const activeFlight = flightTargetRef.current;
      if (activeFlight && !isDraggingRef.current) {
        const diffX = activeFlight.x - rotationRef.current.x;
        const diffY = activeFlight.y - rotationRef.current.y;
        const angleRemaining = Math.hypot(diffX, diffY);
        const flightAlpha = 1 - Math.exp(-6.0 * dt);
        rotationRef.current.x += diffX * flightAlpha;
        rotationRef.current.y += diffY * flightAlpha;

        const totalAngle = flightTotalAngleRef.current;
        if (totalAngle > 0.15) {
          const flightProgress = Math.max(0, Math.min(1, 1 - angleRemaining / totalAngle));
          cameraFlightLift = Math.sin(flightProgress * Math.PI) * 0.24;
        }
        if (angleRemaining < 0.002) {
          rotationRef.current.x = activeFlight.x;
          rotationRef.current.y = activeFlight.y;
          flightTargetRef.current = null;
          flightTotalAngleRef.current = 0;
        }
      } else {
        if (isDraggingRef.current) {
          idleSpinBlendRef.current = 0;
        } else {
          // Smooth damped pointer/touch drag inertia
          const inertiaSpeed = Math.hypot(dragVelocityRef.current.x, dragVelocityRef.current.y);
          if (inertiaSpeed > 0.001) {
            rotationRef.current.y += dragVelocityRef.current.y * dt;
            rotationRef.current.x = Math.max(
              -1.05,
              Math.min(1.05, rotationRef.current.x + dragVelocityRef.current.x * dt)
            );
            const damping = Math.exp(-6.5 * dt);
            dragVelocityRef.current.x *= damping;
            dragVelocityRef.current.y *= damping;
          } else {
            dragVelocityRef.current.x = 0;
            dragVelocityRef.current.y = 0;
          }

          // Smooth ~600ms handoff back to steady idle orbital spin (0.085 rad/s)
          const targetBlend = autoRotateRef.current && !motionIdle ? 1 : 0;
          idleSpinBlendRef.current +=
            (targetBlend - idleSpinBlendRef.current) * (1 - Math.exp(-3.5 * dt));
          const IDLE_SPIN_RAD_PER_SEC = 0.085;
          rotationRef.current.y += IDLE_SPIN_RAD_PER_SEC * idleSpinBlendRef.current * dt;
        }
      }

      // Unified orientation path: ALWAYS construct quaternion from (x, y, 0, "XYZ")
      scratchEuler.set(rotationRef.current.x, rotationRef.current.y, 0, "XYZ");
      globeGroup.quaternion.setFromEuler(scratchEuler);

      const zoomAlpha = 1 - Math.exp(-8.0 * dt);
      zoomRef.current += (targetZoomRef.current - zoomRef.current) * zoomAlpha;
      cloudMesh.rotation.y = clockTime * 0.18;
      camera.position.z = zoomRef.current + cameraFlightLift;

      const effectiveSolarDate =
        solarModeRef.current === "scrub"
          ? dateFromUtcMinutes(scrubMinutesRef.current)
          : new Date();
      const sunEarthVec = getSunVectorInEarthFrame(effectiveSolarDate);
      SCRATCH_SUN_VEC.set(sunEarthVec.x, sunEarthVec.y, sunEarthVec.z)
        .applyQuaternion(globeGroup.quaternion)
        .normalize();
      sunUniforms.uSunDirection.value.copy(SCRATCH_SUN_VEC);
      sunLight.position.copy(SCRATCH_SUN_VEC).multiplyScalar(5.0);

      for (const p of arcPulsesRef.current) {
        const t = (clockTime * 0.35 + p.offset) % 1;
        p.mesh.position.copy(p.curve.getPoint(t));
      }

      renderer.render(scene, camera);
    };
    animFrameId = requestAnimationFrame(animate);

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

    const domElem = renderer.domElement;
    const activeTouchGesture: {
      id: number | null;
      startX: number;
      startY: number;
      axis: "undecided" | "horizontal" | "vertical";
    } = {
      id: null,
      startX: 0,
      startY: 0,
      axis: "undecided",
    };

    const onPointerDown = (e: PointerEvent) => {
      engagedRef.current = true;
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
      lastPointerMoveTimeRef.current = performance.now();
      dragVelocityRef.current.x = 0;
      dragVelocityRef.current.y = 0;

      if (e.pointerType === "touch" && !touchOrbitLockedRef.current) {
        activeTouchGesture.id = e.pointerId;
        activeTouchGesture.startX = e.clientX;
        activeTouchGesture.startY = e.clientY;
        activeTouchGesture.axis = "undecided";
        isDraggingRef.current = false;
        return;
      }

      activeTouchGesture.id = null;
      activeTouchGesture.axis = "undecided";
      isDraggingRef.current = true;
      flightTargetRef.current = null;
      flightTotalAngleRef.current = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" && !touchOrbitLockedRef.current) {
        if (activeTouchGesture.id !== e.pointerId || activeTouchGesture.axis === "vertical") {
          return;
        }
        if (activeTouchGesture.axis === "undecided") {
          const totalDx = e.clientX - activeTouchGesture.startX;
          const totalDy = e.clientY - activeTouchGesture.startY;
          if (Math.hypot(totalDx, totalDy) < 6) {
            return;
          }
          if (Math.abs(totalDy) > Math.abs(totalDx) * 1.15) {
            activeTouchGesture.axis = "vertical";
            isDraggingRef.current = false;
            return;
          }
          activeTouchGesture.axis = "horizontal";
          isDraggingRef.current = true;
          flightTargetRef.current = null;
          flightTotalAngleRef.current = 0;
          prevMouseRef.current = { x: e.clientX, y: e.clientY };
          lastPointerMoveTimeRef.current = performance.now();
          try {
            domElem.setPointerCapture(e.pointerId);
          } catch {
            // Ignore pointer capture issues on synthetic tests
          }
          return;
        }
      }

      const rect = renderer.domElement.getBoundingClientRect();
      if (isDraggingRef.current) {
        const now = performance.now();
        const moveDt = Math.max(0.004, Math.min(0.08, (now - lastPointerMoveTimeRef.current) / 1000));
        lastPointerMoveTimeRef.current = now;
        const dx = e.clientX - prevMouseRef.current.x;
        const dy = e.clientY - prevMouseRef.current.y;
        const deltaY = dx * 0.0055;
        const deltaX = dy * 0.0055;
        rotationRef.current.y += deltaY;
        rotationRef.current.x = Math.max(
          -1.05,
          Math.min(1.05, rotationRef.current.x + deltaX)
        );
        const instVy = Math.max(-3.0, Math.min(3.0, deltaY / moveDt));
        const instVx = Math.max(-2.2, Math.min(2.2, deltaX / moveDt));
        dragVelocityRef.current.y = dragVelocityRef.current.y * 0.45 + instVy * 0.55;
        dragVelocityRef.current.x = dragVelocityRef.current.x * 0.45 + instVx * 0.55;
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
          iso3: String(hit.object.userData.iso3),
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
          iso3: picked.iso3,
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

    const onPointerCancel = (e: PointerEvent) => {
      if (activeTouchGesture.id === e.pointerId) {
        activeTouchGesture.id = null;
        activeTouchGesture.axis = "undecided";
      }
      isDraggingRef.current = false;
      dragVelocityRef.current.x = 0;
      dragVelocityRef.current.y = 0;
      try {
        if (domElem.hasPointerCapture?.(e.pointerId)) {
          domElem.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore cleanup errors
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasTouchTapCandidate =
        e.pointerType === "touch" &&
        activeTouchGesture.id === e.pointerId &&
        activeTouchGesture.axis === "undecided";
      if (activeTouchGesture.id === e.pointerId) {
        activeTouchGesture.id = null;
        activeTouchGesture.axis = "undecided";
      }
      try {
        if (domElem.hasPointerCapture?.(e.pointerId)) {
          domElem.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore cleanup errors
      }

      if (!isDraggingRef.current && !wasTouchTapCandidate) return;
      if (performance.now() - lastPointerMoveTimeRef.current > 90) {
        dragVelocityRef.current.x = 0;
        dragVelocityRef.current.y = 0;
      }
      const tapThreshold = e.pointerType === "touch" ? 7 : 5;
      const moved =
        Math.hypot(
          e.clientX - pointerDownPosRef.current.x,
          e.clientY - pointerDownPosRef.current.y
        ) > tapThreshold;
      isDraggingRef.current = false;

      if (!moved) {
        dragVelocityRef.current.x = 0;
        dragVelocityRef.current.y = 0;
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

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    const onContextRestored = () => {
      handleResize();
      const handle = sceneHandleRef.current;
      if (handle) {
        paintEarthSurfaceAndAtmosphere(
          handle,
          themeRef.current,
          selectedIso3Ref.current
        );
      }
    };

    domElem.addEventListener("webglcontextlost", onContextLost);
    domElem.addEventListener("webglcontextrestored", onContextRestored);
    domElem.addEventListener("pointerdown", onPointerDown);
    domElem.addEventListener("pointermove", onPointerMove);
    domElem.addEventListener("pointercancel", onPointerCancel);
    domElem.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);

    return () => {
      sceneHandleRef.current = null;
      cancelAnimationFrame(animFrameId);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", handleResize);
      domElem.removeEventListener("webglcontextlost", onContextLost);
      domElem.removeEventListener("webglcontextrestored", onContextRestored);
      domElem.removeEventListener("pointerdown", onPointerDown);
      domElem.removeEventListener("pointermove", onPointerMove);
      domElem.removeEventListener("pointercancel", onPointerCancel);
      domElem.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      disposeGroupChildren(bordersGroup);
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
  }, [paintEarthSurfaceAndAtmosphere]);

  // Lifecycle Effect B: Re-rasterize textures & materials in-place on theme or selected country change
  useEffect(() => {
    const handle = sceneHandleRef.current;
    if (!handle) return;
    paintEarthSurfaceAndAtmosphere(handle, theme, selectedIso3);
  }, [theme, selectedIso3, paintEarthSurfaceAndAtmosphere]);

  // Lifecycle Effect C: Rebuild data markers & great-circle arcs with explicit GPU disposal
  const selectedIsoKey = selectedCoords?.iso3 ?? "";
  const selectedLatKey = selectedCoords?.lat ?? 0;
  const selectedLngKey = selectedCoords?.lng ?? 0;

  useEffect(() => {
    const handle = sceneHandleRef.current;
    if (!handle) return;
    const isLight = theme === "light";
    const { bordersGroup, markersGroup, arcsGroup, atlasCountries } = handle;

    disposeGroupChildren(bordersGroup);
    disposeGroupChildren(markersGroup);
    disposeGroupChildren(arcsGroup);

    // Build native 3D geodesic sovereign boundary contour on the sphere (r = 1.0022) for the selected country
    const selectedNumId = ISO3_TO_NUMERIC[selectedIso3];
    if (selectedNumId) {
      const selectedFeat = atlasCountries.features.find(
        (f) => String(f.id ?? "").padStart(3, "0") === selectedNumId
      );
      if (selectedFeat?.geometry) {
        const rings: number[][][] =
          selectedFeat.geometry.type === "Polygon"
            ? selectedFeat.geometry.coordinates
            : selectedFeat.geometry.type === "MultiPolygon"
              ? selectedFeat.geometry.coordinates.map((poly) => poly[0])
              : [];
        for (const ring of rings) {
          if (!ring || ring.length < 4) continue;
          const borderPoints: THREE.Vector3[] = [];
          for (let i = 0; i < ring.length; i++) {
            const [lng, lat] = ring[i];
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              borderPoints.push(latLngToVector3(lat, lng, 1.0022));
            }
          }
          if (borderPoints.length >= 3) {
            const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
            const borderMat = new THREE.LineBasicMaterial({
              color: isLight ? 0xffffff : 0x7dd3fc,
              transparent: true,
              opacity: isLight ? 0.92 : 0.88,
            });
            bordersGroup.add(new THREE.LineLoop(borderGeo, borderMat));
          }
        }
      }
    }

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
        opacity: isSelected ? 0.92 : 0.68,
      });
      markersGroup.add(new THREE.Line(spireGeo, spireMat));

      const markerGeo = new THREE.SphereGeometry(isSelected ? 0.015 : 0.011, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({
        color: isSelected ? (isLight ? 0x1d4ed8 : 0x7dd3fc) : layerMeta.colorHex,
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(topPos);
      marker.userData = { iso3: c.iso3, name: c.name, metric: layerMeta.value };
      markersGroup.add(marker);
      newHits.push(marker);

      const ringGeo = new THREE.RingGeometry(0.017, isSelected ? 0.029 : 0.022, 28);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isSelected ? (isLight ? 0x1d4ed8 : 0x60a5fa) : layerMeta.colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isSelected ? 0.72 : 0.42,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(latLngToVector3(c.lat, c.lng, 1.009));
      ring.lookAt(ring.position.clone().multiplyScalar(2));
      markersGroup.add(ring);
    }
    hitMeshesRef.current = newHits;

    const newPulses: { curve: THREE.QuadraticBezierCurve3; mesh: THREE.Mesh; offset: number }[] = [];
    if (selectedIsoKey) {
      const startVec = latLngToVector3(selectedLatKey, selectedLngKey, 1.015);
      const peerTargets = countries
        .filter((other) => other.iso3 !== selectedIsoKey)
        .slice(0, 11);
      let idx = 0;
      for (const other of peerTargets) {
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
        const offset = (idx * 0.19) % 1;
        const initT = (clockTimeRef.current * 0.35 + offset) % 1;
        pulseMesh.position.copy(curve.getPoint(initT));
        arcsGroup.add(pulseMesh);
        newPulses.push({ curve, mesh: pulseMesh, offset });
        idx += 1;
      }
    }
    arcPulsesRef.current = newPulses;
  }, [countries, selectedIso3, activeLayer, selectedIsoKey, selectedLatKey, selectedLngKey, theme]);

  const railCountries = useMemo(() => {
    if (countries.some((c) => c.iso3 === selectedIso3)) return countries;
    const placeholder = buildPlaceholderCountryProfile(selectedIso3);
    return placeholder ? [placeholder, ...countries] : countries;
  }, [countries, selectedIso3]);

  const railMountedRef = useRef(false);

  useEffect(() => {
    const rail = railRef.current;
    const activeBtn = railButtonRefs.current[selectedIso3];
    if (rail && activeBtn) {
      const targetLeft = Math.max(
        0,
        activeBtn.offsetLeft - rail.clientWidth / 2 + activeBtn.offsetWidth / 2
      );
      rail.scrollTo({
        left: targetLeft,
        behavior: railMountedRef.current ? "smooth" : "auto",
      });
      railMountedRef.current = true;
    }
    const id = requestAnimationFrame(updateRailScrollState);
    return () => cancelAnimationFrame(id);
  }, [selectedIso3, railCountries.length, updateRailScrollState]);

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
    const target = selectedCoords;
    if (target) {
      focusGlobeOnCoords(target.lat, target.lng);
    }
  };

  return (
    <div
      ref={stageRef}
      data-globe-stage="true"
      className={`${
        isFullscreen ? "fixed inset-4 z-50 h-[calc(100dvh-2rem)]" : `relative w-full ${heightClass}`
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
          className={`w-full h-full cursor-grab active:cursor-grabbing ${
            isFullscreen || touchOrbitLocked ? "touch-none" : "touch-pan-y sm:touch-none"
          }`}
          aria-label="Interactive 3D Global Intelligence Globe"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-6 text-center text-sm text-[var(--text-secondary)]">
          Interactive Geodesic Projection Active — Select any country beacon below.
        </div>
      )}

      {hoveredCountry ? (
        <div
          className="pointer-events-none absolute z-20 max-w-[252px] omnis-hud-pill px-3 py-2 rounded-lg text-[13px] space-y-0.5"
          style={{ left: tooltipLeft, top: tooltipTop }}
        >
          <div className="font-bold text-[var(--text-primary)] truncate">{hoveredCountry.name}</div>
          <div className="text-[11.5px] tone-blue omnis-mono omnis-tabular truncate">
            {hoveredCountry.metric}
          </div>
          {(() => {
            const c =
              countries.find((item) => item.iso3 === hoveredCountry.iso3) ??
              geoCentroids[hoveredCountry.iso3];
            return c ? (
              <CountrySolarClockBadge
                iso3={hoveredCountry.iso3}
                lat={c.lat}
                lng={c.lng}
                overrideDate={scrubOverrideDate}
                variant="compact"
              />
            ) : null;
          })()}
        </div>
      ) : null}

      {/* Top HUD Bar */}
      <div className="@container absolute top-2.5 sm:top-3.5 inset-x-2.5 sm:inset-x-3.5 flex items-start justify-between gap-2 pointer-events-none">
        <div className="shrink-0 min-w-[144px] sm:min-w-[186px] max-w-[46%] sm:max-w-[235px] @[820px]:max-w-[290px] omnis-hud-pill px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider tone-blue omnis-mono truncate">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Layer: {activeLayer}</span>
          </div>
          {selectedCountry && activeLayerMeta ? (
            <div className="text-[13px] space-y-0.5 min-w-0">
              <div className="font-bold text-[var(--text-primary)] flex items-center gap-1 truncate">
                <span className="shrink-0">{selectedCountry.flagEmoji}</span>
                <span className="truncate">{selectedCountry.name}</span>
                <span className="text-[11px] omnis-mono text-[var(--text-muted)] shrink-0">
                  ({selectedCountry.iso3})
                </span>
              </div>
              <div className="text-[11.5px] sm:text-xs text-[var(--text-secondary)] omnis-mono omnis-tabular truncate">
                {activeLayerMeta.value}
              </div>
              <CountrySolarClockBadge
                iso3={selectedCountry.iso3}
                lat={selectedCountry.lat}
                lng={selectedCountry.lng}
                overrideDate={scrubOverrideDate}
                variant="compact"
              />
              {!compact ? (
                <div className="hidden sm:flex text-xs text-[var(--text-muted)] items-center gap-1 truncate omnis-tabular">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {selectedCountry.capital} •{" "}
                    {selectedCountry.population > 0
                      ? `Pop ${formatPopulationHuman(selectedCountry.population)}`
                      : "Pop N/A"}
                  </span>
                </div>
              ) : null}
            </div>
          ) : geoCentroids[selectedIso3] ? (
            <div className="text-[13px] space-y-0.5 min-w-0">
              <div className="font-bold text-[var(--text-primary)] flex items-center gap-1 truncate">
                <span className="shrink-0">🌐</span>
                <span className="truncate">{geoCentroids[selectedIso3].name}</span>
                <span className="text-[11px] omnis-mono text-[var(--text-muted)] shrink-0">
                  ({selectedIso3})
                </span>
              </div>
              <div className="text-[11.5px] sm:text-xs text-[var(--text-secondary)] omnis-mono truncate">
                Hydrating World Bank telemetry…
              </div>
              <CountrySolarClockBadge
                iso3={selectedIso3}
                lat={geoCentroids[selectedIso3].lat}
                lng={geoCentroids[selectedIso3].lng}
                overrideDate={scrubOverrideDate}
                variant="compact"
              />
            </div>
          ) : null}
        </div>

        <div className="pointer-events-auto min-w-0 max-w-[52%] @[780px]:max-w-none flex flex-wrap justify-end items-center gap-0.5 sm:gap-1 omnis-hud-pill p-1 sm:p-1.5 rounded-xl text-[13px]">
          <button
            type="button"
            onClick={() => setAutoRotate((prev) => !prev)}
            title={autoRotate ? "Pause Orbital Rotation" : "Resume Orbital Rotation"}
            aria-label={autoRotate ? "Pause Orbital Rotation" : "Resume Orbital Rotation"}
            className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] inline-flex items-center justify-center rounded-md hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
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
            className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] inline-flex items-center justify-center rounded-md hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
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
            className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] inline-flex items-center justify-center rounded-md hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <SolarSyncHudControl
            isScrubbing={scrubUtcMinutes !== null}
            scrubMinutes={scrubUtcMinutes ?? 720}
            utcScrubberOpen={utcScrubberOpen}
            onToggleExpand={() => setUtcScrubberOpen((prev) => !prev)}
            onScrubMinutes={(mins) => {
              solarModeRef.current = "scrub";
              scrubMinutesRef.current = mins;
              setScrubUtcMinutes(mins);
            }}
            onResetToLive={() => {
              solarModeRef.current = "live";
              setScrubUtcMinutes(null);
            }}
          />
          <button
            type="button"
            onClick={handleResetView}
            title="Reset View"
            aria-label="Reset View"
            className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] inline-flex items-center justify-center rounded-md hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Globe"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen Globe"}
            className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] inline-flex items-center justify-center rounded-md hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Mobile 1-Finger Touch Mode Toggle */}
      <div className="sm:hidden absolute bottom-[76px] left-3 z-10">
        <button
          type="button"
          onClick={() => setTouchOrbitLocked((prev) => !prev)}
          className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-all cursor-pointer ${
            touchOrbitLocked
              ? "badge-tone-warning"
              : "omnis-hud-pill text-[var(--text-secondary)]"
          }`}
          title="Toggle between vertical page scroll and full 360° 1-finger globe orbit"
        >
          <span>{touchOrbitLocked ? "360° Orbit Locked" : "Scroll-Safe Touch"}</span>
        </button>
      </div>

      {/* Bottom Interactive Country Coordinate Selector Rail with Scroll Affordances */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1 py-1.5 px-1.5 rounded-xl omnis-hud-pill">
        {railScrollState.left ? (
          <button
            type="button"
            onClick={() => railRef.current?.scrollBy({ left: -200, behavior: "smooth" })}
            aria-label="Scroll countries left"
            className="shrink-0 min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
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
          {railCountries.map((c) => {
            const active = c.iso3 === selectedIso3;
            const layerInfo = getLayerMetricForCountry(c, activeLayer);
            return (
              <button
                key={c.iso3}
                ref={(el) => {
                  railButtonRefs.current[c.iso3] = el;
                }}
                type="button"
                onClick={() => {
                  if (c.iso3 === selectedIso3) {
                    focusGlobeOnCoords(c.lat, c.lng);
                  }
                  onSelectCountry(c.iso3);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[13px] transition-all flex items-center gap-2 border cursor-pointer ${
                  active
                    ? "bg-[var(--accent-blue-solid)] text-white border-white/20 shadow-sm"
                    : "bg-[var(--bg-slate)] text-[var(--text-secondary)] border-transparent hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span>{c.flagEmoji}</span>
                <span className="font-semibold">{c.name}</span>
                <span className="text-[11.5px] opacity-85 omnis-mono omnis-tabular hidden md:inline">
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
            className="shrink-0 min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
