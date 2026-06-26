"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Pencil, Trash2, ShieldCheck, ShieldOff, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { api, ApiError } from "@/lib/api"
import { getAccessToken } from "@/lib/auth"

type AdminUser = {
  id: number
  username: string
  displayName: string
  enabled: boolean
  createdAt: string
}

function getCurrentAdminId(): number | null {
  const token = getAccessToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    return Number(payload.sub)
  } catch {
    return null
  }
}

const emptyForm = { username: "", displayName: "", password: "" }

export function UserManagementView() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(emptyForm)
  const [addError, setAddError] = useState("")
  const [addLoading, setAddLoading] = useState(false)
  const [showAddPw, setShowAddPw] = useState(false)

  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({ displayName: "", password: "" })
  const [editError, setEditError] = useState("")
  const [editLoading, setEditLoading] = useState(false)
  const [showEditPw, setShowEditPw] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const myId = getCurrentAdminId()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<AdminUser[]>("/api/admins")
      setUsers(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError("")
    setAddLoading(true)
    try {
      const created = await api.post<AdminUser>("/api/admins", {
        username: addForm.username.trim(),
        displayName: addForm.displayName.trim(),
        password: addForm.password,
      })
      setUsers((prev) => [...prev, created])
      setShowAdd(false)
      setAddForm(emptyForm)
    } catch (e) {
      setAddError(e instanceof ApiError ? e.message : "등록 실패")
    } finally {
      setAddLoading(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setEditError("")
    setEditLoading(true)
    try {
      const updated = await api.put<AdminUser>(`/api/admins/${editTarget.id}`, {
        displayName: editForm.displayName.trim(),
        password: editForm.password || null,
      })
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      setEditTarget(null)
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : "수정 실패")
    } finally {
      setEditLoading(false)
    }
  }

  async function handleToggleEnabled(user: AdminUser) {
    try {
      const updated = await api.patch<AdminUser>(`/api/admins/${user.id}/toggle-enabled`)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "변경 실패")
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.delete(`/api/admins/${deleteTarget.id}`)
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "삭제 실패")
    } finally {
      setDeleteLoading(false)
    }
  }

  function openEdit(user: AdminUser) {
    setEditTarget(user)
    setEditForm({ displayName: user.displayName, password: "" })
    setEditError("")
    setShowEditPw(false)
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">사용자 관리</h2>
          <p className="text-sm text-muted-foreground">시스템 관리자 계정을 등록하고 관리합니다.</p>
        </div>
        <Button size="sm" onClick={() => { setShowAdd(true); setAddForm(emptyForm); setAddError("") }}>
          <Plus className="mr-1.5 h-4 w-4" />
          사용자 등록
        </Button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">불러오는 중...</div>
      ) : error ? (
        <div className="py-20 text-center text-sm text-destructive">{error}</div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">번호</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">아이디</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">이름</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">상태</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">등록일</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">관리</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">등록된 사용자가 없습니다.</td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      {user.username}
                      {user.id === myId && (
                        <Badge variant="outline" className="ml-2 text-[10px]">나</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">{user.displayName}</td>
                    <td className="px-4 py-3">
                      {user.enabled ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">활성</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">비활성</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={user.enabled ? "비활성화" : "활성화"}
                          disabled={user.id === myId}
                          onClick={() => handleToggleEnabled(user)}
                        >
                          {user.enabled
                            ? <ShieldOff className="h-4 w-4 text-muted-foreground" />
                            : <ShieldCheck className="h-4 w-4 text-green-600" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="수정"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="삭제"
                          disabled={user.id === myId}
                          onClick={() => setDeleteTarget(user)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive/70" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 사용자 등록 다이얼로그 */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>사용자 등록</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>아이디</Label>
              <Input
                value={addForm.username}
                onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="아이디 입력"
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>이름</Label>
              <Input
                value={addForm.displayName}
                onChange={(e) => setAddForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="표시 이름 입력"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>비밀번호</Label>
              <div className="relative">
                <Input
                  type={showAddPw ? "text" : "password"}
                  value={addForm.password}
                  onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="4자 이상"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAddPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAddPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>취소</Button>
              <Button type="submit" disabled={addLoading}>{addLoading ? "등록 중..." : "등록"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 사용자 수정 다이얼로그 */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>사용자 수정 — {editTarget?.username}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>이름</Label>
              <Input
                value={editForm.displayName}
                onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="표시 이름"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>비밀번호 변경 <span className="text-muted-foreground font-normal">(선택)</span></Label>
              <div className="relative">
                <Input
                  type={showEditPw ? "text" : "password"}
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="변경할 비밀번호 (비워두면 유지)"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showEditPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>취소</Button>
              <Button type="submit" disabled={editLoading}>{editLoading ? "저장 중..." : "저장"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>사용자 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            <span className="font-semibold text-foreground">{deleteTarget?.displayName}</span> ({deleteTarget?.username}) 계정을 삭제하시겠습니까?
            <br />삭제 후 복구할 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button variant="destructive" disabled={deleteLoading} onClick={handleDelete}>
              {deleteLoading ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
