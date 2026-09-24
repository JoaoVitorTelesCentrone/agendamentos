"use client";

import { usePathname, useRouter } from "next/navigation";
import { ContinuousTabs } from "@/components/watermelon/continuous-tabs";

const tabs = [
  { id: "overview", label: "Visão geral", href: "/dashboard" },
  { id: "appointments", label: "Agendamentos", href: "/appointments" },
  { id: "finance", label: "Financeiro", href: "/finance" },
  { id: "settings", label: "Configurações", href: "/settings" },
];

export function DashboardViewTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const activeId = tabs.find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))?.id ?? "overview";

  return (
    <div className="mb-7 overflow-x-auto pb-1">
      <ContinuousTabs
        key={activeId}
        tabs={tabs.map(({ id, label }) => ({ id, label }))}
        defaultActiveId={activeId}
        onChange={(id) => {
          const destination = tabs.find((tab) => tab.id === id)?.href;
          if (destination && destination !== pathname) router.push(destination);
        }}
      />
    </div>
  );
}
