"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** 로그인 후 지금 보던 페이지로 돌아오도록 `next` 를 붙인다 (F1-2) */
export function LoginLink({ children, ...props }: Omit<React.ComponentProps<typeof Link>, "href">) {
  const pathname = usePathname();
  return (
    <Link href={`/login?next=${encodeURIComponent(pathname)}`} {...props}>
      {children}
    </Link>
  );
}
