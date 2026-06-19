"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type AuditEntry = {
  // 기본 정보
  name: string
  regNo: string
  contact: string
  email: string
  address: string
  account: string
  note: string
  status: string
  registeredAt: string
  // 사업자 정보
  bizRegion: string
  bizCity: string
  bizRegDate: string
}

const STATUS_OPTIONS = ["활성", "대기중", "중지"]

const REGION_OPTIONS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기도", "강원도", "충청북도", "충청남도", "전라북도", "전라남도", "경상북도", "경상남도", "제주도",
]

const statusStyles: Record<string, string> = {
  활성:   "bg-blue-100 text-blue-700",
  대기중: "bg-gray-200 text-gray-700",
  중지:   "bg-red-100 text-red-700",
}

const columns = [
  { key: "name",         label: "이름",       minWidth: "110px" },
  { key: "regNo",        label: "주민번호",   minWidth: "145px" },
  { key: "contact",      label: "연락처",     minWidth: "130px" },
  { key: "email",        label: "이메일",     minWidth: "200px" },
  { key: "address",      label: "주소",       minWidth: "220px" },
  { key: "account",      label: "계좌정보",   minWidth: "190px" },
  { key: "note",         label: "비고",       minWidth: "160px" },
  { key: "status",       label: "상태",       minWidth: "100px" },
  { key: "bizRegion",    label: "지역",       minWidth: "110px" },
  { key: "bizCity",      label: "시",         minWidth: "100px" },
  { key: "bizRegDate",   label: "사업자 등록일", minWidth: "120px" },
  { key: "registeredAt", label: "등록일",     minWidth: "110px" },
]

// 이름(110) + 주민번호(145) sticky
const stickyOffsets = [0, 110]

const initialRows: AuditEntry[] = [
  {
    name: "김감사", regNo: "800101-1234567", contact: "010-1234-5678",
    email: "kim.audit@example.com", address: "서울 강남구 테헤란로 123",
    account: "국민 123-456-789012", note: "법인 감사 전담", status: "활성", registeredAt: "2024-01-10",
    bizRegion: "서울", bizCity: "강남구", bizRegDate: "2019-03-12",
  },
  {
    name: "이세무", regNo: "850515-2345678", contact: "010-2345-6789",
    email: "lee.tax@example.com", address: "서울 서초구 반포대로 55",
    account: "신한 110-234-567890", note: "세무 전문", status: "활성", registeredAt: "2024-02-15",
    bizRegion: "경기도", bizCity: "수원시", bizRegDate: "2021-06-01",
  },
  {
    name: "박지역", regNo: "900320-1456789", contact: "010-3456-7890",
    email: "park.region@example.com", address: "경기 성남시 분당구 정자로 10",
    account: "우리 1002-345-678901", note: "", status: "대기중", registeredAt: "2024-03-05",
    bizRegion: "경상북도", bizCity: "구미시", bizRegDate: "2022-11-15",
  },
  {
    name: "최담당", regNo: "921210-2567890", contact: "010-4567-8901",
    email: "choi.charge@example.com", address: "부산 해운대구 센텀로 30",
    account: "하나 123-456789-01011", note: "부산 지역 담당", status: "중지", registeredAt: "2024-04-18",
    bizRegion: "부산", bizCity: "해운대구", bizRegDate: "2020-08-20",
  },
]

type FormData = {
  name: string; regNo: string; contact: string; email: string
  address: string; account: string; note: string; status: string
  bizRegion: string; bizCity: string; bizRegDate: string
}

