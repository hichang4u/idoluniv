"use client";

import { useEffect } from "react";
import { recordRecentGroup } from "@/lib/recent-groups";

/** 그룹 화면에 들어오면 이 기기의 최근 방문 그룹에 남긴다 (마이 "최근 방문한 그룹") */
export function RecordVisit({ slug, name, colorKey }: { slug: string; name: string; colorKey: string }) {
  useEffect(() => {
    recordRecentGroup({ slug, name, colorKey });
  }, [slug, name, colorKey]);
  return null;
}
