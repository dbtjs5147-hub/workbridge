import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://workbridge-mu.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/projects",
    "/try",
    "/login",
    "/signup",
    "/terms",
    "/privacy",
    "/business",
  ];
  const now = new Date();
  return routes.map((r) => ({
    url: `${base}${r}`,
    lastModified: now,
    changeFrequency: r === "/projects" ? "daily" : "weekly",
    priority: r === "" ? 1 : 0.6,
  }));
}
