"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Props = Omit<React.ComponentProps<typeof Link>, "href">;

function loginHref(pathname: string, search = "") {
  return `/login?next=${encodeURIComponent(search ? `${pathname}?${search}` : pathname)}`;
}

function LoginLinkWithQuery({ children, ...props }: Props) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return (
    <Link href={loginHref(pathname, search)} {...props}>
      {children}
    </Link>
  );
}

/**
 * 로그인 후 지금 보던 페이지로 돌아오도록 `next` 를 붙인다 (F1-2). `?sort=` 같은 쿼리도 함께 담는다 (P1-6 ⑧).
 * useSearchParams 는 Suspense 경계가 필요해, 그동안은 경로만 담은 링크를 보여 준다.
 */
export function LoginLink({ children, ...props }: Props) {
  const pathname = usePathname();
  return (
    <Suspense
      fallback={
        <Link href={loginHref(pathname)} {...props}>
          {children}
        </Link>
      }
    >
      <LoginLinkWithQuery {...props}>{children}</LoginLinkWithQuery>
    </Suspense>
  );
}
