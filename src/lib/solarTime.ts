"use client";

import { useEffect, useState } from "react";

export type SolarPhase =
  | "Daylight"
  | "Golden Hour"
  | "Civil Twilight"
  | "Nautical Dusk"
  | "Night";

export interface SubsolarPoint {
  latDeg: number;
  lngDeg: number;
  declinationRad: number;
  eqOfTimeMin: number;
  utcMinutes: number;
}

export interface CountrySolarState {
  phase: SolarPhase;
  symbol: string;
  toneClass: "warning" | "blue" | "violet" | "muted";
  altitudeDeg: number;
  formattedTime: string;
  formattedTimeWithSeconds: string;
  timeZone: string;
  tzShortName: string;
  utcOffsetLabel: string;
}

export interface SphericalVector3Like {
  x: number;
  y: number;
  z: number;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const DAY_MS = 86_400_000;

/**
 * Wraps any longitude value strictly into [-180, +180] degrees.
 */
export function wrapLongitude(deg: number): number {
  const wrapped = ((((deg + 180) % 360) + 360) % 360) - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

/**
 * Exact match to Three.js SphereGeometry / InteractiveGlobe3D `latLngToVector3`.
 */
export function latLngToEarthVector(
  lat: number,
  lng: number,
  radius = 1
): SphericalVector3Like {
  const phi = (90 - lat) * DEG_TO_RAD;
  const theta = (lng + 180) * DEG_TO_RAD;
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return { x, y, z };
}

/**
 * NOAA Spencer Fourier series for solar declination (rad) and Equation of Time (minutes),
 * yielding subsolar (lat, lng) with <0.02° seasonal accuracy.
 */
export function getSubsolarPoint(date: Date = new Date()): SubsolarPoint {
  const year = date.getUTCFullYear();
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInYear = isLeap ? 366 : 365;

  const yearStartMs = Date.UTC(year, 0, 1, 0, 0, 0, 0);
  const doyFrac = Math.max(0, (date.getTime() - yearStartMs) / DAY_MS);
  const utcMinutes =
    date.getUTCHours() * 60 +
    date.getUTCMinutes() +
    date.getUTCSeconds() / 60 +
    date.getUTCMilliseconds() / 60_000;

  // Fractional year gamma referenced cleanly to solar noon at 12:00
  const gamma = ((2 * Math.PI) / daysInYear) * (doyFrac - 0.5);
  const cos1 = Math.cos(gamma);
  const sin1 = Math.sin(gamma);
  const cos2 = Math.cos(2 * gamma);
  const sin2 = Math.sin(2 * gamma);
  const cos3 = Math.cos(3 * gamma);
  const sin3 = Math.sin(3 * gamma);

  const eqOfTimeMin =
    229.18 *
    (0.000075 +
      0.001868 * cos1 -
      0.032077 * sin1 -
      0.014615 * cos2 -
      0.040849 * sin2);

  const declinationRad =
    0.006918 -
    0.399912 * cos1 +
    0.070257 * sin1 -
    0.006758 * cos2 +
    0.000907 * sin2 -
    0.002697 * cos3 +
    0.00148 * sin3;

  const latDeg = declinationRad * RAD_TO_DEG;
  const lngDeg = wrapLongitude(-(utcMinutes + eqOfTimeMin - 720) * 0.25);

  return {
    latDeg,
    lngDeg,
    declinationRad,
    eqOfTimeMin,
    utcMinutes,
  };
}

/**
 * Returns the unit sun direction vector in Earth's local equatorial frame.
 * Multiply by `globeGroup.quaternion` in Three.js to keep the solar terminator locked to continents.
 */
export function getSunVectorInEarthFrame(date: Date = new Date()): SphericalVector3Like {
  const { latDeg, lngDeg } = getSubsolarPoint(date);
  return latLngToEarthVector(latDeg, lngDeg, 1);
}

/**
 * Constructs a Date pinned to the same UTC calendar day as `baseDate` at `minutesUtc` [0..1440).
 */
export function dateFromUtcMinutes(minutesUtc: number, baseDate: Date = new Date()): Date {
  const clamped = ((minutesUtc % 1440) + 1440) % 1440;
  const wholeHours = Math.floor(clamped / 60);
  const wholeMins = Math.floor(clamped % 60);
  const secs = Math.floor(((clamped - Math.floor(clamped)) * 60) % 60);
  return new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      wholeHours,
      wholeMins,
      secs,
      0
    )
  );
}

/**
 * Complete IANA primary timezone mapping for all 130 nations in OMNIS `ISO3_TO_NUMERIC`.
 */
