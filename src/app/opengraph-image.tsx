import { ImageResponse } from "next/og";

export const alt = "Rune — a curated library of agent skills, forged by Fable 5";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The direction, distilled: CRT ground + scanlines, the Raido tile, display type.
const BG = "#0d0e10";
const INK = "#dadfe2";
const MUTED = "#838a90";
const VERMILION = "#f45536";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: BG,
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 6px)",
        padding: 72,
        fontFamily: "monospace",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <svg width="88" height="88" viewBox="0 0 32 32" aria-hidden="true">
          <rect x="1" y="1" width="30" height="30" fill={VERMILION} />
          <g
            stroke={BG}
            strokeWidth="2.6"
            strokeLinecap="square"
            fill="none"
          >
            <path d="M11 8v16" />
            <path d="M11 8l9 4-9 3.5" />
            <path d="M11 15.5l9.5 8.5" />
          </g>
        </svg>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 30,
              letterSpacing: 14,
              color: MUTED,
              textTransform: "uppercase",
            }}
          >
            Rune · by Fable 5
          </div>
          <div style={{ width: 64, height: 4, backgroundColor: VERMILION }} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            columnGap: 24,
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1.05,
            color: INK,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          <span>Give any agent</span>
          <span style={{ color: VERMILION }}>new powers</span>
        </div>
        <div style={{ fontSize: 30, color: MUTED, lineHeight: 1.4 }}>
          A curated library of agent skills — every rune forged by one hand.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 26,
          color: MUTED,
        }}
      >
        <div style={{ color: VERMILION }}>$</div>
        <div>npx rune-add react-mastery</div>
        <div
          style={{
            width: 14,
            height: 30,
            backgroundColor: VERMILION,
          }}
        />
      </div>
    </div>,
    { ...size },
  );
}
