import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/seo-kit";

const ROUTES = ["/", "/bible", "/classes", "/contact", "/exams-info", "/faq", "/games-info", "/learn", "/library/coverage", "/plans", "/stories", "/timeline", "/wings"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteBaseUrl();
  const now = new Date();
  return ROUTES.map((r) => ({
    url: `${base}${r === "/" ? "" : r}`,
    lastModified: now,
    changeFrequency: r === "/" ? "daily" : "weekly",
    priority: r === "/" ? 1 : 0.7,
  }));
}
