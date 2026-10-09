export function Footer() {
  return (
    // 모바일은 하단 탭바가 바닥을 차지하므로 푸터를 숨긴다
    <footer className="hidden border-t border-border py-6 text-center text-xs text-muted-foreground md:block">
      © 2026 IdolUniv. All rights reserved.
    </footer>
  );
}
