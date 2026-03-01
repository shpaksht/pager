import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pager",
    short_name: "Pager",
    description: "Reading tracker and planning app",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f9f4ea",
    theme_color: "#6f482a",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
