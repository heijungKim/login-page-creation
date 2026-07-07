"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react"
import { ExcelUploadButton, type ExcelColumn } from "@/components/erp/excel-upload-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { cn, toCommaNumber } from "@/lib/utils"
import { ApiError, api } from "@/lib/api"

type PrepaidEntry = {
  id: number
  personKey: string
  name: string
  amount: number
  payDate: string
  status: string
  phone: string
  residentNo: string
  memo: string
  registeredAt: string
}

type PrepaidPersonSummary = {
  personKey: string
  name: string
  phone: string
  residentNo: string
  latestStatus: string
  latestPayDate: string
  paidTotal: number
  deductedTotal: number
  netTotal: number
  entryCount: number
  latestId: number
}

const STATUS_OPTIONS = ["진행중", "종결"]

const statusStyles: Record<string, string> = {
  "진행중": "bg-yellow-100 text-yellow-700",
  "종결": "bg-gray-200 text-gray-600",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  )
}

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR") + "원"

type FormData = { name: string; phone: string; residentNo: string; status: string; memo: string }
const emptyForm: FormData = { name: "", phone: "", residentNo: "", status: "진행중", memo: "" }

const columns = [
  { key: "name", label: "이름", minWidth: "100px", filterOptions: undefined },
  { key: "netTotal", label: "합계", minWidth: "120px", filterOptions: undefined },
  { key: "paidTotal", label: "지급 금액", minWidth: "120px", filterOptions: undefined },
  { key: "deductedTotal", label: "차감 금액", minWidth: "120px", filterOptions: undefined },
  { key: "memo", label: "비고", minWidth: "180px", filterOptions: undefined },
  { key: "status", label: "상태", minWidth: "130px", filterOptions: STATUS_OPTIONS as readonly string[] },
  { key: "latestPayDate", label: "최근 지급일", minWidth: "120px", filterOptions: undefined },
] as const

type ColKey = typeof columns[number]["key"]

function Field({
  id, label, value, onChange, placeholder, type = "text",
}: {
  id: string; label: string; value: string
  onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} />
    </div>
  )
}

