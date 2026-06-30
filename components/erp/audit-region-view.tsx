"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, X } from "lucide-react"
import { ExcelUploadButton, type ExcelColumn } from "@/components/erp/excel-upload-button"
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
  bizInfos: string
}

type BizInfo = { region: string; city: string; regDate: string }

type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

const STATUS_OPTIONS = ["활성", "대기중", "중지"]
const STATUS_ORDER: Record<string, number> = { 활성: 0, 대기중: 1, 중지: 2 }

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
  { key: "status", label: "상태", minWidth: "100px" },
  { key: "name", label: "이름", minWidth: "110px" },
  { key: "regNo", label: "주민번호", minWidth: "145px" },
  { key: "contact", label: "연락처", minWidth: "130px" },
  { key: "email", label: "이메일", minWidth: "200px" },
  { key: "address", label: "주소", minWidth: "220px" },
  { key: "account", label: "계좌정보", minWidth: "190px" },
  { key: "note", label: "비고", minWidth: "160px" },
  { key: "bizRegion", label: "지역", minWidth: "110px" },
  { key: "bizCity", label: "시", minWidth: "100px" },
  { key: "bizRegDate", label: "사업자 등록일", minWidth: "120px" },
  { key: "registeredAt", label: "등록일", minWidth: "110px" },
] as const

const stickyOffsets = [0, 100]

type FormData = {
  name: string; regNo: string; contact: string; email: string
  address: string; account: string; note: string; status: string
  bizInfos: BizInfo[]
}

const emptyBizInfo = (): BizInfo => ({ region: "서울", city: "", regDate: "" })

const emptyForm = (): FormData => ({
  name: "", regNo: "", contact: "", email: "",
  address: "", account: "", note: "", status: "활성",
  bizInfos: [emptyBizInfo()],
})

function parseBizInfos(raw: string, fallback: { bizRegion: string; bizCity: string; bizRegDate: string | null }): BizInfo[] {
  try {
    const parsed = JSON.parse(raw || "[]")
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as BizInfo[]
  } catch { /* ignore */ }
  if (fallback.bizRegion || fallback.bizCity || fallback.bizRegDate) {
    return [{ region: fallback.bizRegion || "서울", city: fallback.bizCity || "", regDate: fallback.bizRegDate || "" }]
  }
  return [emptyBizInfo()]
}

function toRequest(form: FormData) {
  const first = form.bizInfos[0] ?? emptyBizInfo()
  return {
    name: form.name.trim(),
    regNo: form.regNo,
    contact: form.contact,
    email: form.email,
    address: form.address,
    account: form.account,
    note: form.note,
    status: form.status,
    bizRegion: first.region || "서울",
    bizCity: first.city,
    bizRegDate: first.regDate || null,
    bizInfos: JSON.stringify(form.bizInfos),
  }
}

