import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://workbridge-mu.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 로그인·개인 영역·API는 색인에서 제외
      disallow: ["/api/", "/my/", "/messages", "/contracts", "/notifications", "/payments"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
