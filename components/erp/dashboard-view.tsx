"use client"

import { useEffect, useState } from "react"
import {
  Building2,
  Ban,
  CalendarCheck,
  Wallet,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiError, api } from "@/lib/api"

type DashboardStats = {
  managedCorporationCount: number
  closedCorporationCount: number
  monthlyFixedCost: number
  monthlyFixedCostCount: number
  currentMonth: string
}

function formatMoney(amount: number): string {
  return "₩" + Math.round(amount).toLocaleString("ko-KR")
}

export function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<DashboardStats>("/api/dashboard/stats")
      .then((s) => {
        if (!cancelled) setStats(s)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "통계를 불러오지 못했습니다.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const cards = [
    {
      label: "관리 법인 수",
      value: stats ? `${stats.managedCorporationCount}개사` : "-",
      icon: Building2,
    },
    {
      label: "이번 달 고정비 합계",
      value: stats ? formatMoney(stats.monthlyFixedCost) : "-",
      sub: stats ? `${stats.monthlyFixedCostCount}건` : undefined,
      icon: Wallet,
    },
    {
      label: "현재 기준 월",
      value: stats?.currentMonth?.slice(0, 7) ?? "-",
      icon: CalendarCheck,
    },
    {
      label: "폐업 법인",
      value: stats ? `${stats.closedCorporationCount}개사` : "-",
      icon: Ban,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">{card.label}</span>
                  <span className="text-2xl font-semibold text-foreground">
                    {loading ? "..." : card.value}
                  </span>
                  {card.sub ? (
                    <span className="text-xs text-muted-foreground">{card.sub}</span>
                  ) : null}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">이번 달 세무 진행현황</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-sm text-muted-foreground">
          세무 진행 데이터는 추후 추가될 예정입니다.
        </CardContent>
      </Card>
    </div>
  )
}
