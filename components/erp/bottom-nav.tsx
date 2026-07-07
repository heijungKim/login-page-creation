"use client"

import {
  LayoutDashboard,
  Building2,
  FileSignature,
  CalendarCheck,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { id: "dashboard",    label: "대시보드",  icon: LayoutDashboard },
  { id: "corporations", label: "법인",      icon: Building2 },
  { id: "lease",        label: "임대차",    icon: FileSignature },
  { id: "tax-progress", label: "세무",      icon: CalendarCheck },
]

export function BottomNav({
  active,
  onSelect,
  onMore,
}: {
  active: string
  onSelect: (id: string) => void
  onMore: () => void
}) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 flex h-16 items-stretch border-t border-border bg-card md:hidden safe-area-bottom">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "")} />
            <span>{item.label}</span>
          </button>
        )
      })}
      {/* 더보기 버튼 → 사이드바 열기 */}
      <button
        type="button"
        onClick={onMore}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <MoreHorizontal className="h-5 w-5" />
        <span>더보기</span>
      </button>
    </nav>
  )
}
