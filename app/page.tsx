"use client"

import { useEffect, useState } from "react"
import { AdminLoginForm } from "@/components/admin-login-form"
import { ReloginModal } from "@/components/relogin-modal"
import { ErpLayout } from "@/components/erp/erp-layout"
import { isAuthenticated, isPersistLogin, getPersistedUsername, logout } from "@/lib/auth"
import { onUnauthorized } from "@/lib/api"

export default function Page() {
  const [isAuthed, setIsAuthed] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [showRelogin, setShowRelogin] = useState(false)
  const [reloginUsername, setReloginUsername] = useState("")

  useEffect(() => {
    setIsAuthed(isAuthenticated())
    setHydrated(true)

    return onUnauthorized(() => {
      if (isPersistLogin()) {
        setReloginUsername(getPersistedUsername())
        setShowRelogin(true)
      } else {
        logout()
        setIsAuthed(false)
      }
    })
  }, [])

  function handleLogout() {
    logout()
    setIsAuthed(false)
    setShowRelogin(false)
  }

  if (!hydrated) return null

  return (
    <>
      {isAuthed ? (
        <ErpLayout onLogout={handleLogout} />
      ) : !showRelogin ? (
        <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
          <AdminLoginForm onSuccess={() => setIsAuthed(true)} />
        </main>
      ) : null}

      {showRelogin && (
        <ReloginModal
          username={reloginUsername}
          onSuccess={() => { setShowRelogin(false); setIsAuthed(true) }}
          onLogout={handleLogout}
        />
      )}
    </>
  )
}
