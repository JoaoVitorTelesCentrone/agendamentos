"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  Clock,
  Wallet,
  Megaphone,
  Users,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

interface SidebarProps {
  business: { slug: string; name: string };
  user: { name?: string | null; email?: string | null; image?: string | null };
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/appointments", icon: Calendar, label: "Agendamentos" },
  { href: "/services", icon: Scissors, label: "Serviços" },
  { href: "/availability", icon: Clock, label: "Disponibilidade" },
  { href: "/finance", icon: Wallet, label: "Financeiro" },
  { href: "/marketing", icon: Megaphone, label: "Marketing" },
  { href: "/customers", icon: Users, label: "Clientes" },
  { href: "/settings", icon: Settings, label: "Configurações" },
];

function SidebarContent({
  business,
  user,
  pathname,
  onClose,
}: {
  business: SidebarProps["business"];
  user: SidebarProps["user"];
  pathname: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <Link href="/" onClick={onClose}>
          <span className="font-[family-name:var(--font-display)] text-lg text-[var(--text-primary)]">
            AgendaFlow
          </span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Business info */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
        <p className="text-[var(--text-tertiary)] text-xs mb-1">Seu negócio</p>
        <p className="text-[var(--text-primary)] text-sm font-medium truncate">{business.name}</p>
        <Link
          href={`/${business.slug}`}
          target="_blank"
          onClick={onClose}
          className="flex items-center gap-1 text-[var(--mint)] text-xs mt-1 hover:underline"
        >
          Ver página pública
          <ExternalLink size={10} />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-sm transition-colors",
                active
                  ? "bg-[var(--mint-dim)] text-[var(--mint)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-6 py-4 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 mb-3">
          {user.image ? (
            <img src={user.image} alt={user.name ?? ""} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-tertiary)] text-xs">
              {user.name?.[0] ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[var(--text-primary)] text-sm truncate">{user.name}</p>
            <p className="text-[var(--text-tertiary)] text-xs truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-xs transition-colors"
          >
            <LogOut size={12} />
            Sair
          </button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export function DashboardSidebar({ business, user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between">
        <span className="font-[family-name:var(--font-display)] text-lg text-[var(--text-primary)]">
          AgendaFlow
        </span>
        <button
          onClick={() => setMobileOpen(true)}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 h-screen w-72 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] z-50 transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          business={business}
          user={user}
          pathname={pathname}
          onClose={() => setMobileOpen(false)}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex-col">
        <SidebarContent business={business} user={user} pathname={pathname} />
      </aside>
    </>
  );
}
