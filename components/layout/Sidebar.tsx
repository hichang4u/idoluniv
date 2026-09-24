"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Mic, Zap, User } from "lucide-react";

import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/board", label: "게시판", icon: ClipboardList },
  { href: "/groups", label: "아이돌 그룹", icon: Mic },
  { href: "/chat", label: "채팅", icon: Zap },
  { href: "/profile", label: "마이페이지", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <SidebarRoot collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);

                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={
                        <Link href={href}>
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarRoot>
  );
}
