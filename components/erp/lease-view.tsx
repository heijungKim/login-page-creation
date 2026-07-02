"use client"

import { useEffect, useMemo, useState } from "react"
import { Pin, Plus } from "lucide-react"
import { ExcelUploadButton, type ExcelColumn } from "@/components/erp/excel-upload-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn, toCommaNumber } from "@/lib/utils"
import { ApiError, api } from "@/lib/api"

type LeaseEntry = {
  id: number
  corporationId: number | null
  category: string
  categoryNote: string | null
  corpName: string
  ceoName: string
  location: string
  contractStart: string | null
  contractEnd: string | null
  deposit: number
  monthlyRent: number
  paymentDay: string
  contact: string
  emergencyContact: string
  sharedOfficeName: string | null
  pinned: boolean
  status: string
  registeredAt: string
}

type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

const CATEGORY_OPTIONS = ["운영법인", "하위법인", "상품권 법인", "영세 법인", "기타"]
const STATUS_OPTIONS = ["계약중", "만료임박", "만료", "대기중"]

const categoryStyles: Record<string, string> = {
  "운영법인": "bg-emerald-100 text-emerald-700",
  "하위법인": "bg-sky-100 text-sky-700",
  "상품권 법인": "bg-orange-100 text-orange-700",
  "영세 법인": "bg-slate-200 text-slate-700",
  "기타": "bg-gray-100 text-gray-600",
}

const statusStyles: Record<string, string> = {
  "계약중": "bg-blue-100 text-blue-700",
  "만료임박": "bg-red-100 text-red-600",
  "만료": "bg-gray-200 text-gray-600",
  "대기중": "bg-yellow-100 text-yellow-700",
}

const columns = [
  { key: "category", label: "구분", minWidth: "120px" },
  { key: "corpName", label: "법인명", minWidth: "140px" },
  { key: "ceoName", label: "대표자명", minWidth: "110px" },
  { key: "location", label: "부동산 소재지", minWidth: "230px" },
  { key: "contractStart", label: "계약 시작일", minWidth: "115px" },
  { key: "contractEnd", label: "계약 종료일", minWidth: "115px" },
  { key: "deposit", label: "보증금", minWidth: "140px" },
  { key: "monthlyRent", label: "월 납입금", minWidth: "130px" },
  { key: "paymentDay", label: "납입일", minWidth: "90px" },
  { key: "contact", label: "연락처", minWidth: "130px" },
  { key: "emergencyContact", label: "긴급 연락처", minWidth: "130px" },
  { key: "sharedOfficeName", label: "공유오피스 상호명", minWidth: "170px" },
  { key: "status", label: "상태", minWidth: "100px" },
  { key: "registeredAt", label: "등록일", minWidth: "110px" },
] as const

const stickyOffsets = [0, 120]

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR") + "원"

const BADGE_KEYS = ["category", "corpName", "status", "deposit", "monthlyRent", "sharedOfficeName"]

type FormData = {
  category: string; corpName: string; ceoName: string; location: string
  contractStart: string; contractEnd: string; deposit: string; monthlyRent: string
  paymentDay: string; contact: string; emergencyContact: string; sharedOfficeName: string; pinned: boolean; status: string
}

const emptyForm: FormData = {
  category: "운영법인", corpName: "", ceoName: "", location: "",
  contractStart: "", contractEnd: "", deposit: "", monthlyRent: "",
  paymentDay: "", contact: "", emergencyContact: "", sharedOfficeName: "", pinned: false, status: "계약중",
}

function toRequest(form: FormData) {
  return {
    category: form.category,
    corpName: form.corpName.trim(),
    ceoName: form.ceoName,
    location: form.location,
    contractStart: form.contractStart || null,
    contractEnd: form.contractEnd || null,
    deposit: Number(form.deposit.replace(/,/g, "")) || 0,
    monthlyRent: Number(form.monthlyRent.replace(/,/g, "")) || 0,
    paymentDay: form.paymentDay,
    contact: form.contact,
    emergencyContact: form.emergencyContact,
    sharedOfficeName: form.sharedOfficeName || null,
    pinned: form.pinned,
    status: form.status,
  }
}

