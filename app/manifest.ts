import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Moira POS",
    short_name: "Moira POS",
    description: "Moira / DAYS 店舗向けPOSシステム",
    start_url: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#020617",
    theme_color: "#020617",
    lang: "ja",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}