function toFormData(row: AuditEntry): FormData {
  return {
    name: row.name, regNo: row.regNo, contact: row.contact, email: row.email,
    address: row.address, account: row.account, note: row.note, status: row.status,
    bizInfos: parseBizInfos(row.bizInfos, { bizRegion: row.bizRegion, bizCity: row.bizCity, bizRegDate: row.bizRegDate }),
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
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function BizInfosEditor({ bizInfos, onChange }: { bizInfos: BizInfo[]; onChange: (infos: BizInfo[]) => void }) {
  function add() { onChange([...bizInfos, emptyBizInfo()]) }
  function remove(i: number) { onChange(bizInfos.filter((_, idx) => idx !== i)) }
  function update(i: number, field: keyof BizInfo, value: string) {
    onChange(bizInfos.map((b, idx) => idx === i ? { ...b, [field]: value } : b))
  }

  return (
    <div className="flex flex-col gap-3">
      {bizInfos.map((biz, i) => (
        <div key={i} className="relative rounded-md border border-border bg-background p-3">
          {bizInfos.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {bizInfos.length > 1 && (
            <p className="mb-2 text-xs font-medium text-muted-foreground">사업자 {i + 1}</p>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">지역</Label>
              <select
                value={biz.region}
                onChange={(e) => update(i, "region", e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2.5 text-sm text-foreground"
              >
                {REGION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">시 / 구</Label>
              <Input
                value={biz.city}
                onChange={(e) => update(i, "city", e.target.value)}
                placeholder="예: 수원시, 강남구"
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">사업자 등록일</Label>
              <Input
                type="date"
                value={biz.regDate}
                onChange={(e) => update(i, "regDate", e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5 text-xs" onClick={add}>
        <Plus className="h-3.5 w-3.5" />
        사업자 추가
      </Button>
    </div>
  )
}

export function AuditRegionView() {
  const [rows, setRows] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<AuditEntry | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm())
  const [detailForm, setDetailForm] = useState<FormData>(emptyForm())
  const [editMode, setEditMode] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  function setField<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }
  function setDetailField<K extends keyof FormData>(k: K, v: FormData[K]) {
    setDetailForm((f) => ({ ...f, [k]: v }))
  }
  const setFilter = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v }))

  async function refresh() {
    setLoading(true); setError(null)
    try {
      const page = await api.get<PageResponse<AuditEntry>>("/api/audit-regions?size=200")
      setRows(page.content)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "감사 지역 목록을 불러오지 못했습니다.")
    } finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [])

  const filteredRows = useMemo(() =>
    rows
      .filter((row) =>
        columns.every((col) => {
          const term = filters[col.key]?.trim().toLowerCase()
          if (!term) return true
          return String(row[col.key as keyof AuditEntry] ?? "").toLowerCase().includes(term)
        })
      )
      .sort((a, b) => {
        const sd = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
        if (sd !== 0) return sd
        return b.registeredAt.localeCompare(a.registeredAt)
      }),
    [rows, filters])

  async function handleSubmit() {
    setSubmitError(null)
    if (!form.name.trim()) { setSubmitError("이름은 필수입니다."); return }
    if (!form.regNo.trim()) { setSubmitError("주민번호는 필수입니다."); return }
    setSubmitting(true)
    try {
      await api.post<AuditEntry>("/api/audit-regions", toRequest(form))
      setForm(emptyForm()); setOpen(false)
      await refresh()
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "등록에 실패했습니다.")
    } finally { setSubmitting(false) }
  }

  function openDetail(row: AuditEntry) {
    setDetail(row); setDetailForm(toFormData(row)); setEditMode(false); setSubmitError(null)
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      for (const id of selectedIds) {
        await api.delete(`/api/audit-regions/${id}`)
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

  async function handleSaveDetail() {
    if (!detail) return
    setSubmitError(null); setSubmitting(true)
    try {
      const updated = await api.put<AuditEntry>(`/api/audit-regions/${detail.id}`, toRequest(detailForm))
      setRows((prev) => prev.map((r) => (r.id === detail.id ? updated : r)))
      setDetail(updated); setEditMode(false)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "수정에 실패했습니다.")
    } finally { setSubmitting(false) }
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
            templateName="감사지역"
            columns={[
              { key: "name", label: "성명", required: true, example: "홍길동" },
              { key: "regNo", label: "주민등록번호", example: "900101-1234567" },
              { key: "contact", label: "연락처", example: "010-1234-5678" },
              { key: "email", label: "이메일주소", example: "test@email.com" },
              { key: "address", label: "주소", example: "서울시 강남구" },
              { key: "account", label: "계좌정보", example: "국민은행 123-456-789012" },
              { key: "note", label: "비고", example: "" },
            ] satisfies ExcelColumn[]}
            onRows={async (rows) => {
              let success = 0
              const failed: Array<{ row: number; reason: string }> = []
              for (let i = 0; i < rows.length; i++) {
                const r = rows[i]
                try {
                  await api.post("/api/audit-regions", {
                    name: r.name, regNo: r.regNo || "", contact: r.contact || "",
                    email: r.email || "", address: r.address || "", account: r.account || "",
                    bizRegion: "서울", bizCity: "",
                    bizRegDate: null, status: r.status || "활성", note: r.note || "",
                  })
                  success++
                } catch (e) { failed.push({ row: i + 2, reason: e instanceof ApiError ? e.message : "오류" }) }
              }
              await refresh()
              return { success, failed }
            }}
          />
          <Button onClick={() => { setSubmitError(null); setForm(emptyForm()); setOpen(true) }} className="gap-1.5">
            <Plus className="h-4 w-4" />등록
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

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
                  {bulkMode && (
                    <th className="w-10 px-3 py-2.5 border-b border-border bg-muted/70">
                      <input type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={selectedIds.size === filteredRows.length && filteredRows.length > 0}
                        onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredRows.map((r) => r.id)) : new Set())}
                      />
                    </th>
                  )}
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
                          <select value={filters["status"] ?? ""} onChange={(e) => setFilter("status", e.target.value)}
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-normal text-foreground">
                            <option value="">상태</option>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : col.key === "bizRegion" ? (
                          <select value={filters["bizRegion"] ?? ""} onChange={(e) => setFilter("bizRegion", e.target.value)}
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-normal text-foreground">
                            <option value="">지역</option>
                            {REGION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : (
                          <Input value={filters[col.key] ?? ""} onChange={(e) => setFilter(col.key, e.target.value)}
                            placeholder={col.label} className="h-8 bg-background text-xs font-normal" />
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={columns.length} className="h-64 px-4 py-10 text-center text-muted-foreground">조건에 맞는 데이터가 없습니다.</td></tr>
                ) : (
                  filteredRows.map((row) => {
                    const infos = parseBizInfos(row.bizInfos, { bizRegion: row.bizRegion, bizCity: row.bizCity, bizRegDate: row.bizRegDate })
                    const first = infos[0]
                    const extra = infos.length - 1
                    return (
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
                        {columns.map((col, colIdx) => {
                          const isBiz = colIdx >= 8 && colIdx <= 10
                          const raw = row[col.key as keyof AuditEntry]
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
                                <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[row.status] ?? "bg-muted text-muted-foreground")}>{row.status}</span>
                              )}
                              {col.key === "note" && <span className="text-muted-foreground">{row.note || "-"}</span>}
                              {col.key === "bizRegion" && (
                                <span className="flex items-center gap-1.5">
                                  {first?.region || "-"}
                                  {extra > 0 && <span className="inline-flex rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">+{extra}</span>}
                                </span>
                              )}
                              {col.key === "bizCity" && (first?.city || "-")}
                              {col.key === "bizRegDate" && (first?.regDate || "-")}
                              {!["name","status","note","bizRegion","bizCity","bizRegDate"].includes(col.key) && (String(raw ?? "") || "-")}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 상세/수정 다이얼로그 */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setEditMode(false); setSubmitError(null) } }}>
        <DialogContent className="!w-[60vw] !max-w-[60vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>상세 정보</DialogTitle></DialogHeader>
          {detail && (() => {
            const detailBizInfos = parseBizInfos(detail.bizInfos, { bizRegion: detail.bizRegion, bizCity: detail.bizCity, bizRegDate: detail.bizRegDate })
            return (
              <div className="flex flex-col gap-4 py-2">
                {submitError && <p className="text-xs text-destructive">{submitError}</p>}

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
                    <div className="flex gap-2">
                      {editMode ? (
                        <>
                          <Button variant="outline" size="sm" className="h-8 px-3" disabled={submitting} onClick={() => { setDetailForm(toFormData(detail)); setEditMode(false) }}>취소</Button>
                          <Button size="sm" className="h-8 px-3" disabled={submitting} onClick={handleSaveDetail}>{submitting ? "저장 중..." : "저장"}</Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => setEditMode(true)}>수정</Button>
                      )}
                    </div>
                  </div>
                  {editMode ? (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                      <Field id="d-name" label="이름" value={detailForm.name} onChange={(v) => setDetailField("name", v)} />
                      <Field id="d-regNo" label="주민번호" value={detailForm.regNo} onChange={(v) => setDetailField("regNo", v)} />
                      <Field id="d-contact" label="연락처" value={detailForm.contact} onChange={(v) => setDetailField("contact", v)} />
                      <Field id="d-email" label="이메일" value={detailForm.email} onChange={(v) => setDetailField("email", v)} />
                      <Field id="d-address" label="주소" value={detailForm.address} onChange={(v) => setDetailField("address", v)} />
                      <Field id="d-account" label="계좌정보" value={detailForm.account} onChange={(v) => setDetailField("account", v)} />
                      <Field id="d-note" label="비고" value={detailForm.note} onChange={(v) => setDetailField("note", v)} />
                      <SelectField id="d-status" label="상태" value={detailForm.status} onChange={(v) => setDetailField("status", v)} options={STATUS_OPTIONS} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                      {([
                        { label: "이름", value: detail.name },
                        { label: "주민번호", value: detail.regNo },
                        { label: "연락처", value: detail.contact },
                        { label: "이메일", value: detail.email },
                        { label: "주소", value: detail.address },
                        { label: "계좌정보", value: detail.account },
                        { label: "비고", value: detail.note || "-" },
                        { label: "상태", value: detail.status, isStatus: true },
                        { label: "등록일", value: detail.registeredAt },
                      ] as { label: string; value: string; isStatus?: boolean }[]).map(({ label, value, isStatus }) => (
                        <div key={label} className="flex gap-2">
                          <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
                          {isStatus ? (
                            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[value] ?? "bg-muted text-muted-foreground")}>{value}</span>
                          ) : (
                            <span className="font-medium text-foreground">{value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-indigo-600">사업자 정보</p>
                  {editMode ? (
                    <BizInfosEditor
                      bizInfos={detailForm.bizInfos}
                      onChange={(infos) => setDetailField("bizInfos", infos)}
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      {detailBizInfos.map((biz, i) => (
                        <div key={i} className="grid grid-cols-3 gap-x-6 rounded-md border border-border bg-background px-3 py-2 text-sm">
                          {detailBizInfos.length > 1 && (
                            <p className="col-span-3 mb-1 text-xs font-medium text-muted-foreground">사업자 {i + 1}</p>
                          )}
                          <div className="flex gap-2"><span className="text-muted-foreground">지역</span><span className="font-medium">{biz.region || "-"}</span></div>
                          <div className="flex gap-2"><span className="text-muted-foreground">시/구</span><span className="font-medium">{biz.city || "-"}</span></div>
                          <div className="flex gap-2"><span className="text-muted-foreground">등록일</span><span className="font-medium">{biz.regDate || "-"}</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDetail(null); setEditMode(false) }}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* 등록 다이얼로그 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[60vw] !max-w-[60vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>등록</DialogTitle></DialogHeader>
          {submitError && <p className="text-xs text-destructive">{submitError}</p>}
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <Field id="r-name" label="이름 *" value={form.name} onChange={(v) => setField("name", v)} placeholder="홍길동" />
                <Field id="r-regNo" label="주민번호 *" value={form.regNo} onChange={(v) => setField("regNo", v)} placeholder="000000-0000000" />
                <Field id="r-contact" label="연락처" value={form.contact} onChange={(v) => setField("contact", v)} placeholder="010-0000-0000" />
                <Field id="r-email" label="이메일" value={form.email} onChange={(v) => setField("email", v)} placeholder="example@email.com" />
                <Field id="r-address" label="주소" value={form.address} onChange={(v) => setField("address", v)} placeholder="시/도 구/군 읍/면/동" />
                <Field id="r-account" label="계좌정보" value={form.account} onChange={(v) => setField("account", v)} placeholder="은행명 000-000-000000" />
                <Field id="r-note" label="비고" value={form.note} onChange={(v) => setField("note", v)} placeholder="메모 입력" />
                <SelectField id="r-status" label="상태" value={form.status} onChange={(v) => setField("status", v)} options={STATUS_OPTIONS} />
              </div>
            </div>

            <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-indigo-600">사업자 정보</p>
              <BizInfosEditor
                bizInfos={form.bizInfos}
                onChange={(infos) => setField("bizInfos", infos)}
              />
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
