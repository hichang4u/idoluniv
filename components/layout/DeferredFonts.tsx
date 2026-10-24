"use client";

import { useEffect } from "react";
import { FONTS_COOKIE } from "@/lib/fonts";

/**
 * 첫 방문: 시스템 글꼴로 먼저 그리고, 페이지 로드가 끝난 뒤 Pretendard CSS 를 붙인다 (P1-5, D-32).
 * 글꼴 조각(첫 화면 약 200~260KiB)이 LCP 경로에 들어가지 않게 하기 위해서다.
 * 받은 뒤에는 쿠키를 남겨, 다음 방문부터는 레이아웃이 처음부터 CSS 를 넣는다.
 */
export function DeferredFonts({ href }: { href: string }) {
  useEffect(() => {
    const load = () => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => {
        document.cookie = `${FONTS_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
      };
      document.head.appendChild(link);
    };
    // load 이벤트가 첫 그리기보다 먼저 올 수 있어(빠른 망) 조금 더 기다린 뒤 한가할 때 붙인다
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      timer = setTimeout(() => (window.requestIdleCallback ?? setTimeout)(load), 1500);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      clearTimeout(timer);
    };
  }, [href]);

  return null;
}
