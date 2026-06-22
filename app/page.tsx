"use client"

import { useEffect, useState } from "react"
import { AdminLoginForm } from "@/components/admin-login-form"
import { ErpLayout } from "@/components/erp/erp-layout"
import { isAuthenticated, logout } from "@/lib/auth"
import { onUnauthorized } from "@/lib/api"

export default function Page() {
  const [isAuthed, setIsAuthed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setIsAuthed(isAuthenticated())
    setHydrated(true)
    return onUnauthorized(() => setIsAuthed(false))
  }, [])

  if (!hydrated) return null

  if (isAuthed) {
    return (
      <ErpLayout
        onLogout={() => {
          logout()
          setIsAuthed(false)
        }}
      />
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <AdminLoginForm onSuccess={() => setIsAuthed(true)} />
    </main>
  )
}
