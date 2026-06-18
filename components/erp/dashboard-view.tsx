"use client"

import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Ban,
  CalendarCheck,
  Wallet,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const stats = [
  {
    label: "관리 법인 수",
    value: "48개사",
    change: "+3개사",
    up: true,
    icon: Building2,
  },
  {
    label: "이번 달 고정비 합계",
    value: "₩86,400,000",
    change: "+4.2%",
    up: true,
    icon: Wallet,
  },
  {
    label: "세무 진행 완료율",
    value: "72%",
    change: "+12%",
    up: true,
    icon: CalendarCheck,
  },
  {
    label: "폐업 법인",
    value: "5개사",
    change: "+1개사",
    up: false,
    icon: Ban,
  },
]

const taxProgress = [
  { corp: "한빛컴퍼니", task: "부가세 신고", due: "2026-06-25", status: "진행중" },
  { corp: "대성홀딩스", task: "원천세 신고", due: "2026-06-10", status: "완료" },
  { corp: "미래파트너스", task: "법인세 중간예납", due: "2026-06-30", status: "대기" },
  { corp: "정우산업", task: "4대보험 정산", due: "2026-06-15", status: "진행중" },
  { corp: "세진무역", task: "부가세 신고", due: "2026-06-25", status: "지연" },
]

const statusStyles: Record<string, string> = {
  완료: "bg-primary/10 text-primary",
  진행중: "bg-chart-2/15 text-chart-2",
  대기: "bg-chart-4/15 text-chart-4",
  지연: "bg-destructive/10 text-destructive",
}

export function DashboardView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <span className="text-2xl font-semibold text-foreground">{stat.value}</span>
                  <span
                    className={
                      "flex items-center gap-1 text-xs font-medium " +
                      (stat.up ? "text-primary" : "text-destructive")
                    }
                  >
                    {stat.up ? (
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {stat.change}
                  </span>
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
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-6 py-3 font-medium">법인명</th>
                  <th className="px-6 py-3 font-medium">업무</th>
                  <th className="px-6 py-3 font-medium">기한</th>
                  <th className="px-6 py-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {taxProgress.map((row) => (
                  <tr
                    key={row.corp + row.task}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-6 py-3 font-medium text-foreground">{row.corp}</td>
                    <td className="px-6 py-3 text-foreground">{row.task}</td>
                    <td className="px-6 py-3 text-foreground">{row.due}</td>
                    <td className="px-6 py-3">
                      <span
                        className={
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium " +
                          statusStyles[row.status]
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
