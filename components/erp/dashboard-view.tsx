"use client"

import { useEffect, useState } from "react"
import {
  Building2,
  Ban,
  FileText,
  Phone,
  Wallet,
  Signal,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  CalendarX,
  TrendingUp,
  ListTodo,
  CalendarClock,
} from "lucide-react"
import { ApiError, api } from "@/lib/api"
import { cn } from "@/lib/utils"

type TaskItem = {
  id: number
  corpName: string
  task: string
  dueDate: string
  manager: string
  status: string
}

type DashboardStats = {
  managedCorporationCount: number
  closedCorporationCount: number
  monthlyFixedCost: number
  monthlyFixedCostCount: number
  currentMonth: string
  activeLeaseCount: number
  expiringLeaseCount: number
  telecomCost: number
  telecomCount: number
  prepaidInProgressAmount: number
  prepaidInProgressCount: number
  taxProgressTotal: number
  taxProgressDoneCount: number
  todayTasks: TaskItem[]
  tomorrowTasks: TaskItem[]
}

function formatMoney(amount: number): string {
  if (amount >= 100_000_000) {
    const eok = Math.floor(amount / 100_000_000)
    const rest = amount % 100_000_000
    if (rest === 0) return `${eok.toLocaleString("ko-KR")}억`
    return `${eok.toLocaleString("ko-KR")}억 ${Math.round(rest / 10_000).toLocaleString("ko-KR")}만`
  }
  if (amount >= 10_000) {
    return `${Math.round(amount / 10_000).toLocaleString("ko-KR")}만원`
  }
  return "₩" + Math.round(amount).toLocaleString("ko-KR")
}

function formatMoneyFull(amount: number): string {
  return "₩" + Math.round(amount).toLocaleString("ko-KR")
}

