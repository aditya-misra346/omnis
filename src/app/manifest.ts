import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OMNIS — The Intelligence of Everything",
    short_name: "OMNIS",
    description:
      "Understand Anything. Connect Everything. Interactive 3D Global Atlas, Infinite Knowledge Graphs, Monte Carlo Simulations & AddyIntelligence.",
    start_url: "/",
    display: "standalone",
    background_color: "#070A10",
    theme_color: "#070A10",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "16x16 32x32 48x48",
        type: "image/x-icon",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
