"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn, toCommaNumber } from "@/lib/utils"

type LeaseEntry = {
  category: string
  corpName: string
  ceoName: string
  location: string
  contractStart: string
  contractEnd: string
  deposit: number
  monthlyRent: number
  paymentDay: string
  contact: string
  sharedOfficeName: string
  status: string
  registeredAt: string
}

const CATEGORY_OPTIONS = ["운영법인", "하위법인", "상품권 법인", "영세 법인", "기타"]
const STATUS_OPTIONS   = ["계약중", "만료임박", "만료", "대기중"]

const categoryStyles: Record<string, string> = {
  "운영법인":   "bg-emerald-100 text-emerald-700",
  "하위법인":   "bg-sky-100 text-sky-700",
  "상품권 법인": "bg-orange-100 text-orange-700",
  "영세 법인":  "bg-slate-200 text-slate-700",
  "기타":      "bg-gray-100 text-gray-600",
}

const statusStyles: Record<string, string> = {
  "계약중":  "bg-blue-100 text-blue-700",
  "만료임박": "bg-red-100 text-red-600",
  "만료":    "bg-gray-200 text-gray-600",
  "대기중":  "bg-yellow-100 text-yellow-700",
}

const columns = [
  { key: "category",         label: "구분",           minWidth: "120px" },
  { key: "corpName",         label: "법인명",          minWidth: "140px" },
  { key: "ceoName",          label: "대표자명",        minWidth: "110px" },
  { key: "location",         label: "부동산 소재지",   minWidth: "230px" },
  { key: "contractStart",    label: "계약 시작일",     minWidth: "115px" },
  { key: "contractEnd",      label: "계약 종료일",     minWidth: "115px" },
  { key: "deposit",          label: "보증금",          minWidth: "140px" },
  { key: "monthlyRent",      label: "월 납입금",       minWidth: "130px" },
  { key: "paymentDay",       label: "납입일",          minWidth: "90px"  },
  { key: "contact",          label: "연락처",          minWidth: "130px" },
  { key: "sharedOfficeName", label: "공유오피스 상호명", minWidth: "170px" },
  { key: "status",           label: "상태",            minWidth: "100px" },
  { key: "registeredAt",     label: "등록일",          minWidth: "110px" },
]

// category(120) + corpName(140) sticky
const stickyOffsets = [0, 120]

const fmt = (n: number) => n.toLocaleString("ko-KR") + "원"

const BADGE_KEYS = ["category", "corpName", "status", "deposit", "monthlyRent", "sharedOfficeName"]

