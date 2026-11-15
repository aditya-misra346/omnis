import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "32px",
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect
            x="0.75"
            y="0.75"
            width="30.5"
            height="30.5"
            rx="8"
            fill="#070A10"
            stroke="rgba(148, 163, 184, 0.32)"
            strokeWidth="1"
          />
          {/* 1. Outer Orbital Ring (r="13") with 6 o'clock Aperture */}
          <path
            d="M 10.75 27.85 A 13 13 0 1 1 21.25 27.85"
            stroke="#F8FAFC"
            strokeWidth="2.0"
            strokeLinecap="round"
          />
          {/* 2. The Omega (Ω) Vault & Feet anchored at y="24.5" */}
          <path
            d="M 8.5 24.5 H 12.75 V 21.5 A 7.25 7.25 0 1 1 19.25 21.5 V 24.5 H 23.5"
            stroke="#F8FAFC"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 3. Tilted 23.5° Orbital Meridian Arc & 2 o'clock Singularity Node */}
          <path
            d="M 6.5 20.0 A 11.25 4.25 -23.5 0 0 24.25 10.25"
            stroke="#38BDF8"
            strokeWidth="1.95"
            strokeLinecap="round"
          />
          <circle cx="24.25" cy="10.25" r="2.2" fill="#38BDF8" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
