"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { ExcelUploadButton, type ExcelColumn } from "@/components/erp/excel-upload-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { cn, toCommaNumber } from "@/lib/utils"
import { ApiError, api } from "@/lib/api"

type Telecom = {
  id: number
  corporationId: number | null
  owner: string
  phone: string
  carrier: string
  cost: number
  paymentDay: string
  bankName: string
  accountNo: string
  memo: string
  registeredAt: string
}

type TelecomPayment = {
  id: number
  telecomId: number
  paidDate: string
  paidAmount: number
  memo: string
  createdAt: string
}

type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

const CARRIER_OPTIONS = ["SKT", "KT", "LG U+", "알뜰폰(SKT)", "알뜰폰(KT)", "알뜰폰(LG)", "기타"]

const carrierStyles: Record<string, string> = {
  "SKT": "bg-red-100 text-red-700",
  "KT": "bg-sky-100 text-sky-700",
  "LG U+": "bg-violet-100 text-violet-700",
  "알뜰폰(SKT)": "bg-rose-100 text-rose-600",
  "알뜰폰(KT)": "bg-cyan-100 text-cyan-700",
  "알뜰폰(LG)": "bg-purple-100 text-purple-600",
  "기타": "bg-slate-200 text-slate-600",
}

type Column = {
  key: keyof Telecom
  label: string
  minWidth?: string
  filterOptions?: string[]
}

const columns: Column[] = [
  { key: "owner", label: "명의자", minWidth: "110px" },
  { key: "phone", label: "연락처", minWidth: "140px" },
  { key: "carrier", label: "통신사", minWidth: "130px", filterOptions: CARRIER_OPTIONS },
  { key: "cost", label: "통신비용", minWidth: "120px" },
  { key: "paymentDay", label: "납부일", minWidth: "100px" },
  { key: "bankName", label: "은행명", minWidth: "100px" },
  { key: "accountNo", label: "계좌번호", minWidth: "170px" },
  { key: "memo", label: "비고", minWidth: "160px" },
  { key: "registeredAt", label: "등록일", minWidth: "110px" },
]

const stickyOffsets = [0, 110, 250]

function CarrierBadge({ carrier }: { carrier: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        carrierStyles[carrier] ?? "bg-muted text-muted-foreground",
      )}
    >
      {carrier}
    </span>
  )
}