const initialRows: LeaseEntry[] = [
  {
    category: "운영법인", corpName: "운영 법인", ceoName: "김한빛",
    location: "서울 강남구 테헤란로 123 10층",
    contractStart: "2023-01-01", contractEnd: "2025-12-31",
    deposit: 50000000, monthlyRent: 3200000, paymentDay: "매월 25일",
    contact: "010-1234-5678", sharedOfficeName: "",
    status: "계약중", registeredAt: "2023-01-05",
  },
  {
    category: "운영법인", corpName: "운영 법인", ceoName: "최운영",
    location: "부산 해운대구 센텀중앙로 90 5층",
    contractStart: "2024-02-01", contractEnd: "2027-01-31",
    deposit: 30000000, monthlyRent: 2500000, paymentDay: "매월 10일",
    contact: "010-5555-6677", sharedOfficeName: "",
    status: "계약중", registeredAt: "2024-02-05",
  },
  {
    category: "하위법인", corpName: "하위 법인", ceoName: "이대성",
    location: "서울 영등포구 여의대로 7",
    contractStart: "2022-07-01", contractEnd: "2026-06-30",
    deposit: 80000000, monthlyRent: 4100000, paymentDay: "매월 1일",
    contact: "010-2222-3333", sharedOfficeName: "",
    status: "계약중", registeredAt: "2022-07-10",
  },
  {
    category: "하위법인", corpName: "하위 법인", ceoName: "윤하위",
    location: "대전 유성구 대학로 99",
    contractStart: "2024-03-01", contractEnd: "2026-02-28",
    deposit: 0, monthlyRent: 750000, paymentDay: "매월 20일",
    contact: "010-7788-1122", sharedOfficeName: "위워크 대전점",
    status: "계약중", registeredAt: "2024-03-10",
  },
  {
    category: "상품권 법인", corpName: "상품권 법인", ceoName: "박상품",
    location: "경기 성남시 분당구 판교로 256",
    contractStart: "2023-06-01", contractEnd: "2026-05-31",
    deposit: 60000000, monthlyRent: 3800000, paymentDay: "매월 5일",
    contact: "010-3456-7788", sharedOfficeName: "",
    status: "만료임박", registeredAt: "2023-06-05",
  },
  {
    category: "상품권 법인", corpName: "상품권 법인", ceoName: "강상품",
    location: "서울 마포구 월드컵북로 120",
    contractStart: "2024-09-01", contractEnd: "2026-08-31",
    deposit: 0, monthlyRent: 920000, paymentDay: "매월 15일",
    contact: "010-3344-9900", sharedOfficeName: "패스트파이브 마포점",
    status: "계약중", registeredAt: "2024-09-05",
  },
  {
    category: "영세 법인", corpName: "계약법인(영세)", ceoName: "정영세",
    location: "인천 남동구 논현로 88",
    contractStart: "2023-04-01", contractEnd: "2025-03-31",
    deposit: 10000000, monthlyRent: 1200000, paymentDay: "매월 25일",
    contact: "010-9876-5432", sharedOfficeName: "",
    status: "만료", registeredAt: "2023-04-15",
  },
  {
    category: "영세 법인", corpName: "계약법인(영세)", ceoName: "한계약",
    location: "광주 서구 상무중앙로 50",
    contractStart: "2025-01-01", contractEnd: "2026-12-31",
    deposit: 5000000, monthlyRent: 800000, paymentDay: "매월 10일",
    contact: "010-1212-3434", sharedOfficeName: "",
    status: "계약중", registeredAt: "2025-01-10",
  },
  {
    category: "기타", corpName: "기타 법인", ceoName: "홍기타",
    location: "서울 성동구 뚝섬로 273",
    contractStart: "2025-03-01", contractEnd: "2027-02-28",
    deposit: 0, monthlyRent: 580000, paymentDay: "매월 5일",
    contact: "010-0000-1111", sharedOfficeName: "스파크플러스 성수점",
    status: "계약중", registeredAt: "2025-03-05",
  },
]

type FormData = {
  category: string; corpName: string; ceoName: string; location: string
  contractStart: string; contractEnd: string; deposit: string; monthlyRent: string
  paymentDay: string; contact: string; sharedOfficeName: string; status: string
}

