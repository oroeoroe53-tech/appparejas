import { t } from "@/content";

/** Single source of truth for the product name. Change it here and everywhere follows. */
export const brand = {
  name: "US",
  tagline: t.meta.tagline,
  fullName: `US — ${t.meta.tagline}`,
  shortName: "US",
  description: t.meta.description,
  themeColor: "#FAF7F2",
} as const;
