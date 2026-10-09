import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// 검색 노출에서 뺄 경로 (TECH-DESIGN §7.9). 개인 화면·관리·인증 흐름·작성 화면
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/auth/", "/login", "/onboarding", "/me", "/api/", "/g/*/write", "/g/*/posts/*/edit"],
    },
    sitemap: siteUrl("/sitemap.xml"),
  };
}