const emptyForm: FormData = {
  category: "운영법인", corpName: "", ceoName: "", location: "",
  contractStart: "", contractEnd: "", deposit: "", monthlyRent: "",
  paymentDay: "", contact: "", sharedOfficeName: "", status: "계약중",
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

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", categoryStyles[category] ?? "bg-muted text-muted-foreground")}>
      {category}
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
  const [rows, setRows]             = useState<LeaseEntry[]>(initialRows)
  const [open, setOpen]             = useState(false)
  const [detail, setDetail]         = useState<LeaseEntry | null>(null)
  const [form, setForm]             = useState<FormData>(emptyForm)
  const [detailForm, setDetailForm] = useState<FormData>(emptyForm)
  const [editMode, setEditMode]     = useState(false)
  const [filters, setFilters]       = useState<Record<string, string>>({})
  const [error, setError]           = useState("")

  const set            = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const setDetailField = (k: keyof FormData, v: string) => setDetailForm((f) => ({ ...f, [k]: v }))
  const setFilter      = (k: string, v: string)         => setFilters((f) => ({ ...f, [k]: v }))

  const filteredRows = useMemo(() =>
    rows.filter((row) =>
      columns.every((col) => {
        const term = filters[col.key]?.trim().toLowerCase()
        if (!term) return true
        return String((row as any)[col.key] ?? "").toLowerCase().includes(term)
      })
    ), [rows, filters])

  function toFormData(row: LeaseEntry): FormData {
    return {
      category: row.category, corpName: row.corpName, ceoName: row.ceoName,
      location: row.location, contractStart: row.contractStart, contractEnd: row.contractEnd,
      deposit: row.deposit ? row.deposit.toLocaleString("ko-KR") : "",
      monthlyRent: row.monthlyRent ? row.monthlyRent.toLocaleString("ko-KR") : "",
      paymentDay: row.paymentDay ?? "",
      contact: row.contact, sharedOfficeName: row.sharedOfficeName, status: row.status,
    }
  }

  function handleSubmit() {
    if (!form.corpName.trim()) { setError("법인명은 필수입니다."); return }
    const today = new Date().toISOString().slice(0, 10)
    setRows((prev) => [...prev, {
      ...form, corpName: form.corpName.trim(),
      deposit: Number(form.deposit.replace(/,/g, "")) || 0,
      monthlyRent: Number(form.monthlyRent.replace(/,/g, "")) || 0,
      registeredAt: today,
    }])
    setForm(emptyForm)
    setError("")
    setOpen(false)
  }

  function openDetail(row: LeaseEntry) {
    setDetail(row)
    setDetailForm(toFormData(row))
    setEditMode(false)
  }

  function handleSaveDetail() {
    if (!detail) return
    const updated = {
      ...detail, ...detailForm, corpName: detailForm.corpName.trim(),
      deposit: Number(detailForm.deposit.replace(/,/g, "")) || 0,
      monthlyRent: Number(detailForm.monthlyRent.replace(/,/g, "")) || 0,
    }
    setRows((prev) => prev.map((r) => r === detail ? updated : r))
    setDetail(updated)
    setEditMode(false)
  }

  function resetDetail(row: LeaseEntry) {
    setDetailForm(toFormData(row))
    setEditMode(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">임대차 현황</h2>
          <p className="text-sm text-muted-foreground">전체 {rows.length}건 · 현재 {filteredRows.length}건 표시</p>
        </div>
        <Button onClick={() => { setError(""); setOpen(true) }} className="gap-1.5">
          <Plus className="h-4 w-4" />등록
        </Button>
      </div>

      {/* 목록 테이블 */}
      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="min-h-80 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="text-left text-muted-foreground">
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
                  filteredRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="group cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent/50"
                      onClick={() => openDetail(row)}
                    >
                      {columns.map((col, colIdx) => (
                        <td
                          key={col.key}
                          className={cn(
                            "whitespace-nowrap px-3 py-2.5 text-foreground",
                            colIdx < 2 && "sticky z-10 bg-card group-hover:bg-accent",
                          )}
                          style={{ left: colIdx < 2 ? stickyOffsets[colIdx] : undefined }}
                        >
                          {col.key === "category"         && <CategoryBadge category={row.category} />}
                          {col.key === "corpName"         && <span className="font-medium">{row.corpName}</span>}
                          {col.key === "status"           && <StatusBadge status={row.status} />}
                          {col.key === "deposit"          && <span className="tabular-nums">{fmt(row.deposit)}</span>}
                          {col.key === "monthlyRent"      && <span className="tabular-nums">{fmt(row.monthlyRent)}</span>}
                          {col.key === "sharedOfficeName" && <span className="text-muted-foreground">{row.sharedOfficeName || "-"}</span>}
                          {!BADGE_KEYS.includes(col.key) && (row as any)[col.key]}
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

      {/* ── 상세 팝업 ── */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>임대차 상세 정보</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="flex flex-col gap-4 py-2">

              {/* 기본 정보 */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
                  <div className="flex gap-2">
                    {editMode ? (
                      <>
                        <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => resetDetail(detail)}>취소</Button>
                        <Button size="sm" className="h-8 px-3" onClick={handleSaveDetail}>저장</Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => setEditMode(true)}>수정</Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {editMode ? (
                    <>
                      <SelectField id="d-category" label="구분"            value={detailForm.category}         onChange={(v) => setDetailField("category", v)}         options={CATEGORY_OPTIONS} />
                      <Field       id="d-corpName"  label="법인명"          value={detailForm.corpName}          onChange={(v) => setDetailField("corpName", v)} />
                      <Field       id="d-ceoName"   label="대표자명"        value={detailForm.ceoName}           onChange={(v) => setDetailField("ceoName", v)} />
                      <Field       id="d-contact"   label="연락처"          value={detailForm.contact}           onChange={(v) => setDetailField("contact", v)} />
                      <Field       id="d-shared"    label="공유오피스 상호명" value={detailForm.sharedOfficeName} onChange={(v) => setDetailField("sharedOfficeName", v)} placeholder="해당 없으면 비워두세요" />
                      <SelectField id="d-status"    label="상태"            value={detailForm.status}            onChange={(v) => setDetailField("status", v)}            options={STATUS_OPTIONS} />
                    </>
                  ) : (
                    [
                      { label: "구분",              value: detail.category,         isCat: true  },
                      { label: "법인명",            value: detail.corpName                       },
                      { label: "대표자명",          value: detail.ceoName                        },
                      { label: "연락처",            value: detail.contact                        },
                      { label: "공유오피스 상호명", value: detail.sharedOfficeName || "-"        },
                      { label: "상태",              value: detail.status,           isStat: true },
                      { label: "등록일",            value: detail.registeredAt                   },
                    ].map(({ label, value, isCat, isStat }) => (
                      <div key={label} className="flex gap-2">
                        <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
                        {isCat  ? <CategoryBadge category={value} /> :
                         isStat ? <StatusBadge status={value} /> :
                         <span className="font-medium text-foreground">{value}</span>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 계약 정보 */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">계약 정보</p>
                {editMode ? (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div className="col-span-2">
                      <Field id="d-location" label="부동산 소재지" value={detailForm.location} onChange={(v) => setDetailField("location", v)} placeholder="주소 입력" />
                    </div>
                    <Field id="d-contractStart" label="계약 시작일" value={detailForm.contractStart} onChange={(v) => setDetailField("contractStart", v)} type="date" />
                    <Field id="d-contractEnd"   label="계약 종료일" value={detailForm.contractEnd}   onChange={(v) => setDetailField("contractEnd", v)}   type="date" />
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

              {/* 임대료 정보 */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">임대료 정보</p>
                {editMode ? (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <Field id="d-deposit"     label="보증금"    value={detailForm.deposit}     onChange={(v) => setDetailField("deposit", toCommaNumber(v))}     placeholder="0" />
                    <Field id="d-monthlyRent" label="월 납입금"  value={detailForm.monthlyRent} onChange={(v) => setDetailField("monthlyRent", toCommaNumber(v))} placeholder="0" />
                    <Field id="d-paymentDay"  label="납입일"    value={detailForm.paymentDay}  onChange={(v) => setDetailField("paymentDay", v)}                  placeholder="예: 매월 25일" />
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

      {/* ── 등록 팝업 ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>임대차 등록</DialogTitle>
          </DialogHeader>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex flex-col gap-4 py-2">

            {/* 기본 정보 */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <SelectField id="r-category" label="구분"            value={form.category}         onChange={(v) => set("category", v)}         options={CATEGORY_OPTIONS} />
                <Field       id="r-corpName"  label="법인명 *"        value={form.corpName}          onChange={(v) => set("corpName", v)}          placeholder="법인명 입력" />
                <Field       id="r-ceoName"   label="대표자명"        value={form.ceoName}           onChange={(v) => set("ceoName", v)}           placeholder="홍길동" />
                <Field       id="r-contact"   label="연락처"          value={form.contact}           onChange={(v) => set("contact", v)}           placeholder="010-0000-0000" />
                <Field       id="r-shared"    label="공유오피스 상호명" value={form.sharedOfficeName} onChange={(v) => set("sharedOfficeName", v)} placeholder="해당 없으면 비워두세요" />
                <SelectField id="r-status"    label="상태"            value={form.status}            onChange={(v) => set("status", v)}            options={STATUS_OPTIONS} />
              </div>
            </div>

            {/* 계약 정보 */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">계약 정보</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <div className="col-span-2">
                  <Field id="r-location" label="부동산 소재지" value={form.location} onChange={(v) => set("location", v)} placeholder="시/도 구/군 읍/면/동" />
                </div>
                <Field id="r-contractStart" label="계약 시작일" value={form.contractStart} onChange={(v) => set("contractStart", v)} type="date" />
                <Field id="r-contractEnd"   label="계약 종료일" value={form.contractEnd}   onChange={(v) => set("contractEnd", v)}   type="date" />
              </div>
            </div>

            {/* 임대료 정보 */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">임대료 정보</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <Field id="r-deposit"     label="보증금"    value={form.deposit}     onChange={(v) => set("deposit", toCommaNumber(v))}     placeholder="0" />
                <Field id="r-monthlyRent" label="월 납입금"  value={form.monthlyRent} onChange={(v) => set("monthlyRent", toCommaNumber(v))} placeholder="0" />
                <Field id="r-paymentDay"  label="납입일"    value={form.paymentDay}  onChange={(v) => set("paymentDay", v)}                  placeholder="예: 매월 25일" />
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={handleSubmit}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