export const ISO3_TIMEZONES: Record<string, string> = {
  AFG: "Asia/Kabul",
  AGO: "Africa/Luanda",
  ALB: "Europe/Tirane",
  ARE: "Asia/Dubai",
  ARG: "America/Argentina/Buenos_Aires",
  ARM: "Asia/Yerevan",
  AUS: "Australia/Sydney",
  AUT: "Europe/Vienna",
  AZE: "Asia/Baku",
  BEL: "Europe/Brussels",
  BGD: "Asia/Dhaka",
  BGR: "Europe/Sofia",
  BIH: "Europe/Sarajevo",
  BLR: "Europe/Minsk",
  BOL: "America/La_Paz",
  BRA: "America/Sao_Paulo",
  BWA: "Africa/Gaborone",
  CAN: "America/Toronto",
  CHE: "Europe/Zurich",
  CHL: "America/Santiago",
  CHN: "Asia/Shanghai",
  CIV: "Africa/Abidjan",
  CMR: "Africa/Douala",
  COD: "Africa/Kinshasa",
  COG: "Africa/Brazzaville",
  COL: "America/Bogota",
  CRI: "America/Costa_Rica",
  CUB: "America/Havana",
  CYP: "Asia/Nicosia",
  CZE: "Europe/Prague",
  DEU: "Europe/Berlin",
  DNK: "Europe/Copenhagen",
  DOM: "America/Santo_Domingo",
  DZA: "Africa/Algiers",
  ECU: "America/Guayaquil",
  EGY: "Africa/Cairo",
  ESP: "Europe/Madrid",
  EST: "Europe/Tallinn",
  ETH: "Africa/Addis_Ababa",
  FIN: "Europe/Helsinki",
  FJI: "Pacific/Fiji",
  FRA: "Europe/Paris",
  GBR: "Europe/London",
  GEO: "Asia/Tbilisi",
  GHA: "Africa/Accra",
  GRC: "Europe/Athens",
  GRL: "America/Nuuk",
  GTM: "America/Guatemala",
  HND: "America/Tegucigalpa",
  HRV: "Europe/Zagreb",
  HUN: "Europe/Budapest",
  IDN: "Asia/Jakarta",
  IND: "Asia/Kolkata",
  IRL: "Europe/Dublin",
  IRN: "Asia/Tehran",
  IRQ: "Asia/Baghdad",
  ISL: "Atlantic/Reykjavik",
  ISR: "Asia/Jerusalem",
  ITA: "Europe/Rome",
  JAM: "America/Jamaica",
  JOR: "Asia/Amman",
  JPN: "Asia/Tokyo",
  KAZ: "Asia/Almaty",
  KEN: "Africa/Nairobi",
  KHM: "Asia/Phnom_Penh",
  KOR: "Asia/Seoul",
  KWT: "Asia/Kuwait",
  LAO: "Asia/Vientiane",
  LBN: "Asia/Beirut",
  LBY: "Africa/Tripoli",
  LKA: "Asia/Colombo",
  LTU: "Europe/Vilnius",
  LUX: "Europe/Luxembourg",
  LVA: "Europe/Riga",
  MAR: "Africa/Casablanca",
  MDA: "Europe/Chisinau",
  MDG: "Indian/Antananarivo",
  MEX: "America/Mexico_City",
  MLI: "Africa/Bamako",
  MMR: "Asia/Yangon",
  MNG: "Asia/Ulaanbaatar",
  MOZ: "Africa/Maputo",
  MYS: "Asia/Kuala_Lumpur",
  NAM: "Africa/Windhoek",
  NER: "Africa/Niamey",
  NGA: "Africa/Lagos",
  NLD: "Europe/Amsterdam",
  NOR: "Europe/Oslo",
  NPL: "Asia/Kathmandu",
  NZL: "Pacific/Auckland",
  OMN: "Asia/Muscat",
  PAK: "Asia/Karachi",
  PAN: "America/Panama",
  PER: "America/Lima",
  PHL: "Asia/Manila",
  PNG: "Pacific/Port_Moresby",
  POL: "Europe/Warsaw",
  PRK: "Asia/Pyongyang",
  PRT: "Europe/Lisbon",
  PRY: "America/Asuncion",
  QAT: "Asia/Qatar",
  ROU: "Europe/Bucharest",
  RUS: "Europe/Moscow",
  RWA: "Africa/Kigali",
  SAU: "Asia/Riyadh",
  SDN: "Africa/Khartoum",
  SEN: "Africa/Dakar",
  SGP: "Asia/Singapore",
  SRB: "Europe/Belgrade",
  SVK: "Europe/Bratislava",
  SVN: "Europe/Ljubljana",
  SWE: "Europe/Stockholm",
  SYR: "Asia/Damascus",
  THA: "Asia/Bangkok",
  TUN: "Africa/Tunis",
  TUR: "Europe/Istanbul",
  TWN: "Asia/Taipei",
  TZA: "Africa/Dar_es_Salaam",
  UGA: "Africa/Kampala",
  UKR: "Europe/Kyiv",
  URY: "America/Montevideo",
  USA: "America/New_York",
  UZB: "Asia/Tashkent",
  VEN: "America/Caracas",
  VNM: "Asia/Ho_Chi_Minh",
  YEM: "Asia/Aden",
  ZAF: "Africa/Johannesburg",
  ZMB: "Africa/Lusaka",
  ZWE: "Africa/Harare",
};

