import Link from "next/link";

const navItems = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/groups", label: "아이돌 그룹", icon: "🎤" },
  { href: "/community", label: "커뮤니티", icon: "💬" },
  { href: "/chat", label: "채팅", icon: "⚡" },
  { href: "/profile", label: "마이페이지", icon: "👤" },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-sidebar min-h-screen pt-4">
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary transition-colors"
          >
            <span className="text-base">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
