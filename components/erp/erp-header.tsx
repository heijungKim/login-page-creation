"use client"

import { LogOut, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ErpHeader({
  title,
  onLogout,
}: {
  title: string
  onLogout: () => void
}) {
  const now = new Date()
  const dateStr = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        <div className="h-5 w-0.5 rounded-full bg-primary" />
        <h1 className="text-base font-bold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-muted-foreground sm:block">{dateStr}</span>

        <div className="mx-2 h-4 w-px bg-border" />

        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="알림">
          <Bell className="h-4 w-4" aria-hidden="true" />
        </Button>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            A
          </div>
          <div className="hidden flex-col leading-none md:flex">
            <span className="text-xs font-semibold text-foreground">관리자</span>
            <span className="text-[10px] text-muted-foreground">admin</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="h-8 gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden text-xs sm:inline">로그아웃</span>
        </Button>
      </div>
    </header>
  )
}
