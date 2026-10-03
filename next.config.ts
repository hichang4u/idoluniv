import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 그룹 중심 IA(D-16)로 옮기기 전 경로. 구체적인 경로를 먼저 둔다(위에서부터 첫 일치).
  async redirects() {
    return [
      { source: "/board/:slug/new", destination: "/g/:slug/write", permanent: true },
      { source: "/board/:slug/:id/edit", destination: "/g/:slug/posts/:id/edit", permanent: true },
      { source: "/board/:slug/:id", destination: "/g/:slug/posts/:id", permanent: true },
      { source: "/board/:slug", destination: "/g/:slug", permanent: true },
      { source: "/board", destination: "/g", permanent: true },
      { source: "/chat/:slug", destination: "/g/:slug/lounge", permanent: true },
      { source: "/chat", destination: "/g", permanent: true },
      { source: "/profile", destination: "/me", permanent: true },
      { source: "/groups", destination: "/g", permanent: true },
    ];
  },
};

export default nextConfig;
