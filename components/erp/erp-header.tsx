"use client"

import { Bell, LogOut, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ErpHeader({
  title,
  onLogout,
}: {
  title: string
  onLogout: () => void
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="검색..."
            className="w-56 pl-9"
            aria-label="검색"
          />
        </div>

        <Button variant="ghost" size="icon" aria-label="알림">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
            A
          </div>
          <div className="hidden flex-col leading-tight md:flex">
            <span className="text-sm font-medium text-foreground">관리자</span>
            <span className="text-xs text-muted-foreground">admin</span>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">로그아웃</span>
        </Button>
      </div>
    </header>
  )
}
