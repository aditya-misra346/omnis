import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

/**
 * 180×180 Apple Touch & WhatsApp Compact Link Thumbnail Icon
 * Uses an opaque #070A10 obsidian background with generous 24px inset safe-zone
 * padding (132×132 inner emblem) so iOS squircle and WhatsApp circular crops
 * never clip the outer orbital ring.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "180px",
          height: "180px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#070A10",
          backgroundImage:
            "radial-gradient(circle at 68% 28%, rgba(56, 189, 248, 0.18) 0%, rgba(37, 99, 235, 0.08) 48%, rgba(7, 10, 16, 0) 78%)",
          padding: "24px",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 32 32" fill="none">
          <defs>
            <linearGradient
              id="apple-orbit-grad"
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
          {/* 1. Outer Orbital Ring (r="13", strokeWidth="1.75") with 6 o'clock Aperture */}
          <path
            d="M 10.75 27.85 A 13 13 0 1 1 21.25 27.85"
            stroke="#F8FAFC"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeOpacity="0.95"
          />
          {/* Back orbital trace */}
          <path
            d="M 6.5 20.0 A 11.25 4.25 -23.5 0 1 24.25 10.25"
            stroke="url(#apple-orbit-grad)"
            strokeWidth="1.15"
            strokeDasharray="1.75 2.25"
            strokeLinecap="round"
            opacity="0.5"
          />
          {/* 2. The Omega (Ω) Vault & Feet anchored at y="24.5" */}
          <path
            d="M 8.5 24.5 H 12.75 V 21.5 A 7.25 7.25 0 1 1 19.25 21.5 V 24.5 H 23.5"
            stroke="#F8FAFC"
            strokeWidth="1.95"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 3. Foreground 23.5° Orbital Meridian Arc */}
          <path
            d="M 6.5 20.0 A 11.25 4.25 -23.5 0 0 24.25 10.25"
            stroke="url(#apple-orbit-grad)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Central Causal Nexus */}
          <circle cx="16" cy="14.75" r="1.35" fill="#F8FAFC" />
          {/* 2 o'clock Singularity Focal Node (r="2") */}
          <circle cx="24.25" cy="10.25" r="3.2" fill="rgba(56, 189, 248, 0.28)" />
          <circle cx="24.25" cy="10.25" r="2" fill="#38BDF8" />
          <circle cx="24.25" cy="10.25" r="0.75" fill="#F8FAFC" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
