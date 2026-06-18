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
} from "lucide-react"
import { cn } from "@/lib/utils"

type MenuItem = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "corporations", label: "법인 관리", icon: Building2 },
  { id: "fixed-cost", label: "고정 비용", icon: Wallet },
  { id: "telecom", label: "통신비", icon: Smartphone },
  { id: "prepaid", label: "선지급 내역", icon: HandCoins },
  { id: "business-income", label: "사업소득", icon: TrendingUp },
  { id: "closed", label: "폐업 법인", icon: Ban },
  { id: "audit-region", label: "감사/사업자 지역", icon: MapPinned },
  { id: "lease", label: "임대차 현황", icon: FileSignature },
  { id: "fixed-expense", label: "고정지출", icon: ReceiptText },
  { id: "operating-cost", label: "운영비 관리", icon: PiggyBank },
  { id: "tax-progress", label: "월 세무 진행현황", icon: CalendarCheck },
]

export function ErpSidebar({
  active,
  onSelect,
}: {
  active: string
  onSelect: (id: string) => void
}) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-sidebar-foreground">법인 세무 관리</span>
          <span className="text-xs text-sidebar-foreground/60">ERP System</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="주 메뉴">
        <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/40">
          메뉴
        </p>
        <ul className="flex flex-col gap-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs text-sidebar-foreground/50">© 2026 법인 세무 관리</p>
      </div>
    </aside>
  )
}

export { menuItems }
