"use client"

import { useEffect, useState } from "react"
import { ErpSidebar, menuItems } from "@/components/erp/erp-sidebar"
import { ErpHeader } from "@/components/erp/erp-header"
import { BottomNav } from "@/components/erp/bottom-nav"
import { DashboardView } from "@/components/erp/dashboard-view"
import { MenuView } from "@/components/erp/menu-view"
import { CorporationsView } from "@/components/erp/corporations-view"
import { FixedCostView } from "@/components/erp/fixed-cost-view"
import { TelecomView } from "@/components/erp/telecom-view"
import { PrepaidView } from "@/components/erp/prepaid-view"
import { BusinessIncomeView } from "@/components/erp/business-income-view"
import { OperatingCostView } from "@/components/erp/operating-cost-view"
import { AuditRegionView } from "@/components/erp/audit-region-view"
import { LeaseView } from "@/components/erp/lease-view"
import { CorporationsProvider } from "@/components/erp/corporations-context"
import { ClosedCorporationsView } from "@/components/erp/closed-corporations-view"
import { UserManagementView } from "@/components/erp/user-management-view"
import { FixedExpenseView } from "@/components/erp/fixed-expense-view"
import { TaxProgressView } from "@/components/erp/tax-progress-view"
import { TradingCorporationsView } from "@/components/erp/trading-corporations-view"

const validIds = new Set(menuItems.map((m) => m.id))

function getInitialPage(): string {
  if (typeof window === "undefined") return "dashboard"
  const hash = window.location.hash.slice(1)
  return validIds.has(hash) ? hash : "dashboard"
}

export function ErpLayout({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState(getInitialPage)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const activeLabel = menuItems.find((m) => m.id === active)?.label ?? "대시보드"

  useEffect(() => {
    history.replaceState(null, "", `#${active}`)
  }, [active])

  useEffect(() => {
    document.title = `Freed | ${activeLabel}`
  }, [activeLabel])

  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.slice(1)
      if (validIds.has(hash)) setActive(hash)
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  // 화면 크기 변경 시 사이드바 닫기
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setSidebarOpen(false)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  function handleSelect(id: string) {
    setActive(id)
    setSidebarOpen(false)
  }

  return (
    <CorporationsProvider>
      <div className="flex h-svh overflow-hidden bg-muted/40">
        {/* 모바일 오버레이 */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <ErpSidebar active={active} onSelect={handleSelect} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <ErpHeader
            title={activeLabel}
            onLogout={onLogout}
            onMenuToggle={() => setSidebarOpen((o) => !o)}
          />
          <main className="flex-1 overflow-y-auto p-3 pb-20 sm:p-4 sm:pb-20 md:p-6 md:pb-6 [&>*]:min-h-full">
            {active === "dashboard" ? (
              <DashboardView />
            ) : active === "corporations" ? (
              <CorporationsView />
            ) : active === "fixed-cost" ? (
              <FixedCostView />
            ) : active === "telecom" ? (
              <TelecomView />
            ) : active === "prepaid" ? (
              <PrepaidView />
            ) : active === "business-income" ? (
              <BusinessIncomeView />
            ) : active === "operating-cost" ? (
              <OperatingCostView />
            ) : active === "audit-region" ? (
              <AuditRegionView />
            ) : active === "lease" ? (
              <LeaseView />
            ) : active === "closed" ? (
              <ClosedCorporationsView />
            ) : active === "fixed-expense" ? (
              <FixedExpenseView />
            ) : active === "tax-progress" ? (
              <TaxProgressView />
            ) : active === "trading-corporations" ? (
              <TradingCorporationsView />
            ) : active === "user-management" ? (
              <UserManagementView />
            ) : (
              <MenuView menuId={active} />
            )}
          </main>
        </div>

        <BottomNav
          active={active}
          onSelect={handleSelect}
          onMore={() => setSidebarOpen(true)}
        />
      </div>
    </CorporationsProvider>
  )
}