function Field({
  id, label, value, onChange, placeholder,
}: {
  id: string; label: string; value: string
  onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

type FormData = {
  owner: string
  phone: string
  carrier: string
  cost: string
  paymentDay: string
  bankName: string
  accountNo: string
  memo: string
}

const emptyForm: FormData = {
  owner: "", phone: "", carrier: "SKT", cost: "",
  paymentDay: "매월 1일", bankName: "", accountNo: "", memo: "",
}

function TelecomDialog({
  open, onOpenChange, onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (data: FormData) => Promise<void> | void
}) {
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const set = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(form)
      setForm(emptyForm)
      onOpenChange(false)
    } catch {
      // 부모에서 에러 노출
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>통신비 등록</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Field id="tc-owner" label="명의자" value={form.owner}
              onChange={(v) => set("owner", v)} placeholder="예: 김대표" />
            <Field id="tc-phone" label="연락처" value={form.phone}
              onChange={(v) => set("phone", v)} placeholder="010-0000-0000" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tc-carrier" className="text-xs text-muted-foreground">통신사</Label>
            <Select value={form.carrier} onValueChange={(v) => set("carrier", v)}>
              <SelectTrigger id="tc-carrier">
                <span>{form.carrier}</span>
              </SelectTrigger>
              <SelectContent>
                {CARRIER_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field id="tc-cost" label="통신비용 (원)" value={form.cost}
              onChange={(v) => set("cost", toCommaNumber(v))} placeholder="예: 89,000" />
            <Field id="tc-payment-day" label="납부일" value={form.paymentDay}
              onChange={(v) => set("paymentDay", v)} placeholder="예: 매월 25일" />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">지급 계좌</p>
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-3">
              <Field id="tc-bank" label="은행명" value={form.bankName}
                onChange={(v) => set("bankName", v)} placeholder="예: 국민" />
              <Field id="tc-account" label="계좌번호" value={form.accountNo}
                onChange={(v) => set("accountNo", v)} placeholder="예: 123-456-789012" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tc-memo" className="text-xs text-muted-foreground">비고</Label>
            <Textarea id="tc-memo" value={form.memo}
              onChange={(e) => set("memo", e.target.value)}
              placeholder="추가 메모를 입력하세요" rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "등록 중..." : "등록"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TelecomView() {
  const [rows, setRows] = useState<Telecom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [detail, setDetail] = useState<Telecom | null>(null)
  const [payments, setPayments] = useState<TelecomPayment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [payForm, setPayForm] = useState({ paidDate: "", paidAmount: "", memo: "" })
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<FormData>(emptyForm)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const setFilter = (k: string, v: string) => setFilters((p) => ({ ...p, [k]: v }))
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const page = await api.get<PageResponse<Telecom>>("/api/telecoms?size=200")
      setRows(page.content)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "통신비 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const filteredRows = useMemo(() => {
    return rows
      .filter((row) =>
        columns.every((col) => {
          const term = filters[col.key]?.trim()
          if (!term) return true
          if (col.filterOptions) return String(row[col.key]) === term
          if (col.key === "cost") return String(row.cost).includes(term.replace(/,/g, ""))
          return String(row[col.key] ?? "").toLowerCase().includes(term.toLowerCase())
        }),
      )
      .sort((a, b) => (b.registeredAt ?? "").localeCompare(a.registeredAt ?? ""))
  }, [rows, filters])

  const loadPayments = useCallback(async (id: number) => {
    setPaymentsLoading(true)
    try {
      const list = await api.get<TelecomPayment[]>(`/api/telecoms/${id}/payments`)
      setPayments(list)
    } catch {
      setPayments([])
    } finally {
      setPaymentsLoading(false)
    }
  }, [])

  function openDetail(row: Telecom) {
    setDetail(row)
    setEditMode(false)
    setEditError(null)
    setPayForm({ paidDate: "", paidAmount: toCommaNumber(String(Math.round(row.cost))), memo: "" })
    void loadPayments(row.id)
  }

  function startEdit() {
    if (!detail) return
    setEditForm({
      owner: detail.owner,
      phone: detail.phone,
      carrier: detail.carrier,
      cost: toCommaNumber(String(Math.round(detail.cost))),
      paymentDay: detail.paymentDay,
      bankName: detail.bankName,
      accountNo: detail.accountNo,
      memo: detail.memo,
    })
    setEditError(null)
    setEditMode(true)
  }

  async function handleEdit() {
    if (!detail) return
    setEditSubmitting(true)
    setEditError(null)
    try {
      const updated = await api.put<Telecom>(`/api/telecoms/${detail.id}`, {
        owner: editForm.owner,
        phone: editForm.phone,
        carrier: editForm.carrier,
        cost: Number(editForm.cost.replace(/,/g, "")) || 0,
        paymentDay: editForm.paymentDay,
        bankName: editForm.bankName,
        accountNo: editForm.accountNo,
        memo: editForm.memo,
      })
      setDetail(updated)
      setEditMode(false)
      await refresh()
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "수정에 실패했습니다.")
    } finally {
      setEditSubmitting(false)
    }
  }

  async function addPayment() {
    if (!detail || !payForm.paidDate || !payForm.paidAmount) return
    setPaySubmitting(true)
    try {
      await api.post(`/api/telecoms/${detail.id}/payments`, {
        paidDate: payForm.paidDate,
        paidAmount: Number(payForm.paidAmount.replace(/,/g, "")) || 0,
        memo: payForm.memo,
      })
      setPayForm({ paidDate: "", paidAmount: toCommaNumber(String(Math.round(detail.cost))), memo: "" })
      await loadPayments(detail.id)
    } catch {
      // ignore
    } finally {
      setPaySubmitting(false)
    }
  }

  async function deletePayment(paymentId: number) {
    if (!detail) return
    try {
      await api.delete(`/api/telecoms/${detail.id}/payments/${paymentId}`)
      await loadPayments(detail.id)
    } catch {
      // ignore
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      for (const id of selectedIds) {
        await api.delete(`/api/telecoms/${id}`)
      }
      await refresh()
      setSelectedIds(new Set())
      setBulkMode(false)
      setBulkConfirm(false)
    } catch (e) {
      // 에러는 무시하고 refresh
    } finally {
      setBulkDeleting(false)
    }
  }

  async function handleSubmit(data: FormData) {
    setSubmitError(null)
    try {
      await api.post<Telecom>("/api/telecoms", {
        owner: data.owner,
        phone: data.phone,
        carrier: data.carrier,
        cost: Number(data.cost.replace(/,/g, "")) || 0,
        paymentDay: data.paymentDay,
        bankName: data.bankName,
        accountNo: data.accountNo,
        memo: data.memo,
      })
      await refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "통신비 등록에 실패했습니다."
      setSubmitError(message)
      throw err
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">통신비</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "불러오는 중..." : `전체 ${rows.length}건 · 현재 ${filteredRows.length}건 표시`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bulkMode ? (
            <>
              {selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setBulkConfirm(true)}>
                  삭제 ({selectedIds.size}건)
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => { setBulkMode(false); setSelectedIds(new Set()) }}>취소</Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setBulkMode(true)}>일괄 삭제</Button>
          )}
          <ExcelUploadButton
            templateName="통신비"
            columns={[
              { key: "owner", label: "명의자", required: true, example: "홍길동" },
              { key: "phone", label: "연락처", example: "010-1234-5678" },
              { key: "carrier", label: "통신사", required: true, example: "SKT" },
              { key: "cost", label: "통신비용", required: true, example: "55000" },
              { key: "paymentDay", label: "납부일", example: "15" },
              { key: "bankName", label: "은행명", example: "국민은행" },
              { key: "accountNo", label: "계좌번호", example: "123-456-789012" },
              { key: "memo", label: "비고", example: "" },
            ] satisfies ExcelColumn[]}
            onRows={async (rows) => {
              let success = 0
              const failed: Array<{ row: number; reason: string }> = []
              for (let i = 0; i < rows.length; i++) {
                const r = rows[i]
                try {
                  await api.post("/api/telecoms", {
                    owner: r.owner, phone: r.phone || "", carrier: r.carrier,
                    cost: Number(r.cost.replace(/,/g, "")) || 0,
                    paymentDay: r.paymentDay || "",
                    bankName: r.bankName || "", accountNo: r.accountNo || "",
                    memo: r.memo || "",
                  })
                  success++
                } catch (e) { failed.push({ row: i + 2, reason: e instanceof ApiError ? e.message : "오류" }) }
              }
              await refresh()
              return { success, failed }
            }}
          />
          <Button onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden="true" />
            통신비 등록
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      ) : null}
      {submitError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{submitError}</div>
      ) : null}

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
                        checked={selectedIds.size === filteredRows.length && filteredRows.length > 0}
                        onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredRows.map((r) => r.id)) : new Set())}
                      />
                    </th>
                  )}
                  {columns.map((col, colIdx) => (
                    <th
                      key={col.key}
                      className={cn(
                        "border-b border-border bg-muted/70 px-3 py-2.5 align-middle font-medium backdrop-blur",
                        colIdx < 3 && "sm:sticky sm:z-10",
                      )}
                      style={{
                        minWidth: col.minWidth,
                        left: colIdx < 3 ? stickyOffsets[colIdx] : undefined,
                      }}
                    >
                      {col.filterOptions ? (
                        <Select
                          value={filters[col.key] || "__all__"}
                          onValueChange={(v) => setFilter(col.key, v === "__all__" ? "" : v)}
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
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="h-64 text-center text-muted-foreground">
                      조건에 맞는 항목이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="group cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent/50" onClick={() => openDetail(row)}>
                      {bulkMode && (
                        <td className="w-10 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox"
                            className="h-4 w-4 rounded border-border"
                            checked={selectedIds.has(row.id)}
                            onChange={(e) => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev)
                                if (e.target.checked) { next.add(row.id) } else { next.delete(row.id) }
                                return next
                              })
                            }}
                          />
                        </td>
                      )}
                      {columns.map((col, colIdx) => (
                        <td
                          key={col.key}
                          className={cn(
                            "whitespace-nowrap px-3 py-2.5 text-foreground",
                            colIdx < 3 && "sm:sticky sm:z-10 bg-card group-hover:bg-accent",
                          )}
                          style={{ left: colIdx < 3 ? stickyOffsets[colIdx] : undefined }}
                        >
                          {col.key === "carrier" ? (
                            <CarrierBadge carrier={row.carrier} />
                          ) : col.key === "cost" ? (
                            <span className="font-medium tabular-nums">₩{Math.round(row.cost).toLocaleString("ko-KR")}</span>
                          ) : col.key === "memo" ? (
                            <span className="text-muted-foreground">{row.memo || "-"}</span>
                          ) : (
                            String(row[col.key] ?? "") || "-"
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <TelecomDialog open={open} onOpenChange={setOpen} onSubmit={handleSubmit} />

      {/* 일괄 삭제 확인 다이얼로그 */}
      <Dialog open={bulkConfirm} onOpenChange={(o) => { if (!o) setBulkConfirm(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>일괄 삭제</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            선택한 <span className="font-semibold text-foreground">{selectedIds.size}건</span>을 삭제하시겠습니까?<br />
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

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent className="sm:max-h-[90svh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-base font-semibold">통신비 상세</DialogTitle>
          </DialogHeader>

          {detail && (
            <>
              <div className="flex max-h-[calc(75dvh-9rem)] sm:max-h-[calc(90svh-9rem)] flex-col overflow-y-auto px-6 py-5">
                <div className="flex flex-col gap-5">
                  {editMode ? (
                    <div className="flex flex-col gap-4">
                      {editError && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{editError}</div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <Field id="edit-owner" label="명의자" value={editForm.owner} onChange={(v) => setEditForm((p) => ({ ...p, owner: v }))} placeholder="예: 김대표" />
                        <Field id="edit-phone" label="연락처" value={editForm.phone} onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))} placeholder="010-0000-0000" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-carrier" className="text-xs text-muted-foreground">통신사</Label>
                        <Select value={editForm.carrier} onValueChange={(v) => setEditForm((p) => ({ ...p, carrier: v }))}>
                          <SelectTrigger id="edit-carrier"><span>{editForm.carrier}</span></SelectTrigger>
                          <SelectContent>
                            {CARRIER_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field id="edit-cost" label="통신비용 (원)" value={editForm.cost} onChange={(v) => setEditForm((p) => ({ ...p, cost: toCommaNumber(v) }))} placeholder="예: 89,000" />
                        <Field id="edit-payment-day" label="납부일" value={editForm.paymentDay} onChange={(v) => setEditForm((p) => ({ ...p, paymentDay: v }))} placeholder="예: 매월 25일" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground">지급 계좌</p>
                        <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-3">
                          <Field id="edit-bank" label="은행명" value={editForm.bankName} onChange={(v) => setEditForm((p) => ({ ...p, bankName: v }))} placeholder="예: 국민" />
                          <Field id="edit-account" label="계좌번호" value={editForm.accountNo} onChange={(v) => setEditForm((p) => ({ ...p, accountNo: v }))} placeholder="예: 123-456-789012" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-memo" className="text-xs text-muted-foreground">비고</Label>
                        <Textarea id="edit-memo" value={editForm.memo} onChange={(e) => setEditForm((p) => ({ ...p, memo: e.target.value }))} placeholder="추가 메모를 입력하세요" rows={3} />
                      </div>
                    </div>
                  ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">명의자</span>
                      <span className="font-medium">{detail.owner || "-"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">연락처</span>
                      <span>{detail.phone || "-"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">통신사</span>
                      <CarrierBadge carrier={detail.carrier} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">통신비용</span>
                      <span className="font-medium tabular-nums">₩{Math.round(detail.cost).toLocaleString("ko-KR")}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">납부일</span>
                      <span>{detail.paymentDay || "-"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">지급계좌</span>
                      <span>{[detail.bankName, detail.accountNo].filter(Boolean).join(" ") || "-"}</span>
                    </div>
                    {detail.memo && (
                      <div className="col-span-2 flex flex-col gap-0.5 sm:col-span-3">
                        <span className="text-[11px] text-muted-foreground">비고</span>
                        <span className="whitespace-pre-wrap text-muted-foreground">{detail.memo}</span>
                      </div>
                    )}
                  </div>
                  )}

                  <div className="rounded-lg border border-border p-4">
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        납입 내역 ({payments.length}건)
                      </p>
                    </div>

                    <div className="mb-4 flex items-end gap-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">납입일</Label>
                        <Input type="date" value={payForm.paidDate} onChange={(e) => setPayForm((p) => ({ ...p, paidDate: e.target.value }))} className="h-9 w-36 text-sm" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">금액</Label>
                        <Input value={payForm.paidAmount} onChange={(e) => setPayForm((p) => ({ ...p, paidAmount: toCommaNumber(e.target.value) }))} placeholder="금액" className="h-9 w-32 text-sm" />
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">메모</Label>
                        <Input value={payForm.memo} onChange={(e) => setPayForm((p) => ({ ...p, memo: e.target.value }))} placeholder="메모 (선택)" className="h-9 text-sm" />
                      </div>
                      <Button size="sm" className="h-9 gap-1 px-3" disabled={paySubmitting || !payForm.paidDate || !payForm.paidAmount} onClick={addPayment}>
                        <Plus className="h-3.5 w-3.5" />추가
                      </Button>
                    </div>

                    {paymentsLoading ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">불러오는 중...</p>
                    ) : payments.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">납입 내역이 없습니다.</p>
                    ) : (
                      <div className="max-h-60 overflow-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-border text-left text-xs text-muted-foreground">
                              <th className="px-2 py-2 font-medium">납입일</th>
                              <th className="px-2 py-2 font-medium text-right">금액</th>
                              <th className="px-2 py-2 font-medium">메모</th>
                              <th className="w-10 px-2 py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map((p) => (
                              <tr key={p.id} className="border-b border-border/50 last:border-0">
                                <td className="px-2 py-2">{p.paidDate}</td>
                                <td className="px-2 py-2 text-right font-medium tabular-nums">₩{Math.round(p.paidAmount).toLocaleString("ko-KR")}</td>
                                <td className="px-2 py-2 text-muted-foreground">{p.memo || "-"}</td>
                                <td className="px-2 py-2">
                                  <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => deletePayment(p.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="border-t border-border px-6 py-5">
                {editMode ? (
                  <>
                    <Button variant="outline" disabled={editSubmitting} onClick={() => { setEditMode(false); setEditError(null) }}>취소</Button>
                    <Button disabled={editSubmitting} onClick={handleEdit}>
                      {editSubmitting ? "저장 중..." : "저장"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="gap-1.5" onClick={startEdit}>
                      <Pencil className="h-3.5 w-3.5" />수정
                    </Button>
                    <Button variant="outline" onClick={() => setDetail(null)}>닫기</Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