export function PrepaidView() {
  const today = new Date().toISOString().slice(0, 10)
  const [summaries, setSummaries] = useState<PrepaidPersonSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<PrepaidPersonSummary | null>(null)
  const [detailHistory, setDetailHistory] = useState<PrepaidEntry[]>([])
  const [detailLatest, setDetailLatest] = useState<PrepaidEntry | null>(null)
  const [detailForm, setDetailForm] = useState({ payDate: today, amount: "", memo: "", type: "지급" })
  const [editMode, setEditMode] = useState(false)
  const [editingEntry, setEditingEntry] = useState<{ id: number; payDate: string; amount: string; type: string; memo: string } | null>(null)
  const [editFields, setEditFields] = useState({ name: "", phone: "", residentNo: "", status: "", memo: "" })
  const [form, setForm] = useState<FormData>(emptyForm)
  const [filters, setFilters] = useState<Partial<Record<ColKey, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const set = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }))
  const setFilter = (k: ColKey, v: string) => setFilters((p) => ({ ...p, [k]: v }))
  const setDetailFormField = (k: keyof typeof detailForm, v: string) =>
    setDetailForm((p) => ({ ...p, [k]: v }))

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const list = await api.get<PrepaidPersonSummary[]>("/api/prepaid/grouped")
      setSummaries(list)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "선지급 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function openDetail(row: PrepaidPersonSummary) {
    setDetail(row)
    setDetailHistory([])
    setDetailLatest(null)
    setDetailForm({ payDate: today, amount: "", memo: "", type: "지급" })
    setEditMode(false)
    setSubmitError(null)
    try {
      const history = await api.get<PrepaidEntry[]>(`/api/prepaid/by-person/${encodeURIComponent(row.personKey)}`)
      setDetailHistory(history)
      const latest = history.find((h) => h.id === row.latestId) ?? history[0] ?? null
      setDetailLatest(latest)
      if (latest) {
        setEditFields({ name: latest.name, phone: latest.phone || "", residentNo: latest.residentNo || "", status: latest.status, memo: latest.memo || "" })
      }
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "내역을 불러오지 못했습니다.")
    }
  }

  function closeDetail() {
    setDetail(null)
    setDetailHistory([])
    setDetailLatest(null)
    setDetailForm({ payDate: today, amount: "", memo: "", type: "지급" })
    setEditMode(false)
    setSubmitError(null)
  }

  const filteredSummaries = useMemo(() =>
    summaries.filter((row) =>
      columns.every((col) => {
        const term = filters[col.key]?.trim()
        if (!term) return true
        if (col.filterOptions) {
          if (col.key === "status") return row.latestStatus === term
          return String((row as any)[col.key] ?? "") === term
        }
        if (col.key === "netTotal") return String(row.netTotal).includes(term.replace(/,/g, ""))
        if (col.key === "paidTotal") return String(row.paidTotal).includes(term.replace(/,/g, ""))
        if (col.key === "deductedTotal") return String(row.deductedTotal).includes(term.replace(/,/g, ""))
        return String((row as any)[col.key] ?? "").toLowerCase().includes(term.toLowerCase())
      }),
    ).sort((a, b) => {
      if (a.latestStatus !== b.latestStatus) {
        return a.latestStatus === "진행중" ? -1 : 1
      }
      return new Date(b.latestPayDate).getTime() - new Date(a.latestPayDate).getTime()
    }),
    [summaries, filters])

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      for (const key of selectedKeys) {
        const row = summaries.find((s) => s.personKey === key)
        if (row) {
          await api.delete(`/api/prepaid/${row.latestId}`)
        }
      }
      await refresh()
      setSelectedKeys(new Set())
      setBulkMode(false)
      setBulkConfirm(false)
    } catch (e) {
      // 에러는 무시하고 refresh
    } finally {
      setBulkDeleting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!form.name.trim()) {
      setSubmitError("이름은 필수입니다.")
      return
    }
    setSubmitting(true)
    try {
      await api.post<PrepaidEntry>("/api/prepaid", {
        name: form.name.trim(),
        amount: 0,
        payDate: today,
        status: form.status,
        phone: form.phone,
        residentNo: form.residentNo,
        memo: form.memo,
      })
      setForm(emptyForm)
      setOpen(false)
      await refresh()
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "등록에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveEdit() {
    if (!detail || !detailLatest) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      await api.put<PrepaidEntry>(`/api/prepaid/${detailLatest.id}`, {
        name: editFields.name,
        personKey: detail.personKey,
        amount: detailLatest.amount,
        payDate: detailLatest.payDate,
        status: editFields.status,
        phone: editFields.phone,
        residentNo: editFields.residentNo,
        memo: editFields.memo,
      })
      setEditMode(false)
      await refresh()
      await openDetail(detail)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "수정에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddDetailEntry() {
    if (!detail || !detailForm.payDate || !detailForm.amount) return
    const raw = parseInt(detailForm.amount.replace(/[^0-9]/g, ""), 10)
    if (isNaN(raw)) return
    const signed = detailForm.type === "차감" ? -Math.abs(raw) : Math.abs(raw)
    setSubmitError(null)
    setSubmitting(true)
    try {
      await api.post<PrepaidEntry>("/api/prepaid", {
        name: detail.name,
        personKey: detail.personKey,
        amount: signed,
        payDate: detailForm.payDate,
        status: detail.latestStatus,
        phone: detail.phone,
        residentNo: detail.residentNo,
        memo: detailForm.memo,
      })
      setDetailForm({ payDate: today, amount: "", memo: "", type: "지급" })
      await refresh()
      await openDetail(detail)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "추가에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateEntry() {
    if (!detail || !editingEntry) return
    const raw = parseInt(editingEntry.amount.replace(/[^0-9]/g, ""), 10)
    if (isNaN(raw)) return
    const signed = editingEntry.type === "차감" ? -Math.abs(raw) : Math.abs(raw)
    setSubmitting(true)
    try {
      await api.put(`/api/prepaid/${editingEntry.id}`, {
        name: detail.name,
        personKey: detail.personKey,
        amount: signed,
        payDate: editingEntry.payDate,
        status: detail.latestStatus,
        phone: detail.phone,
        residentNo: detail.residentNo,
        memo: editingEntry.memo,
      })
      setEditingEntry(null)
      await refresh()
      await openDetail(detail)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "수정에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteEntry(entryId: number) {
    if (!detail) return
    setSubmitting(true)
    try {
      await api.delete(`/api/prepaid/${entryId}`)
      await refresh()
      await openDetail(detail)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "삭제에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  const totalNet = filteredSummaries.reduce((s, r) => s + r.netTotal, 0)
  const totalPaid = filteredSummaries.reduce((s, r) => s + r.paidTotal, 0)
  const totalDeducted = filteredSummaries.reduce((s, r) => s + r.deductedTotal, 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">선지급 내역</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "불러오는 중..." : `전체 ${summaries.length}명 · 현재 ${filteredSummaries.length}명 표시`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bulkMode ? (
            <>
              {selectedKeys.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setBulkConfirm(true)}>
                  삭제 ({selectedKeys.size}건)
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => { setBulkMode(false); setSelectedKeys(new Set()) }}>취소</Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setBulkMode(true)}>일괄 삭제</Button>
          )}
          <ExcelUploadButton
            templateName="선지급"
            columns={[
              { key: "name", label: "이름", required: true, example: "홍길동" },
              { key: "residentNo", label: "주민번호", example: "900101-1234567" },
              { key: "phone", label: "연락처", example: "010-1234-5678" },
              { key: "amount", label: "선지급금액", required: true, example: "5000000" },
              { key: "payDate", label: "선지급일자", required: true, example: "2025-01-15" },
              { key: "status", label: "상태", example: "진행중" },
              { key: "memo", label: "메모", example: "" },
            ] satisfies ExcelColumn[]}
            onRows={async (rows) => {
              let success = 0
              const failed: Array<{ row: number; reason: string }> = []
              for (let i = 0; i < rows.length; i++) {
                const r = rows[i]
                try {
                  await api.post("/api/prepaid", {
                    name: r.name, residentNo: r.residentNo || "", phone: r.phone || "",
                    amount: Number(r.amount.replace(/,/g, "")) || 0,
                    payDate: r.payDate, status: r.status || "진행중", memo: r.memo || "",
                  })
                  success++
                } catch (e) { failed.push({ row: i + 2, reason: e instanceof ApiError ? e.message : "오류" }) }
              }
              await refresh()
              return { success, failed }
            }}
          />
          <Button onClick={() => { setForm(emptyForm); setOpen(true); setSubmitError(null) }} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden="true" />
            선지급 등록
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      ) : null}

      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">총 지급</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-blue-600">{fmt(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">총 차감</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-red-500">{fmt(totalDeducted)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">순합계</p>
            <p className={cn("mt-1 text-xl font-semibold tabular-nums", totalNet >= 0 ? "text-emerald-600" : "text-red-500")}>{fmt(totalNet)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="min-h-80 max-h-[calc(100svh-14rem)] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="text-left text-muted-foreground">
                  {bulkMode && (
                    <th className="w-10 px-3 py-2.5 border-b border-border bg-muted/70">
                      <input type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={selectedKeys.size === filteredSummaries.length && filteredSummaries.length > 0}
                        onChange={(e) => setSelectedKeys(e.target.checked ? new Set(filteredSummaries.map((r) => r.personKey)) : new Set())}
                      />
                    </th>
                  )}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="border-b border-border bg-muted/70 px-3 py-2.5 align-middle font-medium backdrop-blur"
                      style={{ minWidth: col.minWidth }}
                    >
                      {col.filterOptions ? (
                        <Select
                          value={filters[col.key] || "__all__"}
                          onValueChange={(v) => setFilter(col.key, v === "__all__" ? "" : (v ?? ""))}
                        >
                          <SelectTrigger className="h-8 bg-background text-xs font-normal" aria-label={`${col.label} 필터`}>
                            <span className={filters[col.key] ? "text-foreground" : "text-muted-foreground"}>
                              {filters[col.key] || col.label}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">{col.label}</SelectItem>
                            {col.filterOptions.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={filters[col.key] ?? ""}
                          onChange={(e) => setFilter(col.key, e.target.value)}
                          placeholder={col.label}
                          className="h-8 bg-background text-xs font-normal"
                          aria-label={`${col.label} 필터`}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="h-64 px-4 py-10 text-center text-muted-foreground">
                      조건에 맞는 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((row) => (
                    <tr
                      key={row.personKey}
                      className={cn(
                        "group cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent/50",
                        row.latestStatus === "종결" ? "bg-muted/40 text-muted-foreground" : "bg-white",
                      )}
                      onClick={() => { void openDetail(row) }}
                    >
                      {bulkMode && (
                        <td className="w-10 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox"
                            className="h-4 w-4 rounded border-border"
                            checked={selectedKeys.has(row.personKey)}
                            onChange={(e) => {
                              setSelectedKeys((prev) => {
                                const next = new Set(prev)
                                if (e.target.checked) { next.add(row.personKey) } else { next.delete(row.personKey) }
                                return next
                              })
                            }}
                          />
                        </td>
                      )}
                      {columns.map((col) => {
                        let content: React.ReactNode = "-"
                        if (col.key === "name") {
                          content = <span className="font-medium">{row.name}</span>
                        } else if (col.key === "netTotal") {
                          content = (
                            <span className={cn("font-semibold tabular-nums", row.netTotal > 0 ? "text-blue-600" : row.netTotal < 0 ? "text-red-600" : "text-foreground")}>
                              {fmt(row.netTotal)}
                            </span>
                          )
                        } else if (col.key === "paidTotal") {
                          content = <span className="font-medium tabular-nums">{fmt(row.paidTotal)}</span>
                        } else if (col.key === "deductedTotal") {
                          content = <span className="font-medium tabular-nums text-red-600">{fmt(row.deductedTotal)}</span>
                        } else if (col.key === "status") {
                          content = <StatusBadge status={row.latestStatus} />
                        } else if (col.key === "memo") {
                          content = <span className="text-muted-foreground">{`(${row.entryCount}건)`}</span>
                        } else if (col.key === "latestPayDate") {
                          content = row.latestPayDate
                        }
                        return (
                          <td key={col.key} className="whitespace-nowrap px-3 py-2.5 text-foreground">
                            {content}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 일괄 삭제 확인 다이얼로그 */}
      <Dialog open={bulkConfirm} onOpenChange={(o) => { if (!o) setBulkConfirm(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>일괄 삭제</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            선택한 <span className="font-semibold text-foreground">{selectedKeys.size}건</span>을 삭제하시겠습니까?<br />
            삭제 후 복구할 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirm(false)}>취소</Button>
            <Button variant="destructive" disabled={bulkDeleting} onClick={handleBulkDelete}>
              {bulkDeleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) closeDetail() }}>
        <DialogContent className="sm:w-[70vw] sm:max-w-[70vw]">
          <DialogHeader>
            <DialogTitle>선지급 상세 정보</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="flex flex-col gap-5 py-2">
              {submitError ? <p className="text-xs text-destructive">{submitError}</p> : null}

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
                  {detailLatest && !editMode ? (
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => {
                        setEditMode(true)
                        setEditFields({ name: detailLatest.name, phone: detailLatest.phone || "", residentNo: detailLatest.residentNo || "", status: detailLatest.status, memo: detailLatest.memo || "" })
                      }}
                    >
                      <Pencil className="h-3 w-3" />수정
                    </Button>
                  ) : detailLatest ? (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 gap-1 px-2 text-xs text-green-600 hover:text-green-700"
                        disabled={submitting}
                        onClick={handleSaveEdit}
                      >
                        <Check className="h-3 w-3" />저장
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                        disabled={submitting}
                        onClick={() => setEditMode(false)}
                      >
                        <X className="h-3 w-3" />취소
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-muted-foreground">이름</span>
                      {editMode ? (
                        <Input
                          value={editFields.name}
                          onChange={(e) => setEditFields((p) => ({ ...p, name: e.target.value }))}
                          className="h-7 w-32 text-sm"
                        />
                      ) : (
                        <span className="font-medium">{detail.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-muted-foreground">상태</span>
                      {editMode ? (
                        <Select
                          value={editFields.status}
                          onValueChange={(v) => setEditFields((p) => ({ ...p, status: v ?? "" }))}
                        >
                          <SelectTrigger className="h-7 w-24 text-sm">
                            <span>{editFields.status}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <StatusBadge status={detail.latestStatus} />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-muted-foreground">연락처</span>
                      {editMode ? (
                        <Input
                          value={editFields.phone}
                          onChange={(e) => setEditFields((p) => ({ ...p, phone: e.target.value }))}
                          className="h-7 w-36 text-sm"
                          placeholder="010-0000-0000"
                        />
                      ) : (
                        <span>{detail.phone || "-"}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-muted-foreground">주민번호</span>
                      {editMode ? (
                        <Input
                          value={editFields.residentNo}
                          onChange={(e) => setEditFields((p) => ({ ...p, residentNo: e.target.value }))}
                          className="h-7 w-36 text-sm"
                          placeholder="000000-0000000"
                        />
                      ) : (
                        <span>{detail.residentNo || "-"}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-muted-foreground">메모</span>
                    {editMode ? (
                      <Input
                        value={editFields.memo}
                        onChange={(e) => setEditFields((p) => ({ ...p, memo: e.target.value }))}
                        className="h-7 w-full text-sm"
                        placeholder="메모 입력"
                      />
                    ) : (
                      <span className="text-muted-foreground">{detailLatest?.memo || "-"}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">선지급 내역</p>

                {detailHistory.length > 0 ? (
                  <div className="mb-4 overflow-hidden rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/60 text-left text-xs text-muted-foreground">
                          <th className="px-3 py-2 font-medium">선지급 일자</th>
                          <th className="px-3 py-2 font-medium">구분</th>
                          <th className="px-3 py-2 font-medium">금액</th>
                          <th className="px-3 py-2 font-medium">비고</th>
                          <th className="px-3 py-2 font-medium">등록일</th>
                          <th className="w-20 px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {detailHistory.map((r) =>
                          editingEntry?.id === r.id ? (
                            <tr key={r.id} className="border-t border-border/50 bg-accent/30">
                              <td className="px-2 py-1.5">
                                <Input type="date" value={editingEntry.payDate} onChange={(e) => setEditingEntry((p) => p ? { ...p, payDate: e.target.value } : p)} className="h-7 text-xs w-32" />
                              </td>
                              <td className="px-2 py-1.5">
                                <Select value={editingEntry.type} onValueChange={(v) => setEditingEntry((p) => p ? { ...p, type: v } : p)}>
                                  <SelectTrigger className="h-7 text-xs w-16"><span>{editingEntry.type}</span></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="지급">지급</SelectItem>
                                    <SelectItem value="차감">차감</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-2 py-1.5">
                                <Input value={editingEntry.amount} onChange={(e) => setEditingEntry((p) => p ? { ...p, amount: toCommaNumber(e.target.value) } : p)} className="h-7 text-xs w-28" />
                              </td>
                              <td className="px-2 py-1.5">
                                <Input value={editingEntry.memo} onChange={(e) => setEditingEntry((p) => p ? { ...p, memo: e.target.value } : p)} className="h-7 text-xs" placeholder="메모" />
                              </td>
                              <td className="px-2 py-1.5" />
                              <td className="px-2 py-1.5">
                                <div className="flex gap-1">
                                  <button type="button" className="text-green-600 hover:text-green-700 transition-colors" disabled={submitting} onClick={handleUpdateEntry}><Check className="h-4 w-4" /></button>
                                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => setEditingEntry(null)}><X className="h-4 w-4" /></button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr key={r.id} className="border-t border-border/50">
                              <td className="px-3 py-2 tabular-nums">{r.payDate}</td>
                              <td className="px-3 py-2">{r.amount >= 0 ? "지급" : "차감"}</td>
                              <td className={cn("px-3 py-2 font-medium tabular-nums", r.amount >= 0 ? "text-blue-600" : "text-red-600")}>{fmt(Math.abs(r.amount))}</td>
                              <td className="px-3 py-2 text-muted-foreground">{r.memo || "-"}</td>
                              <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.registeredAt}</td>
                              <td className="px-3 py-2">
                                <div className="flex gap-1.5">
                                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => setEditingEntry({ id: r.id, payDate: r.payDate, amount: toCommaNumber(String(Math.abs(r.amount))), type: r.amount >= 0 ? "지급" : "차감", memo: r.memo })}><Pencil className="h-3.5 w-3.5" /></button>
                                  <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => handleDeleteEntry(r.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/40">
                          <td className="px-3 py-2 text-xs font-semibold text-muted-foreground">지급 합계</td>
                          <td className="px-3 py-2 font-bold tabular-nums text-blue-600">{fmt(detail.paidTotal)}</td>
                          <td className="px-3 py-2 text-xs font-semibold text-muted-foreground">차감 합계</td>
                          <td className="px-3 py-2 font-bold tabular-nums text-red-600">{fmt(detail.deductedTotal)}</td>
                          <td className={cn("px-3 py-2 font-bold tabular-nums", detail.netTotal > 0 ? "text-blue-600" : detail.netTotal < 0 ? "text-red-600" : "text-foreground")}>순합계 {fmt(detail.netTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="mb-4 text-xs text-muted-foreground">등록된 내역이 없습니다.</p>
                )}

                <div className="flex flex-col gap-3 rounded-md border border-dashed border-border p-3">
                  <p className="text-xs font-medium text-muted-foreground">내역 추가</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="detail-paydate" className="text-xs text-muted-foreground">선지급 일자</Label>
                      <Input
                        id="detail-paydate" type="date"
                        value={detailForm.payDate}
                        onChange={(e) => setDetailFormField("payDate", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="detail-amount" className="text-xs text-muted-foreground">선지급 금액</Label>
                      <Input
                        id="detail-amount" type="text"
                        value={detailForm.amount}
                        onChange={(e) => setDetailFormField("amount", toCommaNumber(e.target.value))}
                        placeholder="예: 100000"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="detail-type" className="text-xs text-muted-foreground">구분</Label>
                      <Select value={detailForm.type} onValueChange={(v) => setDetailFormField("type", v ?? "지급")}>
                        <SelectTrigger id="detail-type" className="h-8 text-xs w-full">
                          <span>{detailForm.type}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="지급">지급</SelectItem>
                          <SelectItem value="차감">차감</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="detail-memo" className="text-xs text-muted-foreground">비고</Label>
                      <Input
                        id="detail-memo" type="text"
                        value={detailForm.memo}
                        onChange={(e) => setDetailFormField("memo", e.target.value)}
                        placeholder="메모 입력"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <Button
                    type="button" size="sm"
                    className="self-end"
                    disabled={submitting}
                    onClick={handleAddDetailEntry}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />추가
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDetail}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>선지급 등록</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <form id="prepaid-form" onSubmit={handleSubmit} className="flex flex-col gap-4 px-1 py-2">
              {submitError ? <p className="text-xs text-destructive">{submitError}</p> : null}
              <Field id="pp-name" label="이름 *" value={form.name} onChange={(v) => set("name", v)} placeholder="예: 김대표" />
              <p className="text-xs text-muted-foreground -mt-2">
                동일한 이름 입력 시 선지급 합계에 자동으로 누적됩니다.
              </p>
              <Field id="pp-phone" label="연락처" value={form.phone} onChange={(v) => set("phone", v)} placeholder="010-0000-0000" />
              <Field id="pp-residentno" label="주민번호" value={form.residentNo} onChange={(v) => set("residentNo", v)} placeholder="000000-0000000" />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pp-status" className="text-xs text-muted-foreground">상태</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v ?? "")}>
                  <SelectTrigger id="pp-status">
                    <span>{form.status}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field id="pp-memo" label="비고" value={form.memo}
                onChange={(v) => set("memo", v)} placeholder="메모 입력" />
            </form>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => setOpen(false)}>취소</Button>
            <Button type="submit" form="prepaid-form" disabled={submitting}>{submitting ? "등록 중..." : "등록"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
