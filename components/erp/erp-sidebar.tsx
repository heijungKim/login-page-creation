"use client"

import {
  LayoutDashboard,
  Building2,
  Wallet,
  Smartphone,
  HandCoins,
  TrendingUp,
  Ban,
  MapPinned,
  FileSignature,
  ReceiptText,
  PiggyBank,
  CalendarCheck,
  Users,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

type MenuItem = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

type MenuGroup = {
  label: string
  items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
  {
    label: "",
    items: [
      { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
    ],
  },
  {
    label: "법인 관리",
    items: [
      { id: "corporations", label: "법인 관리", icon: Building2 },
      { id: "closed", label: "폐업 법인", icon: Ban },
      { id: "lease", label: "임대차 현황", icon: FileSignature },
      { id: "audit-region", label: "감사/사업자 지역", icon: MapPinned },
    ],
  },
  {
    label: "비용 관리",
    items: [
      { id: "fixed-cost", label: "고정 비용", icon: Wallet },
      { id: "telecom", label: "통신비", icon: Smartphone },
      { id: "prepaid", label: "선지급 내역", icon: HandCoins },
      { id: "operating-cost", label: "운영비 관리", icon: PiggyBank },
      { id: "fixed-expense", label: "고정지출", icon: ReceiptText },
    ],
  },
  {
    label: "소득 / 세무",
    items: [
      { id: "business-income", label: "사업소득", icon: TrendingUp },
      { id: "tax-progress", label: "월 세무 진행현황", icon: CalendarCheck },
    ],
  },
  {
    label: "시스템",
    items: [
      { id: "user-management", label: "사용자 관리", icon: Users },
    ],
  },
]

export const menuItems: MenuItem[] = menuGroups.flatMap((g) => g.items)

export function ErpSidebar({
  active,
  onSelect,
  open,
}: {
  active: string
  onSelect: (id: string) => void
  open?: boolean
}) {
  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-40 flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-in-out",
      "md:static md:z-auto md:translate-x-0",
      open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
    )}>
      {/* 로고 */}
      <div className="flex h-14 items-center justify-between gap-3 px-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary shadow-md shadow-sidebar-primary/30">
            <span className="text-white font-black text-lg leading-none select-none">F</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-sidebar-foreground">Freed</span>
            <span className="text-[11px] text-sidebar-foreground/50 font-medium tracking-wide">ERP System</span>
          </div>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto py-3 px-3" aria-label="주 메뉴">
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className={cn(gIdx > 0 && "mt-5")}>
            {group.label && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35">
                {group.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = active === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-sidebar-primary text-white shadow-sm shadow-sidebar-primary/40"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-sidebar-foreground/50")} aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* 하단 */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="text-[11px] text-sidebar-foreground/35">© 2026 Freed</p>
      </div>
    </aside>
  )
}
