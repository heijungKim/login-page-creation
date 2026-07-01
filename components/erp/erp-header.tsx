"use client"

import { LogOut, Bell, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ErpHeader({
  title,
  onLogout,
  onMenuToggle,
}: {
  title: string
  onLogout: () => void
  onMenuToggle?: () => void
}) {
  const now = new Date()
  const dateStr = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 md:hidden"
          onClick={onMenuToggle}
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="h-5 w-0.5 rounded-full bg-primary hidden md:block" />
        <h1 className="text-base font-bold text-foreground truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        <span className="hidden text-xs text-muted-foreground lg:block">{dateStr}</span>

        <div className="hidden mx-1 h-4 w-px bg-border md:block" />

        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="알림">
          <Bell className="h-4 w-4" aria-hidden="true" />
        </Button>

        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shrink-0">
            A
          </div>
          <div className="hidden flex-col leading-none sm:flex">
            <span className="text-xs font-semibold text-foreground">관리자</span>
            <span className="text-[10px] text-muted-foreground">admin</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="h-8 gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden text-xs sm:inline">로그아웃</span>
        </Button>
      </div>
    </header>
  )
}
