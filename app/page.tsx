"use client"

import { useState } from "react"
import { AdminLoginForm } from "@/components/admin-login-form"
import { ErpLayout } from "@/components/erp/erp-layout"

export default function Page() {
  const [isAuthed, setIsAuthed] = useState(false)

  if (isAuthed) {
    return <ErpLayout onLogout={() => setIsAuthed(false)} />
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <AdminLoginForm onSuccess={() => setIsAuthed(true)} />
    </main>
  )
}
