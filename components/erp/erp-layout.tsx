"use client"

import { useEffect, useState } from "react"
import { ErpSidebar, menuItems } from "@/components/erp/erp-sidebar"
import { ErpHeader } from "@/components/erp/erp-header"
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

const validIds = new Set(menuItems.map((m) => m.id))

function getInitialPage(): string {
  if (typeof window === "undefined") return "dashboard"
  const hash = window.location.hash.slice(1)
  return validIds.has(hash) ? hash : "dashboard"
}

export function ErpLayout({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState(getInitialPage)
  const activeLabel = menuItems.find((m) => m.id === active)?.label ?? "대시보드"

  useEffect(() => {
    history.replaceState(null, "", `#${active}`)
  }, [active])

  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.slice(1)
      if (validIds.has(hash)) setActive(hash)
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  return (
    <CorporationsProvider>
    <div className="flex h-svh overflow-hidden bg-muted/40">
      <ErpSidebar active={active} onSelect={setActive} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ErpHeader title={activeLabel} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto p-6">
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
          ) : active === "user-management" ? (
            <UserManagementView />
          ) : (
            <MenuView menuId={active} />
          )}
        </main>
      </div>
    </div>
    </CorporationsProvider>
  )
}
