"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { ExcelUploadButton, type ExcelColumn } from "@/components/erp/excel-upload-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { api, ApiError } from "@/lib/api"

type TaxProgress = {
  id: number
  corpName: string
  task: string
  dueDate: string
  manager: string
  status: string
  memo: string
  createdAt: string
}

const STATUS_OPTIONS = ["대기", "진행중", "완료", "지연"]

const statusStyles: Record<string, string> = {
  대기: "bg-amber-100 text-amber-700",
  진행중: "bg-blue-100 text-blue-700",
  완료: "bg-primary/10 text-primary",
  지연: "bg-destructive/10 text-destructive",
}

type FormState = {
  corpName: string
  task: string
  dueDate: string
  manager: string
  status: string
  memo: string
}

const emptyForm: FormState = {
  corpName: "", task: "", dueDate: "", manager: "", status: "대기", memo: "",
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  )
}

function TaxForm({
  form, setForm, onSubmit, onCancel, submitLabel, loading, error,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  submitLabel: string
  loading: boolean
  error: string
}) {
  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }))
  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>법인명</Label>
          <Input value={form.corpName} onChange={(e) => set("corpName", e.target.value)} placeholder="법인명" required />
        </div>
        <div className="space-y-1.5">
          <Label>신고 업무</Label>
          <Input value={form.task} onChange={(e) => set("task", e.target.value)} placeholder="예: 부가세 신고" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>신고기한</Label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>담당자 <span className="text-muted-foreground font-normal">(선택)</span></Label>
          <Input value={form.manager} onChange={(e) => set("manager", e.target.value)} placeholder="담당자명" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>진행상태</Label>
        <Select value={form.status} onValueChange={(v) => set("status", v)}>
          <SelectTrigger><span>{form.status}</span></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>메모 <span className="text-muted-foreground font-normal">(선택)</span></Label>
        <Textarea value={form.memo} onChange={(e) => set("memo", e.target.value)} placeholder="메모" rows={2} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>취소</Button>
        <Button type="submit" disabled={loading}>{loading ? "처리 중..." : submitLabel}</Button>
      </DialogFooter>
    </form>
  )
}

export function TaxProgressView() {
  const [rows, setRows] = useState<TaxProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<FormState>(emptyForm)
  const [addError, setAddError] = useState("")
  const [addLoading, setAddLoading] = useState(false)

  const [editTarget, setEditTarget] = useState<TaxProgress | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)
  const [editError, setEditError] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<TaxProgress | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<TaxProgress[]>("/api/tax-progress")
      setRows([...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
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
      const created = await api.post<TaxProgress>("/api/tax-progress", {
        corpName: addForm.corpName.trim(),
        task: addForm.task.trim(),
        dueDate: addForm.dueDate,
        manager: addForm.manager.trim(),
        status: addForm.status,
        memo: addForm.memo,
      })
      setRows((prev) => [...prev, created])
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
      const updated = await api.put<TaxProgress>(`/api/tax-progress/${editTarget.id}`, {
        corpName: editForm.corpName.trim(),
        task: editForm.task.trim(),
        dueDate: editForm.dueDate,
        manager: editForm.manager.trim(),
        status: editForm.status,
        memo: editForm.memo,
      })
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setEditTarget(null)
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : "수정 실패")
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.delete(`/api/tax-progress/${deleteTarget.id}`)
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "삭제 실패")
    } finally {
      setDeleteLoading(false)
    }
  }

  function openEdit(row: TaxProgress) {
    setEditTarget(row)
    setEditForm({
      corpName: row.corpName,
      task: row.task,
      dueDate: row.dueDate,
      manager: row.manager,
      status: row.status,
      memo: row.memo,
    })
    setEditError("")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">월 세무 진행현황</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "불러오는 중..." : `전체 ${rows.length}건`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExcelUploadButton
            templateName="세무진행현황"
            columns={[
              { key: "corpName", label: "법인명", required: true, example: "한빛컴퍼니" },
              { key: "task", label: "신고업무", required: true, example: "부가가치세 신고" },
              { key: "dueDate", label: "신고기한", required: true, example: "2025-01-25" },
              { key: "manager", label: "담당자", example: "홍길동" },
              { key: "status", label: "진행상태", example: "대기" },
              { key: "memo", label: "메모", example: "" },
            ] satisfies ExcelColumn[]}
            onRows={async (rows) => {
              let success = 0
              const failed: Array<{ row: number; reason: string }> = []
              for (let i = 0; i < rows.length; i++) {
                const r = rows[i]
                try {
                  await api.post("/api/tax-progress", {
                    corpName: r.corpName, task: r.task, dueDate: r.dueDate,
                    manager: r.manager || "", status: r.status || "대기", memo: r.memo || "",
                  })
                  success++
                } catch (e) { failed.push({ row: i + 2, reason: e instanceof ApiError ? e.message : "오류" }) }
              }
              await load()
              return { success, failed }
            }}
          />
          <Button size="sm" onClick={() => { setShowAdd(true); setAddForm(emptyForm); setAddError("") }}>
            <Plus className="mr-1.5 h-4 w-4" />항목 등록
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">법인명</th>
              <th className="px-4 py-3 font-medium">신고 업무</th>
              <th className="px-4 py-3 font-medium">신고기한</th>
              <th className="px-4 py-3 font-medium">담당자</th>
              <th className="px-4 py-3 font-medium">진행상태</th>
              <th className="px-4 py-3 font-medium">메모</th>
              <th className="px-4 py-3 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">불러오는 중...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">등록된 항목이 없습니다.</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{row.corpName}</td>
                  <td className="px-4 py-3">{row.task}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.dueDate}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.manager || "-"}</td>
                  <td className="px-4 py-3"><StatusChip status={row.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{row.memo || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="수정" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="삭제" onClick={() => setDeleteTarget(row)}>
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

      {/* 등록 */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>세무 진행현황 등록</DialogTitle></DialogHeader>
          <TaxForm
            form={addForm} setForm={setAddForm}
            onSubmit={handleAdd} onCancel={() => setShowAdd(false)}
            submitLabel="등록" loading={addLoading} error={addError}
          />
        </DialogContent>
      </Dialog>

      {/* 수정 */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>세무 진행현황 수정</DialogTitle></DialogHeader>
          <TaxForm
            form={editForm} setForm={setEditForm}
            onSubmit={handleEdit} onCancel={() => setEditTarget(null)}
            submitLabel="저장" loading={editLoading} error={editError}
          />
        </DialogContent>
      </Dialog>

      {/* 삭제 */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>항목 삭제</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            <span className="font-semibold text-foreground">{deleteTarget?.corpName}</span>의{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.task}</span> 항목을 삭제하시겠습니까?
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