function toFormData(row: LeaseEntry): FormData {
  return {
    category: row.category, corpName: row.corpName, ceoName: row.ceoName,
    location: row.location,
    contractStart: row.contractStart ?? "",
    contractEnd: row.contractEnd ?? "",
    deposit: row.deposit ? row.deposit.toLocaleString("ko-KR") : "",
    monthlyRent: row.monthlyRent ? row.monthlyRent.toLocaleString("ko-KR") : "",
    paymentDay: row.paymentDay ?? "",
    contact: row.contact,
    emergencyContact: row.emergencyContact ?? "",
    sharedOfficeName: row.sharedOfficeName ?? "",
    pinned: row.pinned ?? false,
    status: row.status,
  }
}

function Field({ id, label, value, onChange, placeholder, type = "text" }: {
  id: string; label: string; value: string
  onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function SelectField({ id, label, value, onChange, options }: {
  id: string; label: string; value: string
  onChange: (v: string) => void; options: string[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <select
        id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function CategoryBadge({ category, categoryNote }: { category: string; categoryNote?: string | null }) {
  const label = category === "기타" && categoryNote ? `기타(${categoryNote})` : category
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", categoryStyles[category] ?? "bg-muted text-muted-foreground")}>
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  )
}

export function LeaseView() {
  const [rows, setRows] = useState<LeaseEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<LeaseEntry | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [detailForm, setDetailForm] = useState<FormData>(emptyForm)
  const [editMode, setEditMode] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const setDetailField = (k: keyof FormData, v: string) => setDetailForm((f) => ({ ...f, [k]: v }))
  const setFilter = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v }))

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const page = await api.get<PageResponse<LeaseEntry>>("/api/leases?size=200")
      setRows(page.content)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "임대차 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const filteredRows = useMemo(() =>
    rows
      .filter((row) =>
        columns.every((col) => {
          const term = filters[col.key]?.trim().toLowerCase()
          if (!term) return true
          const value = row[col.key as keyof LeaseEntry]
          return String(value ?? "").toLowerCase().includes(term)
        })
      )
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        const ra = a.registeredAt ?? ""
        const rb = b.registeredAt ?? ""
        if (ra !== rb) return rb.localeCompare(ra)
        const catIdx = (c: string) => { const i = CATEGORY_OPTIONS.indexOf(c); return i === -1 ? 999 : i }
        if (a.category !== b.category) return catIdx(a.category) - catIdx(b.category)
        const ca = a.contractStart ?? ""
        const cb = b.contractStart ?? ""
        return cb.localeCompare(ca)
      }),
    [rows, filters])

  async function handleSubmit() {
    setSubmitError(null)
    if (!form.corpName.trim()) { setSubmitError("법인명은 필수입니다."); return }
    setSubmitting(true)
    try {
      await api.post<LeaseEntry>("/api/leases", toRequest(form))
      setForm(emptyForm)
      setOpen(false)
      await refresh()
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "등록에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  function openDetail(row: LeaseEntry) {
    setDetail(row)
    setDetailForm(toFormData(row))
    setEditMode(false)
    setSubmitError(null)
  }

  async function handleSaveDetail() {
    if (!detail) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const updated = await api.put<LeaseEntry>(`/api/leases/${detail.id}`, toRequest(detailForm))
      setRows((prev) => prev.map((r) => (r.id === detail.id ? updated : r)))
      setDetail(updated)
      setEditMode(false)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "수정에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      for (const id of selectedIds) {
        await api.delete(`/api/leases/${id}`)
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

  function resetDetail(row: LeaseEntry) {
    setDetailForm(toFormData(row))
    setEditMode(false)
  }

  async function togglePin(row: LeaseEntry) {
    const newPinned = !row.pinned
    try {
      const updated = await api.put<LeaseEntry>(`/api/leases/${row.id}`, {
        ...toRequest(toFormData(row)),
        pinned: newPinned,
      })
      setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)))
      setDetail(updated)
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">임대차 현황</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "불러오는 중..." : `전체 ${rows.length}건 · 현재 ${filteredRows.length}건 표시`}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            templateName="임대차"
            columns={[
              { key: "category", label: "구분", required: true, example: "운영법인" },
              { key: "corpName", label: "법인명", example: "한빛컴퍼니" },
              { key: "ceoName", label: "대표자명", required: true, example: "홍길동" },
              { key: "location", label: "소재지", example: "서울시 강남구 테헤란로 123" },
              { key: "contractStart", label: "계약시작일", example: "2025-01-01" },
              { key: "contractEnd", label: "계약종료일", example: "2027-12-31" },
              { key: "deposit", label: "보증금", example: "50000000" },
              { key: "monthlyRent", label: "월납입금", example: "3200000" },
              { key: "paymentDay", label: "납입일", example: "5" },
              { key: "contact", label: "연락처", example: "010-1234-5678" },
              { key: "emergencyContact", label: "긴급연락처", example: "010-9876-5432" },
              { key: "sharedOfficeName", label: "공유오피스상호", example: "" },
              { key: "status", label: "상태", example: "계약중" },
            ] satisfies ExcelColumn[]}
            onRows={async (rows) => {
              let success = 0
              const failed: Array<{ row: number; reason: string }> = []
              for (let i = 0; i < rows.length; i++) {
                const r = rows[i]
                try {
                  const knownCategories = ["운영법인", "하위법인", "상품권 법인", "영세 법인", "기타"]
                  const normalize = (s: string) => s.normalize("NFC").replace(/\s+/g, "").toLowerCase()
                  const matched = knownCategories.find((k) => normalize(k) === normalize(r.category ?? ""))
                  await api.post("/api/leases", {
                    category: matched ?? "기타",
                    categoryNote: !matched && r.category ? r.category : null,
                    corpName: r.corpName || "", ceoName: r.ceoName,
                    location: r.location || "", contractStart: r.contractStart || null, contractEnd: r.contractEnd || null,
                    deposit: Number(r.deposit.replace(/,/g, "")) || 0,
                    monthlyRent: Number(r.monthlyRent.replace(/,/g, "")) || 0,
                    paymentDay: r.paymentDay || "", contact: r.contact || "",
                    emergencyContact: r.emergencyContact || "",
                    sharedOfficeName: r.sharedOfficeName || "", status: r.status || "계약중",
                  })
                  success++
                } catch (e) { failed.push({ row: i + 2, reason: e instanceof ApiError ? e.message : "오류" }) }
              }
              await refresh()
              return { success, failed }
            }}
          />
          <Button onClick={() => { setSubmitError(null); setOpen(true) }} className="gap-1.5">
            <Plus className="h-4 w-4" />등록
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      ) : null}

      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="min-h-80 overflow-auto">
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
                        colIdx < 2 && "sticky z-10",
                      )}
                      style={{ minWidth: col.minWidth, left: colIdx < 2 ? stickyOffsets[colIdx] : undefined }}
                    >
                      {col.key === "category" ? (
                        <select
                          value={filters["category"] ?? ""}
                          onChange={(e) => setFilter("category", e.target.value)}
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-normal text-foreground"
                        >
                          <option value="">구분</option>
                          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : col.key === "status" ? (
                        <select
                          value={filters["status"] ?? ""}
                          onChange={(e) => setFilter("status", e.target.value)}
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-normal text-foreground"
                        >
                          <option value="">상태</option>
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
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
                    <td colSpan={columns.length} className="h-64 px-4 py-10 text-center text-muted-foreground">
                      조건에 맞는 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="group cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent/50"
                      onClick={() => openDetail(row)}
                    >
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
                            colIdx < 2 && "sticky z-10 bg-card group-hover:bg-accent",
                          )}
                          style={{ left: colIdx < 2 ? stickyOffsets[colIdx] : undefined }}
                        >
                          {col.key === "category" && (
                            <span className="flex items-center gap-1">
                              {row.pinned && <Pin className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" />}
                              <CategoryBadge category={row.category} categoryNote={row.categoryNote} />
                            </span>
                          )}
                          {col.key === "corpName" && <span className="font-medium">{row.corpName}</span>}
                          {col.key === "status" && <StatusBadge status={row.status} />}
                          {col.key === "deposit" && <span className="tabular-nums">{fmt(row.deposit)}</span>}
                          {col.key === "monthlyRent" && <span className="tabular-nums">{fmt(row.monthlyRent)}</span>}
                          {col.key === "sharedOfficeName" && <span className="text-muted-foreground">{row.sharedOfficeName || "-"}</span>}
                          {!BADGE_KEYS.includes(col.key) && (String(row[col.key as keyof LeaseEntry] ?? "") || "-")}
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

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setEditMode(false); setSubmitError(null) } }}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle>임대차 상세 정보</DialogTitle>
              {detail && (
                <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm">
                  <Pin className={cn("h-3.5 w-3.5", detail.pinned ? "fill-amber-500 text-amber-500" : "text-muted-foreground")} />
                  <input
                    type="checkbox"
                    checked={detail.pinned}
                    onChange={() => togglePin(detail)}
                    className="h-3.5 w-3.5 accent-amber-500"
                  />
                  <span className={detail.pinned ? "font-medium text-amber-600" : "text-muted-foreground"}>고정</span>
                </label>
              )}
            </div>
          </DialogHeader>
          {detail && (
            <div className="flex flex-col gap-4 py-2">
              {submitError ? <p className="text-xs text-destructive">{submitError}</p> : null}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
                  <div className="flex gap-2">
                    {editMode ? (
                      <>
                        <Button variant="outline" size="sm" className="h-8 px-3" disabled={submitting} onClick={() => resetDetail(detail)}>취소</Button>
                        <Button size="sm" className="h-8 px-3" disabled={submitting} onClick={handleSaveDetail}>{submitting ? "저장 중..." : "저장"}</Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => setEditMode(true)}>수정</Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {editMode ? (
                    <>
                      <SelectField id="d-category" label="구분" value={detailForm.category} onChange={(v) => setDetailField("category", v)} options={CATEGORY_OPTIONS} />
                      <Field id="d-corpName" label="법인명" value={detailForm.corpName} onChange={(v) => setDetailField("corpName", v)} />
                      <Field id="d-ceoName" label="대표자명" value={detailForm.ceoName} onChange={(v) => setDetailField("ceoName", v)} />
                      <Field id="d-contact" label="연락처" value={detailForm.contact} onChange={(v) => setDetailField("contact", v)} />
                      <Field id="d-emergency-contact" label="긴급 연락처" value={detailForm.emergencyContact} onChange={(v) => setDetailField("emergencyContact", v)} />
                      <Field id="d-shared" label="공유오피스 상호명" value={detailForm.sharedOfficeName} onChange={(v) => setDetailField("sharedOfficeName", v)} placeholder="해당 없으면 비워두세요" />
                      <SelectField id="d-status" label="상태" value={detailForm.status} onChange={(v) => setDetailField("status", v)} options={STATUS_OPTIONS} />
                    </>
                  ) : (
                    [
                      { label: "구분", value: detail.category, isCat: true },
                      { label: "법인명", value: detail.corpName },
                      { label: "대표자명", value: detail.ceoName },
                      { label: "연락처", value: detail.contact },
                      { label: "긴급 연락처", value: detail.emergencyContact || "-" },
                      { label: "공유오피스 상호명", value: detail.sharedOfficeName || "-" },
                      { label: "상태", value: detail.status, isStat: true },
                      { label: "등록일", value: detail.registeredAt },
                    ].map(({ label, value, isCat, isStat }) => (
                      <div key={label} className="flex gap-2">
                        <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
                        {isCat ? <CategoryBadge category={value} categoryNote={detail.categoryNote} /> :
                          isStat ? <StatusBadge status={value} /> :
                            <span className="font-medium text-foreground">{value}</span>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">계약 정보</p>
                {editMode ? (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div className="col-span-2">
                      <Field id="d-location" label="부동산 소재지" value={detailForm.location} onChange={(v) => setDetailField("location", v)} placeholder="주소 입력" />
                    </div>
                    <Field id="d-contractStart" label="계약 시작일" value={detailForm.contractStart} onChange={(v) => setDetailField("contractStart", v)} type="date" />
                    <Field id="d-contractEnd" label="계약 종료일" value={detailForm.contractEnd} onChange={(v) => setDetailField("contractEnd", v)} type="date" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                    <div className="col-span-2 flex gap-2">
                      <span className="w-28 shrink-0 text-muted-foreground">부동산 소재지</span>
                      <span className="font-medium text-foreground">{detail.location || "-"}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-28 shrink-0 text-muted-foreground">계약 시작일</span>
                      <span className="font-medium text-foreground">{detail.contractStart || "-"}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-28 shrink-0 text-muted-foreground">계약 종료일</span>
                      <span className="font-medium text-foreground">{detail.contractEnd || "-"}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">임대료 정보</p>
                {editMode ? (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <Field id="d-deposit" label="보증금" value={detailForm.deposit} onChange={(v) => setDetailField("deposit", toCommaNumber(v))} placeholder="0" />
                    <Field id="d-monthlyRent" label="월 납입금" value={detailForm.monthlyRent} onChange={(v) => setDetailField("monthlyRent", toCommaNumber(v))} placeholder="0" />
                    <Field id="d-paymentDay" label="납입일" value={detailForm.paymentDay} onChange={(v) => setDetailField("paymentDay", v)} placeholder="예: 매월 25일" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                    <div className="flex gap-2">
                      <span className="w-28 shrink-0 text-muted-foreground">보증금</span>
                      <span className="font-semibold tabular-nums text-foreground">{fmt(detail.deposit)}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-28 shrink-0 text-muted-foreground">월 납입금</span>
                      <span className="font-semibold tabular-nums text-foreground">{fmt(detail.monthlyRent)}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-28 shrink-0 text-muted-foreground">납입일</span>
                      <span className="font-medium text-foreground">{detail.paymentDay || "-"}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>임대차 등록</DialogTitle>
          </DialogHeader>
          {submitError && <p className="text-xs text-destructive">{submitError}</p>}
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <SelectField id="r-category" label="구분" value={form.category} onChange={(v) => set("category", v)} options={CATEGORY_OPTIONS} />
                <Field id="r-corpName" label="법인명 *" value={form.corpName} onChange={(v) => set("corpName", v)} placeholder="법인명 입력" />
                <Field id="r-ceoName" label="대표자명" value={form.ceoName} onChange={(v) => set("ceoName", v)} placeholder="홍길동" />
                <Field id="r-contact" label="연락처" value={form.contact} onChange={(v) => set("contact", v)} placeholder="010-0000-0000" />
                <Field id="r-emergency-contact" label="긴급 연락처" value={form.emergencyContact} onChange={(v) => set("emergencyContact", v)} placeholder="010-0000-0000" />
                <Field id="r-shared" label="공유오피스 상호명" value={form.sharedOfficeName} onChange={(v) => set("sharedOfficeName", v)} placeholder="해당 없으면 비워두세요" />
                <SelectField id="r-status" label="상태" value={form.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">계약 정보</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <div className="col-span-2">
                  <Field id="r-location" label="부동산 소재지" value={form.location} onChange={(v) => set("location", v)} placeholder="시/도 구/군 읍/면/동" />
                </div>
                <Field id="r-contractStart" label="계약 시작일" value={form.contractStart} onChange={(v) => set("contractStart", v)} type="date" />
                <Field id="r-contractEnd" label="계약 종료일" value={form.contractEnd} onChange={(v) => set("contractEnd", v)} type="date" />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">임대료 정보</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <Field id="r-deposit" label="보증금" value={form.deposit} onChange={(v) => set("deposit", toCommaNumber(v))} placeholder="0" />
                <Field id="r-monthlyRent" label="월 납입금" value={form.monthlyRent} onChange={(v) => set("monthlyRent", toCommaNumber(v))} placeholder="0" />
                <Field id="r-paymentDay" label="납입일" value={form.paymentDay} onChange={(v) => set("paymentDay", v)} placeholder="예: 매월 25일" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={submitting} onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "등록 중..." : "등록"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
