"use client"

import { useState } from "react"
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, login } from "@/lib/api"

export function ReloginModal({
  username,
  onSuccess,
  onLogout,
}: {
  username: string
  onSuccess: () => void
  onLogout: () => void
}) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) { setError("비밀번호를 입력하세요."); return }
    setLoading(true)
    setError("")
    try {
      await login(username, password, true)
      onSuccess()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">세션이 만료되었습니다</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{username}</span> 계정의 비밀번호를 입력해 계속하세요.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="relogin-password">비밀번호</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="relogin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
                autoFocus
                className="pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "확인 중..." : "계속하기"}
          </Button>
          <button
            type="button"
            onClick={onLogout}
            className="text-center text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            다른 계정으로 로그인
          </button>
        </form>
      </div>
    </div>
  )
}