const emptyForm: FormData = {
  name: "", regNo: "", contact: "", email: "",
  address: "", account: "", note: "", status: "활성",
  bizRegion: "", bizCity: "", bizRegDate: "",
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

export function AuditRegionView() {
  const [rows, setRows]             = useState<AuditEntry[]>(initialRows)
  const [open, setOpen]             = useState(false)
  const [detail, setDetail]         = useState<AuditEntry | null>(null)
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

  function toFormData(row: AuditEntry): FormData {
    return {
      name: row.name, regNo: row.regNo, contact: row.contact, email: row.email,
      address: row.address, account: row.account, note: row.note, status: row.status,
      bizRegion: row.bizRegion, bizCity: row.bizCity, bizRegDate: row.bizRegDate,
    }
  }

  function handleSubmit() {
    if (!form.name.trim()) { setError("이름은 필수입니다."); return }
    const today = new Date().toISOString().slice(0, 10)
    setRows((prev) => [...prev, { ...form, name: form.name.trim(), registeredAt: today }])
    setForm(emptyForm)
    setError("")
    setOpen(false)
  }

  function openDetail(row: AuditEntry) {
    setDetail(row)
    setDetailForm(toFormData(row))
    setEditMode(false)
  }

  function handleSaveDetail() {
    if (!detail) return
    const updated = { ...detail, ...detailForm, name: detailForm.name.trim() }
    setRows((prev) => prev.map((r) => r === detail ? updated : r))
    setDetail(updated)
    setEditMode(false)
  }

  function resetDetail(row: AuditEntry) {
    setDetailForm(toFormData(row))
    setEditMode(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">감사/사업자 지역</h2>
          <p className="text-sm text-muted-foreground">
            전체 {rows.length}건 · 현재 {filteredRows.length}건 표시
          </p>
        </div>
        <Button onClick={() => { setError(""); setOpen(true) }} className="gap-1.5">
          <Plus className="h-4 w-4" />
          등록
        </Button>
      </div>

      {/* 목록 테이블 */}
      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="min-h-80 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20">
                {/* 섹션 그룹 헤더 */}
                <tr className="text-left text-xs font-semibold">
                  <th
                    colSpan={8}
                    className="border-b border-border/40 bg-muted/60 px-3 py-1 text-muted-foreground"
                  >
                    기본 정보
                  </th>
                  <th
                    colSpan={3}
                    className="border-b border-border/40 border-l-2 border-l-indigo-300 bg-indigo-50/70 px-3 py-1 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
                  >
                    사업자 정보
                  </th>
                  <th className="border-b border-border/40 bg-muted/60 px-3 py-1" />
                </tr>
                {/* 필터 행 */}
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
                  filteredRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="group cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent/50"
                      onClick={() => openDetail(row)}
                    >
                      {columns.map((col, colIdx) => {
                        const isBiz = colIdx >= 8 && colIdx <= 10
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
                          {col.key !== "name" && col.key !== "status" && col.key !== "note" && (row as any)[col.key]}
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

      {/* ── 상세 팝업 ── */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>상세 정보</DialogTitle>
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
                      <Field id="d-name"    label="이름"     value={detailForm.name}    onChange={(v) => setDetailField("name", v)} />
                      <Field id="d-regNo"   label="주민번호" value={detailForm.regNo}   onChange={(v) => setDetailField("regNo", v)} />
                      <Field id="d-contact" label="연락처"   value={detailForm.contact} onChange={(v) => setDetailField("contact", v)} />
                      <Field id="d-email"   label="이메일"   value={detailForm.email}   onChange={(v) => setDetailField("email", v)} />
                      <Field id="d-address" label="주소"     value={detailForm.address} onChange={(v) => setDetailField("address", v)} />
                      <Field id="d-account" label="계좌정보" value={detailForm.account} onChange={(v) => setDetailField("account", v)} />
                      <Field id="d-note"    label="비고"     value={detailForm.note}    onChange={(v) => setDetailField("note", v)} />
                      <SelectField id="d-status" label="상태" value={detailForm.status} onChange={(v) => setDetailField("status", v)} options={STATUS_OPTIONS} />
                    </>
                  ) : (
                    [
                      { label: "이름",     value: detail.name },
                      { label: "주민번호", value: detail.regNo },
                      { label: "연락처",   value: detail.contact },
                      { label: "이메일",   value: detail.email },
                      { label: "주소",     value: detail.address },
                      { label: "계좌정보", value: detail.account },
                      { label: "비고",     value: detail.note || "-" },
                      { label: "상태",     value: detail.status, isStatus: true },
                      { label: "등록일",   value: detail.registeredAt },
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

              {/* 사업자 정보 */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">사업자 정보</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {editMode ? (
                    <>
                      <SelectField id="d-bizRegion" label="지역" value={detailForm.bizRegion} onChange={(v) => setDetailField("bizRegion", v)} options={REGION_OPTIONS} placeholder="지역 선택" />
                      <Field id="d-bizCity"    label="시 / 구"       value={detailForm.bizCity}    onChange={(v) => setDetailField("bizCity", v)}    placeholder="예: 수원시, 강남구" />
                      <Field id="d-bizRegDate" label="사업자 등록일" value={detailForm.bizRegDate} onChange={(v) => setDetailField("bizRegDate", v)} type="date" />
                    </>
                  ) : (
                    [
                      { label: "지역",         value: detail.bizRegion  || "-" },
                      { label: "시 / 구",      value: detail.bizCity    || "-" },
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
            <Button variant="outline" onClick={() => setDetail(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 등록 팝업 ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>등록</DialogTitle>
          </DialogHeader>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex flex-col gap-4 py-2">
            {/* 기본 정보 */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <Field id="r-name"    label="이름 *"   value={form.name}    onChange={(v) => set("name", v)}    placeholder="홍길동" />
                <Field id="r-regNo"   label="주민번호" value={form.regNo}   onChange={(v) => set("regNo", v)}   placeholder="000000-0000000" />
                <Field id="r-contact" label="연락처"   value={form.contact} onChange={(v) => set("contact", v)} placeholder="010-0000-0000" />
                <Field id="r-email"   label="이메일"   value={form.email}   onChange={(v) => set("email", v)}   placeholder="example@email.com" />
                <Field id="r-address" label="주소"     value={form.address} onChange={(v) => set("address", v)} placeholder="시/도 구/군 읍/면/동" />
                <Field id="r-account" label="계좌정보" value={form.account} onChange={(v) => set("account", v)} placeholder="은행명 000-000-000000" />
                <Field id="r-note"    label="비고"     value={form.note}    onChange={(v) => set("note", v)}    placeholder="메모 입력" />
                <SelectField id="r-status" label="상태" value={form.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} />
              </div>
            </div>

            {/* 사업자 정보 */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">사업자 정보</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <SelectField id="r-bizRegion" label="지역" value={form.bizRegion} onChange={(v) => set("bizRegion", v)} options={REGION_OPTIONS} placeholder="지역 선택" />
                <Field id="r-bizCity"    label="시 / 구"       value={form.bizCity}    onChange={(v) => set("bizCity", v)}    placeholder="예: 수원시, 강남구" />
                <Field id="r-bizRegDate" label="사업자 등록일" value={form.bizRegDate} onChange={(v) => set("bizRegDate", v)} type="date" />
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
