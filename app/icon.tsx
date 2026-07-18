import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #581c87, #020617 72%)",
          color: "white",
          fontSize: 164,
          fontWeight: 900,
          letterSpacing: "-0.08em",
        }}
      >
        MP
      </div>
    ),
    size,
  );
}