/**
 * Resolves a valid IANA timezone identifier for any ISO3 code, falling back cleanly
 * to longitudinal `Etc/GMT` solar zones if an unfamiliar code appears.
 */
export function getTimeZoneForCountry(iso3: string, lng = 0): string {
  const upper = iso3.trim().toUpperCase();
  const mapped = ISO3_TIMEZONES[upper];
  if (mapped) return mapped;

  const offsetHours = Math.max(-12, Math.min(12, Math.round(lng / 15)));
  if (offsetHours === 0) return "UTC";
  // POSIX Etc/GMT sign convention is inverted relative to UTC
  return offsetHours > 0 ? `Etc/GMT-${offsetHours}` : `Etc/GMT+${Math.abs(offsetHours)}`;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getCachedFormatter(
  cacheKey: string,
  locale: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  let fmt = formatterCache.get(cacheKey);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(cacheKey, fmt);
  }
  return fmt;
}

export function classifySolarAltitude(altitudeDeg: number): {
  phase: SolarPhase;
  symbol: string;
  toneClass: "warning" | "blue" | "violet" | "muted";
} {
  if (altitudeDeg > 6) {
    return { phase: "Daylight", symbol: "☀", toneClass: "warning" };
  }
  if (altitudeDeg > 0) {
    return { phase: "Golden Hour", symbol: "◐", toneClass: "warning" };
  }
  if (altitudeDeg > -6) {
    return { phase: "Civil Twilight", symbol: "◐", toneClass: "blue" };
  }
  if (altitudeDeg > -18) {
    return { phase: "Nautical Dusk", symbol: "☾", toneClass: "violet" };
  }
  return { phase: "Night", symbol: "●", toneClass: "muted" };
}

/**
 * Computes exact solar elevation, twilight phase, and DST-aware local time for a location.
 */
export function getCountrySolarState(
  lat: number,
  lng: number,
  timeZone: string,
  date: Date = new Date()
): CountrySolarState {
  const subsolar = getSubsolarPoint(date);
  const latRad = lat * DEG_TO_RAD;
  const hourAngleRad = (lng - subsolar.lngDeg) * DEG_TO_RAD;

  const sinAlt =
    Math.sin(latRad) * Math.sin(subsolar.declinationRad) +
    Math.cos(latRad) * Math.cos(subsolar.declinationRad) * Math.cos(hourAngleRad);
  const clampedSin = Math.max(-1, Math.min(1, sinAlt));
  const altitudeDeg = Math.asin(clampedSin) * RAD_TO_DEG;

  const { phase, symbol, toneClass } = classifySolarAltitude(altitudeDeg);

  let resolvedZone = timeZone || "UTC";
  let formattedTime = "--:--";
  let formattedTimeWithSeconds = "--:--:--";
  let utcOffsetLabel = "UTC";
  let tzShortName = "UTC";

  const formatWithZone = (tz: string) => {
    const timeFmt = getCachedFormatter(`hm:${tz}`, "en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const secFmt = getCachedFormatter(`hms:${tz}`, "en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const offsetFmt = getCachedFormatter(`off:${tz}`, "en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const shortFmt = getCachedFormatter(`sht:${tz}`, "en-US", {
      timeZone: tz,
      timeZoneName: "short",
    });

    const fTime = timeFmt.format(date);
    const fSec = secFmt.format(date);
    const offPart =
      offsetFmt.formatToParts(date).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const shtPart =
      shortFmt.formatToParts(date).find((p) => p.type === "timeZoneName")?.value ?? offPart;

    const normalizedOffset = offPart === "GMT" || offPart === "UTC" ? "UTC+0" : offPart.replace(/^GMT/, "UTC");
    const cleanShort =
      shtPart && !/^GMT/i.test(shtPart) && shtPart !== "UTC"
        ? shtPart
        : normalizedOffset;

    return { fTime, fSec, normalizedOffset, cleanShort };
  };

  try {
    const res = formatWithZone(resolvedZone);
    formattedTime = res.fTime;
    formattedTimeWithSeconds = res.fSec;
    utcOffsetLabel = res.normalizedOffset;
    tzShortName = res.cleanShort;
  } catch {
    resolvedZone = "UTC";
    const fallback = formatWithZone("UTC");
    formattedTime = fallback.fTime;
    formattedTimeWithSeconds = fallback.fSec;
    utcOffsetLabel = fallback.normalizedOffset;
    tzShortName = fallback.cleanShort;
  }

  return {
    phase,
    symbol,
    toneClass,
    altitudeDeg,
    formattedTime,
    formattedTimeWithSeconds,
    timeZone: resolvedZone,
    tzShortName,
    utcOffsetLabel,
  };
}

export function formatUtcClock(date: Date, withSeconds = false): string {
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  if (!withSeconds) return `${hh}:${mm} UTC`;
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} UTC`;
}

/**
 * SSR-safe real-time clock hook: returns `null` during SSR & initial hydration pass
 * so server HTML and first client paint match cleanly (`--:-- UTC`) with zero hydration warnings.
 */
export function useLiveUtcClock(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => {
      setNow(new Date());
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
