import type { MetadataRoute } from "next";
import { t } from "@/content";
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
      { name: t.meta.shortcuts.write.name, short_name: t.meta.shortcuts.write.short, url: "/write", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: t.meta.shortcuts.portrait.name, short_name: t.meta.shortcuts.portrait.short, url: "/us/portrait", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: t.meta.shortcuts.letters.name, short_name: t.meta.shortcuts.letters.short, url: "/letters", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
