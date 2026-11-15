import { ImageResponse } from "next/og";

export const alt = "OMNIS — The Intelligence of Everything";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#070A10",
          backgroundImage:
            "radial-gradient(ellipse 72% 62% at 74% 38%, rgba(59, 130, 246, 0.22) 0%, rgba(56, 189, 248, 0.08) 42%, rgba(7, 10, 16, 0) 75%)",
          padding: "56px 68px",
          position: "relative",
          overflow: "hidden",
          color: "#F8FAFC",
        }}
      >
        {/* Subtle 1px Architectural Grid & Meridian Hairlines */}
        <svg
          width="1200"
          height="630"
          viewBox="0 0 1200 630"
          fill="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {/* Outer frame hairline */}
          <rect
            x="28"
            y="28"
            width="1144"
            height="574"
            rx="20"
            stroke="rgba(148, 163, 184, 0.16)"
            strokeWidth="1"
          />
          {/* Horizontal architectural hairlines */}
          <line x1="28" y1="124" x2="1172" y2="124" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
          <line x1="28" y1="510" x2="1172" y2="510" stroke="rgba(148, 163, 184, 0.12)" strokeWidth="1" />
          {/* Vertical architectural hairlines */}
          <line x1="760" y1="28" x2="760" y2="510" stroke="rgba(148, 163, 184, 0.09)" strokeWidth="1" />

          {/* Right-side Planetary Meridian & Causal Network Watermark Geometry */}
          <circle
            cx="966"
            cy="315"
            r="162"
            stroke="rgba(59, 130, 246, 0.22)"
            strokeWidth="1.25"
          />
          <circle
            cx="966"
            cy="315"
            r="116"
            stroke="rgba(148, 163, 184, 0.14)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <ellipse
            cx="966"
            cy="315"
            rx="162"
            ry="62"
            transform="rotate(-23.5 966 315)"
            stroke="rgba(56, 189, 248, 0.34)"
            strokeWidth="1.5"
          />
          <ellipse
            cx="966"
            cy="315"
            rx="62"
            ry="162"
            transform="rotate(-23.5 966 315)"
            stroke="rgba(96, 165, 250, 0.18)"
            strokeWidth="1.15"
          />
          {/* Causal graph nodes & edges */}
          <line x1="875" y1="248" x2="966" y2="315" stroke="rgba(56, 189, 248, 0.38)" strokeWidth="1.5" />
          <line x1="966" y1="315" x2="1076" y2="255" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="1.5" />
          <line x1="966" y1="315" x2="1018" y2="404" stroke="rgba(96, 165, 250, 0.32)" strokeWidth="1.25" />
          <circle cx="966" cy="315" r="6" fill="#F8FAFC" />
          <circle cx="1076" cy="255" r="8" fill="#38BDF8" />
          <circle cx="875" cy="248" r="4.5" fill="#60A5FA" />
          <circle cx="1018" cy="404" r="4.5" fill="#38BDF8" />
        </svg>

        {/* Top Telemetry Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "9999px",
                backgroundColor: "#38BDF8",
              }}
            />
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.24em",
                color: "#94A3B8",
              }}
            >
              OMNIS SOVEREIGN INTELLIGENCE SYSTEM // v2.0
            </span>
          </div>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "#60A5FA",
            }}
          >
            OMNIS-ONE.VERCEL.APP
          </span>
        </div>

        {/* Center Asymmetric Brand Identity Lockup */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "24px",
            maxWidth: "700px",
            marginTop: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "28px",
            }}
          >
            {/* OMNIS Emblem (112 × 112px) — Pure Inline Vector Paths on 32×32 Grid */}
            <svg
              width="112"
              height="112"
              viewBox="0 0 32 32"
              fill="none"
            >
              <defs>
                <linearGradient
                  id="og-orbit-grad"
                  x1="5.5"
                  y1="20.5"
                  x2="26.5"
                  y2="10.25"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
              </defs>
              <rect
                x="0.75"
                y="0.75"
                width="30.5"
                height="30.5"
                rx="8.25"
                fill="#0D121D"
                stroke="rgba(148, 163, 184, 0.28)"
                strokeWidth="1"
              />
              <path
                d="M 5 1.5 H 27"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="0.75"
                strokeLinecap="round"
              />
              {/* 1. Outer Orbital Ring (r="13", strokeWidth="1.75") with 6 o'clock Aperture */}
              <path
                d="M 10.75 27.85 A 13 13 0 1 1 21.25 27.85"
                stroke="#F8FAFC"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeOpacity="0.94"
              />
              {/* Back orbital trace */}
              <path
                d="M 6.5 20.0 A 11.25 4.25 -23.5 0 1 24.25 10.25"
                stroke="url(#og-orbit-grad)"
                strokeWidth="1.15"
                strokeDasharray="1.75 2.25"
                strokeLinecap="round"
                opacity="0.5"
              />
              {/* 2. The Omega (Ω) Vault & Feet at y="24.5" */}
              <path
                d="M 8.5 24.5 H 12.75 V 21.5 A 7.25 7.25 0 1 1 19.25 21.5 V 24.5 H 23.5"
                stroke="#F8FAFC"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* 3. Foreground 23.5° Orbital Meridian Arc */}
              <path
                d="M 6.5 20.0 A 11.25 4.25 -23.5 0 0 24.25 10.25"
                stroke="url(#og-orbit-grad)"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              {/* Central Causal Nexus */}
              <circle cx="16" cy="14.75" r="1.35" fill="#F8FAFC" />
              {/* 2 o'clock Singularity Focal Node (r="2") */}
              <circle cx="24.25" cy="10.25" r="3.25" fill="rgba(56, 189, 248, 0.28)" />
              <circle cx="24.25" cy="10.25" r="2" fill="#38BDF8" />
              <circle cx="24.25" cy="10.25" r="0.75" fill="#F8FAFC" />
            </svg>

            {/* Pure Geometric Vector Wordmark "OMNIS" + Tagline */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {/* Pure Vector Geometric Wordmark "OMNIS" (zero font dependency) */}
              <svg width="356" height="54" viewBox="0 0 356 54" fill="none">
                {/* O */}
                <path
                  d="M27 5C14.85 5 5 14.85 5 27C5 39.15 14.85 49 27 49C39.15 49 49 39.15 49 27C49 14.85 39.15 5 27 5ZM27 40.5C19.54 40.5 13.5 34.46 13.5 27C13.5 19.54 19.54 13.5 27 13.5C34.46 13.5 40.5 19.54 40.5 27C40.5 34.46 34.46 40.5 27 40.5Z"
                  fill="#FFFFFF"
                />
                {/* M */}
                <path
                  d="M74 48V6H83.5L99 30.5L114.5 6H124V48H115.5V19.5L101.5 41.5H96.5L82.5 19.5V48H74Z"
                  fill="#FFFFFF"
                />
                {/* N */}
                <path
                  d="M151 48V6H159.5L183.5 34.5V6H192V48H183.5L159.5 19.5V48H151Z"
                  fill="#FFFFFF"
                />
                {/* I */}
                <path
                  d="M220 48V6H229V48H220Z"
                  fill="#FFFFFF"
                />
                {/* S */}
                <path
                  d="M273.5 49C263.5 49 256 44.2 254.5 36.5H263.5C264.8 39.8 268.4 41.5 273.8 41.5C279.6 41.5 283.2 39.1 283.2 35.6C283.2 32.4 280.4 30.9 274.2 29.7L268.6 28.6C259.6 26.9 255.5 23.1 255.5 16.8C255.5 9.6 262.1 5 272.5 5C282.3 5 289.1 9.5 290.4 16.8H281.5C280.3 13.8 277.1 12.2 272.4 12.2C267.1 12.2 264 14.3 264 17.3C264 20.1 266.6 21.6 272.5 22.7L278.1 23.8C287.6 25.6 291.8 29.3 291.8 35.8C291.8 43.9 284.7 49 273.5 49Z"
                  fill="#FFFFFF"
                />
                {/* Accent Singularity Dot */}
                <circle cx="310" cy="43" r="5" fill="#38BDF8" />
              </svg>

              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  letterSpacing: "0.3em",
                  color: "#38BDF8",
                }}
              >
                THE INTELLIGENCE OF EVERYTHING
              </div>
            </div>
          </div>

          {/* Clean Editorial Subtitle */}
          <div
            style={{
              fontSize: "34px",
              fontWeight: 600,
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
              color: "#F8FAFC",
              marginTop: "6px",
            }}
          >
            Understand Anything. Connect Everything.
          </div>

          <div
            style={{
              fontSize: "18px",
              fontWeight: 400,
              lineHeight: 1.5,
              color: "#94A3B8",
              maxWidth: "650px",
            }}
          >
            Interactive 3D Global Atlas, Infinite Causal Knowledge Graphs, 500-Path Monte Carlo Scenario Simulations & Multi-Source Deep Research.
          </div>
        </div>

        {/* Bottom Architectural Module Strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            paddingTop: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.14em",
              color: "#CBD5E1",
              whiteSpace: "nowrap",
            }}
          >
            <span>01. 3D ATLAS</span>
            <span style={{ color: "#3B82F6" }}>•</span>
            <span>02. KNOWLEDGE GRAPH</span>
            <span style={{ color: "#3B82F6" }}>•</span>
            <span>03. SIMULATIONS</span>
            <span style={{ color: "#3B82F6" }}>•</span>
            <span>04. DEEP RESEARCH</span>
          </div>

          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.14em",
              color: "#64748B",
              whiteSpace: "nowrap",
            }}
          >
            WORLD BANK • OPENALEX • WIKIDATA • USGS
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
