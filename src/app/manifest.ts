import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: brand.fullName,
    short_name: brand.shortName,
    description: brand.description,
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF7F2",
    theme_color: "#FAF7F2",
    shortcuts: [
      { name: "Write to your person", short_name: "Write", url: "/write", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "See your person", short_name: "Portrait", url: "/us/portrait", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Our letters", short_name: "Letters", url: "/letters", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