function todayLabel(): string {
  const d = new Date()
  const days = ["일", "월", "화", "수", "목", "금", "토"]
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />
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
      .then((s) => { if (!cancelled) setStats(s) })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : "통계를 불러오지 못했습니다.")
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const taxPct = stats && stats.taxProgressTotal > 0
    ? Math.round((stats.taxProgressDoneCount / stats.taxProgressTotal) * 100)
    : 0

  return (
    <div className="flex flex-col gap-8">
      {/* 헤더 */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
          <p className="mt-1 text-sm text-muted-foreground">{todayLabel()}</p>
        </div>
        {!loading && stats && (
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            정상 운영 중
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 법인 현황 */}
      <section>
        <SectionLabel icon={Building2} label="법인 현황" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="관리 법인"
            value={loading ? null : `${stats!.managedCorporationCount.toLocaleString("ko-KR")}개사`}
            icon={Building2}
            color="blue"
            href="#corporations"
          />
          <StatCard
            label="폐업 법인"
            value={loading ? null : `${stats!.closedCorporationCount.toLocaleString("ko-KR")}개사`}
            icon={Ban}
            color="gray"
            href="#closed"
          />
          <StatCard
            label="임대차 활성 계약"
            value={loading ? null : `${stats!.activeLeaseCount.toLocaleString("ko-KR")}건`}
            sub={stats && stats.expiringLeaseCount > 0 ? `30일 내 만료 ${stats.expiringLeaseCount}건` : undefined}
            subColor="amber"
            icon={FileText}
            color={stats && stats.expiringLeaseCount > 0 ? "amber" : "blue"}
            href="#lease"
          />
          <StatCard
            label="통신 회선"
            value={loading ? null : `${stats!.telecomCount.toLocaleString("ko-KR")}회선`}
            icon={Phone}
            color="blue"
            href="#telecom"
          />
        </div>
      </section>

      {/* 비용 현황 */}
      <section>
        <SectionLabel icon={TrendingUp} label="비용 현황" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="고정비 합계"
            value={loading ? null : formatMoney(stats!.monthlyFixedCost)}
            sub={stats ? `${stats.monthlyFixedCostCount}건` : undefined}
            icon={Wallet}
            color="violet"
            href="#fixed-cost"
          />
          <StatCard
            label="통신비 합계"
            value={loading ? null : formatMoney(stats!.telecomCost)}
            sub={stats && stats.telecomCost >= 10_000 ? formatMoneyFull(stats.telecomCost) : undefined}
            icon={Signal}
            color="violet"
            href="#telecom"
          />
          <StatCard
            label="선지급 진행중"
            value={loading ? null : formatMoney(stats!.prepaidInProgressAmount)}
            sub={stats ? `${stats.prepaidInProgressCount}건` : undefined}
            subColor={stats && stats.prepaidInProgressCount > 0 ? "amber" : undefined}
            icon={CreditCard}
            color={stats && stats.prepaidInProgressCount > 0 ? "amber" : "violet"}
            href="#prepaid"
          />
          <StatCard
            label="임대차 30일 만료"
            value={loading ? null : `${stats!.expiringLeaseCount.toLocaleString("ko-KR")}건`}
            icon={CalendarX}
            color={stats && stats.expiringLeaseCount > 0 ? "red" : "gray"}
            href="#lease"
          />
        </div>
      </section>

      {/* 세무 + 만료 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 세무 진행현황 */}
        <a href="#tax-progress" className="rounded-xl border bg-card p-5 shadow-sm block hover:bg-muted/30 transition-colors">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="font-semibold text-foreground">세무 진행현황</span>
          </div>
          {loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-2.5 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : stats && stats.taxProgressTotal > 0 ? (
            <>
              <div className="mb-2 flex items-end justify-between">
                <span className="text-3xl font-bold text-foreground">{taxPct}%</span>
                <span className="text-sm text-muted-foreground">전체 {stats.taxProgressTotal}건</span>
              </div>
              <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${taxPct}%` }}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-muted-foreground">완료</span>
                  <span className="font-semibold">{stats.taxProgressDoneCount}건</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-muted-foreground">미완료</span>
                  <span className="font-semibold">{stats.taxProgressTotal - stats.taxProgressDoneCount}건</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">등록된 세무 진행 항목이 없습니다.</p>
          )}
        </a>

        {/* 임대차 만료 예정 */}
        <a href="#lease" className={cn(
          "rounded-xl border p-5 shadow-sm block transition-colors hover:brightness-95",
          stats && stats.expiringLeaseCount > 0
            ? "border-red-200 bg-red-50"
            : "bg-card hover:bg-muted/30"
        )}>
          <div className="mb-4 flex items-center gap-2">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              stats && stats.expiringLeaseCount > 0 ? "bg-red-100" : "bg-muted"
            )}>
              <CalendarClock className={cn(
                "h-4 w-4",
                stats && stats.expiringLeaseCount > 0 ? "text-red-600" : "text-muted-foreground"
              )} />
            </div>
            <span className="font-semibold text-foreground">임대차 30일 내 만료</span>
          </div>
          {loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : stats && stats.expiringLeaseCount > 0 ? (
            <>
              <p className="text-3xl font-bold text-red-600 mb-2">
                {stats.expiringLeaseCount}건
              </p>
              <div className="flex items-start gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>임대차 현황 메뉴에서 만료 예정 계약을 확인하고 갱신 여부를 검토하세요.</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">30일 이내 만료 예정인 계약이 없습니다.</p>
          )}
        </a>
      </div>

      {/* 오늘 / 내일 할일 */}
      <section>
        <SectionLabel icon={ListTodo} label="할일" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TaskCard
            title="오늘 할일"
            tasks={stats?.todayTasks ?? []}
            loading={loading}
            emptyMessage="오늘 마감인 항목이 없습니다."
            accent="red"
            href="#tax-progress"
          />
          <TaskCard
            title="내일 할일"
            tasks={stats?.tomorrowTasks ?? []}
            loading={loading}
            emptyMessage="내일 마감인 항목이 없습니다."
            accent="amber"
            href="#tax-progress"
          />
        </div>
      </section>
    </div>
  )
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  )
}

type Color = "blue" | "violet" | "amber" | "red" | "green" | "gray"

const colorMap: Record<Color, { bg: string; icon: string; border: string }> = {
  blue:   { bg: "bg-blue-50",   icon: "text-blue-600",   border: "border-l-blue-400" },
  violet: { bg: "bg-violet-50", icon: "text-violet-600", border: "border-l-violet-400" },
  amber:  { bg: "bg-amber-50",  icon: "text-amber-600",  border: "border-l-amber-400" },
  red:    { bg: "bg-red-50",    icon: "text-red-600",    border: "border-l-red-400" },
  green:  { bg: "bg-emerald-50",icon: "text-emerald-600",border: "border-l-emerald-400" },
  gray:   { bg: "bg-muted/50",  icon: "text-muted-foreground", border: "border-l-border" },
}

function StatCard({
  label,
  value,
  sub,
  subColor,
  icon: Icon,
  color = "blue",
  href,
}: {
  label: string
  value: string | null
  sub?: string
  subColor?: "amber" | "red"
  icon: React.ElementType
  color?: Color
  href?: string
}) {
  const c = colorMap[color]
  const inner = (
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {value === null ? (
          <Skeleton className="h-7 w-20 mt-1" />
        ) : (
          <span className="text-xl font-bold text-foreground truncate">{value}</span>
        )}
        {sub && value !== null ? (
          <span className={cn(
            "text-xs",
            subColor === "amber" ? "text-amber-600 font-medium" :
            subColor === "red"   ? "text-red-600 font-medium" :
            "text-muted-foreground"
          )}>
            {sub}
          </span>
        ) : null}
      </div>
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", c.bg)}>
        <Icon className={cn("h-4.5 w-4.5", c.icon)} aria-hidden="true" />
      </div>
    </div>
  )

  const cls = cn(
    "rounded-xl border border-l-4 bg-card p-4 shadow-sm transition-colors block",
    c.border,
    href && "cursor-pointer hover:bg-muted/30"
  )

  if (href) {
    return <a href={href} className={cls}>{inner}</a>
  }
  return <div className={cls}>{inner}</div>
}

function TaskCard({
  title,
  tasks,
  loading,
  emptyMessage,
  accent,
  href,
}: {
  title: string
  tasks: TaskItem[]
  loading: boolean
  emptyMessage: string
  accent: "red" | "amber"
  href?: string
}) {
  const headerColor = accent === "red"
    ? "bg-red-500"
    : "bg-amber-500"
  const badgeBg = accent === "red"
    ? "bg-white/20 text-white"
    : "bg-white/20 text-white"
  const dotClass = accent === "red" ? "bg-red-400" : "bg-amber-400"

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <a href={href} className={cn("flex items-center justify-between px-4 py-3", headerColor, href && "hover:brightness-110 transition-all")}>
        <span className="text-sm font-semibold text-white">{title}</span>
        {!loading && (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", badgeBg)}>
            {tasks.length}건
          </span>
        )}
      </a>
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{emptyMessage}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotClass)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium truncate">{t.task}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{t.corpName}</span>
                  </div>
                  {t.manager && (
                    <span className="text-xs text-muted-foreground">담당: {t.manager}</span>
                  )}
                </div>
                <span className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                  t.status === "완료"   ? "bg-emerald-100 text-emerald-700" :
                  t.status === "진행중" ? "bg-sky-100 text-sky-700" :
                                          "bg-muted text-muted-foreground"
                )}>
                  {t.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
