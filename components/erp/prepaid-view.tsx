"use client"

import { useMemo, useState } from "react"
import { Plus, Pencil, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { cn, toCommaNumber } from "@/lib/utils"

// ─── 타입 ────────────────────────────────────────────────────────────────────
type PrepaidEntry = {
  id: string           // 이름 기반 고유 ID (동일 이름 = 같은 ID)
  name: string         // 이름
  amount: number       // 선지급 금액 (이번 건)
  payDate: string      // 지급 날짜
  status: string       // 상태
  memo: string         // 비고
  registeredAt: string // 등록일
}

const STATUS_OPTIONS = ["진행중", "종결"]

const statusStyles: Record<string, string> = {
  "진행중": "bg-yellow-100 text-yellow-700",
  "종결":   "bg-gray-200 text-gray-600",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  )
}

// ─── 샘플 데이터 ─────────────────────────────────────────────────────────────
const initialRows: PrepaidEntry[] = [
  { id: "kim-daepyo",  name: "김대표", amount: 500000,  payDate: "2024-01-10", status: "종결",   memo: "1월 생활비 선지급",    registeredAt: "2024-01-10" },
  { id: "lee-isa",     name: "이이사", amount: 300000,  payDate: "2024-01-15", status: "종결",   memo: "1월 식대",             registeredAt: "2024-01-15" },
  { id: "kim-daepyo",  name: "김대표", amount: 200000,  payDate: "2024-02-08", status: "종결",   memo: "2월 추가 선지급",       registeredAt: "2024-02-08" },
  { id: "park-team",   name: "박팀장", amount: 150000,  payDate: "2024-02-20", status: "진행중", memo: "출장비 선지급",         registeredAt: "2024-02-20" },
  { id: "lee-isa",     name: "이이사", amount: 100000,  payDate: "2024-03-05", status: "종결",   memo: "3월 교통비",           registeredAt: "2024-03-05" },
  { id: "choi-gamsa",  name: "최감사", amount: 250000,  payDate: "2024-03-10", status: "진행중", memo: "1분기 정산 선지급",     registeredAt: "2024-03-10" },
  { id: "jung-dir",    name: "정이사", amount: 400000,  payDate: "2024-03-18", status: "종결",   memo: "외부 미팅 경비",       registeredAt: "2024-03-18" },
  { id: "kim-daepyo",  name: "김대표", amount: 300000,  payDate: "2024-03-25", status: "진행중", memo: "3월 추가",             registeredAt: "2024-03-25" },
  { id: "park-team",   name: "박팀장", amount: 200000,  payDate: "2024-04-02", status: "종결",   memo: "4월 교통·숙박",        registeredAt: "2024-04-02" },
  { id: "choi-gamsa",  name: "최감사", amount: 180000,  payDate: "2024-04-10", status: "진행중", memo: "세무 자료 준비 경비",   registeredAt: "2024-04-10" },
  { id: "jung-dir",    name: "정이사", amount: 350000,  payDate: "2024-04-15", status: "진행중", memo: "4월 운영비 선지급",     registeredAt: "2024-04-15" },
  { id: "lee-isa",     name: "이이사", amount: 250000,  payDate: "2024-04-20", status: "진행중", memo: "교육 수강료",           registeredAt: "2024-04-20" },
  { id: "oh-staff",    name: "오직원", amount: 120000,  payDate: "2024-05-03", status: "종결",   memo: "5월 복지비",           registeredAt: "2024-05-03" },
  { id: "kim-daepyo",  name: "김대표", amount: 500000,  payDate: "2024-05-08", status: "진행중", memo: "5월 대표 선지급",       registeredAt: "2024-05-08" },
  { id: "oh-staff",    name: "오직원", amount:  80000,  payDate: "2024-05-20", status: "진행중", memo: "야근 식대 선지급",      registeredAt: "2024-05-20" },
]

// ─── 금액 포맷 ────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("ko-KR") + "원"

// ─── 빈 폼 ───────────────────────────────────────────────────────────────────
type FormData = { name: string; amount: string; payDate: string; status: string; memo: string }
const emptyForm: FormData = { name: "", amount: "", payDate: "", status: "진행중", memo: "" }

