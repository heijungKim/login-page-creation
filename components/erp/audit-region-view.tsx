"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ApiError, api } from "@/lib/api"

type AuditEntry = {
  id: number
  name: string
  regNo: string
  contact: string
  email: string
  address: string
  account: string
  note: string
  status: string
  registeredAt: string
  bizRegion: string
  bizCity: string
  bizRegDate: string | null
}

type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

const STATUS_OPTIONS = ["활성", "대기중", "중지"]

const REGION_OPTIONS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기도", "강원도", "충청북도", "충청남도", "전라북도", "전라남도", "경상북도", "경상남도", "제주도",
]

const statusStyles: Record<string, string> = {
  활성: "bg-blue-100 text-blue-700",
  대기중: "bg-gray-200 text-gray-700",
  중지: "bg-red-100 text-red-700",
}

const columns = [
  { key: "name", label: "이름", minWidth: "110px" },
  { key: "regNo", label: "주민번호", minWidth: "145px" },
  { key: "contact", label: "연락처", minWidth: "130px" },
  { key: "email", label: "이메일", minWidth: "200px" },
  { key: "address", label: "주소", minWidth: "220px" },
  { key: "account", label: "계좌정보", minWidth: "190px" },
  { key: "note", label: "비고", minWidth: "160px" },
  { key: "status", label: "상태", minWidth: "100px" },
  { key: "bizRegion", label: "지역", minWidth: "110px" },
  { key: "bizCity", label: "시", minWidth: "100px" },
  { key: "bizRegDate", label: "사업자 등록일", minWidth: "120px" },
  { key: "registeredAt", label: "등록일", minWidth: "110px" },
] as const

const stickyOffsets = [0, 110]

type FormData = {
  name: string; regNo: string; contact: string; email: string
  address: string; account: string; note: string; status: string
  bizRegion: string; bizCity: string; bizRegDate: string
}

const emptyForm: FormData = {
  name: "", regNo: "", contact: "", email: "",
  address: "", account: "", note: "", status: "활성",
  bizRegion: "서울", bizCity: "", bizRegDate: "",
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

function SelectField({ id, label, value, onChange, options, placeholder }: {
  id: string; label: string; value: string
  onChange: (v: string) => void; options: string[]; placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function toRequest(form: FormData) {
  return {
    name: form.name.trim(),
    regNo: form.regNo,
    contact: form.contact,
    email: form.email,
    address: form.address,
    account: form.account,
    note: form.note,
    status: form.status,
    bizRegion: form.bizRegion || "서울",
    bizCity: form.bizCity,
    bizRegDate: form.bizRegDate || null,
  }
}

function toFormData(row: AuditEntry): FormData {
  return {
    name: row.name, regNo: row.regNo, contact: row.contact, email: row.email,
    address: row.address, account: row.account, note: row.note, status: row.status,
    bizRegion: row.bizRegion, bizCity: row.bizCity, bizRegDate: row.bizRegDate ?? "",
  }
}

export function AuditRegionView() {
  const [rows, setRows] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<AuditEntry | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [detailForm, setDetailForm] = useState<FormData>(emptyForm)
  const [editMode, setEditMode] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const setDetailField = (k: keyof FormData, v: string) => setDetailForm((f) => ({ ...f, [k]: v }))
  const setFilter = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v }))

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const page = await api.get<PageResponse<AuditEntry>>("/api/audit-regions?size=200")
      setRows(page.content)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "감사 지역 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const filteredRows = useMemo(() =>
    rows.filter((row) =>
      columns.every((col) => {
        const term = filters[col.key]?.trim().toLowerCase()
        if (!term) return true
        const value = row[col.key as keyof AuditEntry]
        return String(value ?? "").toLowerCase().includes(term)
      })
    ), [rows, filters])

  async function handleSubmit() {
    setSubmitError(null)
    if (!form.name.trim()) { setSubmitError("이름은 필수입니다."); return }
    if (!form.regNo.trim()) { setSubmitError("주민번호는 필수입니다."); return }
    setSubmitting(true)
    try {
      await api.post<AuditEntry>("/api/audit-regions", toRequest(form))
      setForm(emptyForm)
      setOpen(false)
      await refresh()
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "등록에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  function openDetail(row: AuditEntry) {
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
      const updated = await api.put<AuditEntry>(`/api/audit-regions/${detail.id}`, toRequest(detailForm))
      setRows((prev) => prev.map((r) => (r.id === detail.id ? updated : r)))
      setDetail(updated)
      setEditMode(false)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "수정에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  function resetDetail(row: AuditEntry) {
    setDetailForm(toFormData(row))
    setEditMode(false)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">감사/사업자 지역</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "불러오는 중..." : `전체 ${rows.length}건 · 현재 ${filteredRows.length}건 표시`}
          </p>
        </div>
        <Button onClick={() => { setSubmitError(null); setOpen(true) }} className="gap-1.5">
          <Plus className="h-4 w-4" />
          등록
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      ) : null}

      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="min-h-80 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="text-left text-xs font-semibold">
                  <th colSpan={8} className="border-b border-border/40 bg-muted/60 px-3 py-1 text-muted-foreground">기본 정보</th>
                  <th colSpan={3} className="border-b border-border/40 border-l-2 border-l-indigo-300 bg-indigo-50/70 px-3 py-1 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">사업자 정보</th>
                  <th className="border-b border-border/40 bg-muted/60 px-3 py-1" />
                </tr>
                <tr className="text-left text-muted-foreground">
                  {columns.map((col, colIdx) => {
                    const isBiz = colIdx >= 8 && colIdx <= 10
                    return (
                      <th
                        key={col.key}
                        className={cn(
                          "border-b border-border px-3 py-2.5 align-middle font-medium backdrop-blur",
                          colIdx < 2 && "sticky z-10",
                          isBiz ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "bg-muted/70",
                          isBiz && colIdx === 8 && "border-l-2 border-l-indigo-300",
                        )}
                        style={{ minWidth: col.minWidth, left: colIdx < 2 ? stickyOffsets[colIdx] : undefined }}
                      >
                        {col.key === "status" ? (
                          <select
                            value={filters["status"] ?? ""}
                            onChange={(e) => setFilter("status", e.target.value)}
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-normal text-foreground"
                          >
                            <option value="">상태</option>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : col.key === "bizRegion" ? (
                          <select
                            value={filters["bizRegion"] ?? ""}
                            onChange={(e) => setFilter("bizRegion", e.target.value)}
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-normal text-foreground"
                          >
                            <option value="">지역</option>
                            {REGION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
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
                    )
                  })}
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
                      {columns.map((col, colIdx) => {
                        const isBiz = colIdx >= 8 && colIdx <= 10
                        const value = row[col.key as keyof AuditEntry]
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              "whitespace-nowrap px-3 py-2.5 text-foreground",
                              colIdx < 2 && "sticky z-10 bg-card group-hover:bg-accent",
                              isBiz && "bg-indigo-50/30 group-hover:bg-indigo-50/60 dark:bg-indigo-950/10",
                              isBiz && colIdx === 8 && "border-l-2 border-l-indigo-200",
                            )}
                            style={{ left: colIdx < 2 ? stickyOffsets[colIdx] : undefined }}
                          >
                            {col.key === "name" && <span className="font-medium">{row.name}</span>}
                            {col.key === "status" && (
                              <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[row.status] ?? "bg-muted text-muted-foreground")}>
                                {row.status}
                              </span>
                            )}
                            {col.key === "note" && <span className="text-muted-foreground">{row.note || "-"}</span>}
                            {col.key !== "name" && col.key !== "status" && col.key !== "note" && (String(value ?? "") || "-")}
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

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setEditMode(false); setSubmitError(null) } }}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>상세 정보</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="flex flex-col gap-4 py-2">
              {submitError ? (
                <p className="text-xs text-destructive">{submitError}</p>
              ) : null}
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
                      <Field id="d-name" label="이름" value={detailForm.name} onChange={(v) => setDetailField("name", v)} />
                      <Field id="d-regNo" label="주민번호" value={detailForm.regNo} onChange={(v) => setDetailField("regNo", v)} />
                      <Field id="d-contact" label="연락처" value={detailForm.contact} onChange={(v) => setDetailField("contact", v)} />
                      <Field id="d-email" label="이메일" value={detailForm.email} onChange={(v) => setDetailField("email", v)} />
                      <Field id="d-address" label="주소" value={detailForm.address} onChange={(v) => setDetailField("address", v)} />
                      <Field id="d-account" label="계좌정보" value={detailForm.account} onChange={(v) => setDetailField("account", v)} />
                      <Field id="d-note" label="비고" value={detailForm.note} onChange={(v) => setDetailField("note", v)} />
                      <SelectField id="d-status" label="상태" value={detailForm.status} onChange={(v) => setDetailField("status", v)} options={STATUS_OPTIONS} />
                    </>
                  ) : (
                    [
                      { label: "이름", value: detail.name },
                      { label: "주민번호", value: detail.regNo },
                      { label: "연락처", value: detail.contact },
                      { label: "이메일", value: detail.email },
                      { label: "주소", value: detail.address },
                      { label: "계좌정보", value: detail.account },
                      { label: "비고", value: detail.note || "-" },
                      { label: "상태", value: detail.status, isStatus: true },
                      { label: "등록일", value: detail.registeredAt },
                    ].map(({ label, value, isStatus }) => (
                      <div key={label} className="flex gap-2">
                        <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
                        {isStatus ? (
                          <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[value] ?? "bg-muted text-muted-foreground")}>{value}</span>
                        ) : (
                          <span className="font-medium text-foreground">{value}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">사업자 정보</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {editMode ? (
                    <>
                      <SelectField id="d-bizRegion" label="지역" value={detailForm.bizRegion} onChange={(v) => setDetailField("bizRegion", v)} options={REGION_OPTIONS} />
                      <Field id="d-bizCity" label="시 / 구" value={detailForm.bizCity} onChange={(v) => setDetailField("bizCity", v)} placeholder="예: 수원시, 강남구" />
                      <Field id="d-bizRegDate" label="사업자 등록일" value={detailForm.bizRegDate} onChange={(v) => setDetailField("bizRegDate", v)} type="date" />
                    </>
                  ) : (
                    [
                      { label: "지역", value: detail.bizRegion || "-" },
                      { label: "시 / 구", value: detail.bizCity || "-" },
                      { label: "사업자 등록일", value: detail.bizRegDate || "-" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex gap-2">
                        <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
                        <span className="font-medium text-foreground">{value}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDetail(null); setEditMode(false) }}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>등록</DialogTitle>
          </DialogHeader>
          {submitError && <p className="text-xs text-destructive">{submitError}</p>}
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <Field id="r-name" label="이름 *" value={form.name} onChange={(v) => set("name", v)} placeholder="홍길동" />
                <Field id="r-regNo" label="주민번호 *" value={form.regNo} onChange={(v) => set("regNo", v)} placeholder="000000-0000000" />
                <Field id="r-contact" label="연락처" value={form.contact} onChange={(v) => set("contact", v)} placeholder="010-0000-0000" />
                <Field id="r-email" label="이메일" value={form.email} onChange={(v) => set("email", v)} placeholder="example@email.com" />
                <Field id="r-address" label="주소" value={form.address} onChange={(v) => set("address", v)} placeholder="시/도 구/군 읍/면/동" />
                <Field id="r-account" label="계좌정보" value={form.account} onChange={(v) => set("account", v)} placeholder="은행명 000-000-000000" />
                <Field id="r-note" label="비고" value={form.note} onChange={(v) => set("note", v)} placeholder="메모 입력" />
                <SelectField id="r-status" label="상태" value={form.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">사업자 정보</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <SelectField id="r-bizRegion" label="지역" value={form.bizRegion} onChange={(v) => set("bizRegion", v)} options={REGION_OPTIONS} />
                <Field id="r-bizCity" label="시 / 구" value={form.bizCity} onChange={(v) => set("bizCity", v)} placeholder="예: 수원시, 강남구" />
                <Field id="r-bizRegDate" label="사업자 등록일" value={form.bizRegDate} onChange={(v) => set("bizRegDate", v)} type="date" />
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