// ─── 컬럼 정의 ───────────────────────────────────────────────────────────────
const columns = [
  { key: "name",         label: "이름",       minWidth: "100px",  filterOptions: undefined },
  { key: "total",        label: "합계",       minWidth: "120px",  filterOptions: undefined },
  { key: "paid",         label: "지급 금액",  minWidth: "120px",  filterOptions: undefined },
  { key: "deducted",     label: "차감 금액",  minWidth: "120px",  filterOptions: undefined },
  { key: "memo",         label: "비고",       minWidth: "180px",  filterOptions: undefined },
  { key: "status",       label: "상태",       minWidth: "130px",  filterOptions: STATUS_OPTIONS },
  { key: "registeredAt", label: "등록일",     minWidth: "110px",  filterOptions: undefined },
] as const

type ColKey = typeof columns[number]["key"]

// ─── 텍스트 입력 필드 ─────────────────────────────────────────────────────────
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

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export function PrepaidView() {
  const [rows, setRows] = useState<PrepaidEntry[]>(initialRows)
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<PrepaidEntry | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const [detailForm, setDetailForm] = useState({ payDate: today, amount: "", memo: "", type: "지급" })
  const [editMode, setEditMode] = useState(false)
  const [editFields, setEditFields] = useState({ name: "", status: "", memo: "" })
  const [form, setForm] = useState<FormData>(emptyForm)
  const [filters, setFilters] = useState<Partial<Record<ColKey, string>>>({})

  // 이름별 누적 합계 맵 (지급/차감 구분)
  const { totalByName, paidByName, deductedByName } = useMemo(() => {
    const paid: Record<string, number> = {}
    const deducted: Record<string, number> = {}
    rows.forEach((r) => {
      const v = r.amount ?? 0
      if (v >= 0) paid[r.id] = (paid[r.id] ?? 0) + v
      else deducted[r.id] = (deducted[r.id] ?? 0) + Math.abs(v)
    })
    const total: Record<string, number> = {}
    const ids = new Set<string>([...Object.keys(paid), ...Object.keys(deducted)])
    ids.forEach((id) => {
      total[id] = (paid[id] ?? 0) - (deducted[id] ?? 0)
    })
    return { totalByName: total, paidByName: paid, deductedByName: deducted }
  }, [rows])

  const set = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }))
  const setFilter = (k: ColKey, v: string) => setFilters((p) => ({ ...p, [k]: v }))
  const setDetailFormField = (k: keyof typeof detailForm, v: string) =>
    setDetailForm((p) => ({ ...p, [k]: v }))

  // 중복 제거 및 필터 적용 및 정렬
  const filteredRows = useMemo(() => {
    // 같은 id의 마지막 건만 표시 (최신 건)
    const uniqueByName: Record<string, PrepaidEntry> = {}
    rows.forEach((r) => {
      uniqueByName[r.id] = r
    })
    const unique = Object.values(uniqueByName)

    const filtered = unique.filter((row) =>
      columns.every((col) => {
        const term = filters[col.key]?.trim()
        if (!term) return true
        if (col.filterOptions) return String((row as any)[col.key] ?? "") === term
        if (col.key === "total") return String(totalByName[row.id] ?? 0).includes(term.toLowerCase())
        if (col.key === "paid") return String(paidByName[row.id] ?? 0).includes(term.toLowerCase())
        if (col.key === "deducted") return String(deductedByName[row.id] ?? 0).includes(term.toLowerCase())
        return String((row as any)[col.key] ?? "").toLowerCase().includes(term.toLowerCase())
      }),
    )
    // 정렬: 등록일 최신순, 진행중이 위에
    return filtered.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "진행중" ? -1 : 1
      }
      return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
    })
  }, [rows, filters, totalByName, paidByName, deductedByName])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.amount.trim() || !form.payDate) return
    const parsed = parseInt(form.amount.replace(/[^0-9]/g, ""), 10)
    if (isNaN(parsed)) return
    // 동일 이름이면 기존 id 재사용
    const existing = rows.find((r) => r.name === form.name.trim())
    const id = existing ? existing.id : form.name.trim().toLowerCase().replace(/\s+/g, "-")
    const today = new Date().toISOString().slice(0, 10)
    setRows((prev) => [
      ...prev,
      { id, name: form.name.trim(), amount: parsed, payDate: form.payDate, status: form.status, memo: form.memo, registeredAt: today },
    ])
    setForm(emptyForm)
    setOpen(false)
  }
  return (
    <div className="flex flex-col gap-5">
      {/* 상단 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">선지급 내역</h2>
          <p className="text-sm text-muted-foreground">
            전체 {rows.length}건 · 현재 {filteredRows.length}건 표시
          </p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setOpen(true) }} className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          선지급 등록
        </Button>
      </div>

      {/* 테이블 */}
      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="min-h-80 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="text-left text-muted-foreground">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="border-b border-border bg-muted/70 px-3 py-2.5 align-middle font-medium backdrop-blur"
                      style={{ minWidth: col.minWidth }}
                    >
                      {col.filterOptions ? (
                        <Select
                          value={filters[col.key] || "__all__"}
                          onValueChange={(v) => setFilter(col.key as ColKey, v === "__all__" ? "" : (v ?? ""))}
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
                    <td colSpan={columns.length} className="h-64 px-4 py-10 text-center text-muted-foreground">
                      조건에 맞는 내역이 없습��다.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        "group cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent/50",
                        row.status === "종결" ? "bg-muted/40 text-muted-foreground" : "bg-white",
                      )}
                      onClick={() => {
                        setDetail(row)
                        setDetailForm({ payDate: today, amount: "", memo: "", type: "지급" })
                      }}
                    >
                        {columns.map((col) => {
                          let content: React.ReactNode = "-"
                          if (col.key === "status") {
                            content = <StatusBadge status={row.status} />
                          } else if (col.key === "name") {
                            content = <span className="font-medium">{row.name}</span>
                          } else if (col.key === "total") {
                            const total = totalByName[row.id] ?? 0
                            content = (
                              <span className={cn("font-semibold tabular-nums", total > 0 ? "text-blue-600" : total < 0 ? "text-red-600" : "text-foreground")}>
                                {fmt(total)}
                              </span>
                            )
                          } else if (col.key === "paid") {
                            content = (
                              <span className="font-medium tabular-nums">{fmt(paidByName[row.id] ?? 0)}</span>
                            )
                          } else if (col.key === "deducted") {
                            content = (
                              <span className="font-medium tabular-nums text-red-600">{fmt(deductedByName[row.id] ?? 0)}</span>
                            )
                          } else if (col.key === "memo") {
                            content = <span className="text-muted-foreground">{row.memo || "-"}</span>
                          } else {
                            content = (row as any)[col.key] || "-"
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
              {/* 총합계 */}
              {filteredRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/50">
                    <td className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">총합계</td>
                    <td className={cn("px-3 py-2.5 font-semibold tabular-nums", filteredRows.reduce((sum, r) => sum + (totalByName[r.id] ?? 0), 0) > 0 ? "text-blue-600" : filteredRows.reduce((sum, r) => sum + (totalByName[r.id] ?? 0), 0) < 0 ? "text-red-600" : "text-foreground")}>{fmt(filteredRows.reduce((sum, r) => sum + (totalByName[r.id] ?? 0), 0))}</td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums">{fmt(filteredRows.reduce((sum, r) => sum + (paidByName[r.id] ?? 0), 0))}</td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums text-red-600">{fmt(filteredRows.reduce((sum, r) => sum + (deductedByName[r.id] ?? 0), 0))}</td>
                    <td colSpan={columns.length - 4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 상세 다이얼로그 */}
      <Dialog open={!!detail} onOpenChange={(o) => {
        if (!o) {
          setDetail(null)
          setDetailForm({ payDate: today, amount: "", memo: "", type: "지급" })
          setEditMode(false)
        }
      }}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>선지급 상세 정보</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="flex flex-col gap-5 py-2">

              {/* 기본 정보 */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
                  {!editMode ? (
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => { setEditMode(true); setEditFields({ name: detail.name, status: detail.status, memo: detail.memo || "" }) }}
                    >
                      <Pencil className="h-3 w-3" />수정
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 gap-1 px-2 text-xs text-green-600 hover:text-green-700"
                        onClick={() => {
                          setRows((prev) => prev.map((r) =>
                            r.id === detail.id
                              ? { ...r, name: editFields.name, status: editFields.status, memo: editFields.memo }
                              : r
                          ))
                          setDetail((prev) => prev ? { ...prev, name: editFields.name, status: editFields.status, memo: editFields.memo } : prev)
                          setEditMode(false)
                        }}
                      >
                        <Check className="h-3 w-3" />저장
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                        onClick={() => setEditMode(false)}
                      >
                        <X className="h-3 w-3" />취소
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3 text-sm">
                  {/* 첫째 줄: 이름 / 상태 / 등록일 */}
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
                        <StatusBadge status={detail.status} />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-muted-foreground">등록일</span>
                      <span>{detail.registeredAt}</span>
                    </div>
                  </div>
                  {/* 둘째 줄: 메모 */}
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
                      <span className="text-muted-foreground">{detail.memo || "-"}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 선지급 내역 */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">선지급 내역</p>

                {/* 기존 내역 리스트 */}
                {(() => {
                  const history = rows
                    .filter((r) => r.id === detail.id)
                    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
                  return history.length > 0 ? (
                    <div className="mb-4 overflow-hidden rounded-md border border-border">
                      <table className="w-full text-sm">
                        <thead>
                              <tr className="bg-muted/60 text-left text-xs text-muted-foreground">
                                <th className="px-3 py-2 font-medium">선지급 일자</th>
                                <th className="px-3 py-2 font-medium">구분</th>
                                <th className="px-3 py-2 font-medium">금액</th>
                                <th className="px-3 py-2 font-medium">비고</th>
                                <th className="px-3 py-2 font-medium">등록일</th>
                              </tr>
                            </thead>
                            <tbody>
                              {history.map((r, i) => (
                                <tr key={i} className="border-t border-border/50">
                                  <td className="px-3 py-2 tabular-nums">{r.payDate}</td>
                                  <td className="px-3 py-2">{r.amount >= 0 ? "지급" : "차감"}</td>
                                  <td className={cn("px-3 py-2 font-medium tabular-nums", r.amount >= 0 ? "text-blue-600" : "text-red-600")}>{fmt(Math.abs(r.amount))}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{r.memo || "-"}</td>
                                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.registeredAt}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-border bg-muted/40">
                                <td className="px-3 py-2 text-xs font-semibold text-muted-foreground">지급 합계</td>
                                <td className="px-3 py-2 font-bold tabular-nums text-blue-600">{fmt(paidByName[detail.id] ?? 0)}</td>
                                <td className="px-3 py-2 text-xs font-semibold text-muted-foreground">차감 합계</td>
                                <td className="px-3 py-2 font-bold tabular-nums text-red-600">{fmt(deductedByName[detail.id] ?? 0)}</td>
                                <td className={cn("px-3 py-2 font-bold tabular-nums", (totalByName[detail.id] ?? 0) > 0 ? "text-blue-600" : (totalByName[detail.id] ?? 0) < 0 ? "text-red-600" : "text-foreground")}>순합계 {fmt(totalByName[detail.id] ?? 0)}</td>
                              </tr>
                            </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="mb-4 text-xs text-muted-foreground">등록된 내역이 없습니다.</p>
                  )
                })()}

                {/* 추��� 폼 */}
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
                    onClick={() => {
                      if (!detailForm.payDate || !detailForm.amount) return
                      const parsedRaw = parseInt(detailForm.amount.replace(/[^0-9]/g, ""), 10)
                      if (isNaN(parsedRaw)) return
                      const parsed = detailForm.type === "차감" ? -Math.abs(parsedRaw) : Math.abs(parsedRaw)
                      const today = new Date().toISOString().slice(0, 10)
                      setRows((prev) => [
                        ...prev,
                        { id: detail.id, name: detail.name, amount: parsed, payDate: detailForm.payDate, status: detail.status, memo: detailForm.memo, registeredAt: today },
                      ])
                      setDetailForm({ payDate: "", amount: "", memo: "", type: "지급" })
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />추가
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDetail(null); setDetailForm({ payDate: "", amount: "", memo: "", type: "지급" }); setEditMode(false) }}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 등록 다이얼로그 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>선지급 등록</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <form id="prepaid-form" onSubmit={handleSubmit} className="flex flex-col gap-4 px-1 py-2">
              <Field id="pp-name" label="이름 *" value={form.name} onChange={(v) => set("name", v)}
                placeholder="예: 김대표" />
              <p className="text-xs text-muted-foreground -mt-2">
                동일한 이름 입력 시 선지급 합계에 자동으로 누적됩니다.
              </p>
              <Field id="pp-amount" label="선지급 금액 (���) *" value={form.amount}
                onChange={(v) => set("amount", toCommaNumber(v))} placeholder="예: 500,000" />
              <Field id="pp-paydate" label="지급 날짜 *" value={form.payDate}
                onChange={(v) => set("payDate", v)} type="date" />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pp-status" className="text-xs text-muted-foreground">상태</Label>
                <Select value={form.status} onValueChange={(v) => set("status" as keyof FormData, v ?? "")}>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button type="submit" form="prepaid-form">등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
