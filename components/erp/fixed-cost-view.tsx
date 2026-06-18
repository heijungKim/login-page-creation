"use client"

import { Fragment, useMemo, useState } from "react"
import { Plus } from "lucide-react"
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

// ── 타입 ────────────────────────────────────────────────────────────────────

type FixedCost = {
  category: string          // 구분
  categoryEtc: string       // 기타 직접 입력
  item: string              // 비용항목
  amount: string            // 금액
  cycle: string             // 지급주기
  payDay: string            // 지급일
  payType: string           // 지급 타입
  account: string           // 지급 계좌
  memo: string              // 메모
  registeredAt: string      // 등록일
}

// ── 상수 ────────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = ["임대료", "관리비", "통신비", "인건비", "4대보험비", "기타"]
const CYCLE_OPTIONS    = ["매일", "매주", "매월"]
const PAY_TYPE_OPTIONS = ["선불", "후불", "기타"]

const categoryStyles: Record<string, string> = {
  임대료:   "bg-sky-100 text-sky-700",
  관리비:   "bg-violet-100 text-violet-700",
  통신비:   "bg-teal-100 text-teal-700",
  인건비:   "bg-orange-100 text-orange-700",
  "4대보험비": "bg-pink-100 text-pink-700",
  기타:     "bg-slate-200 text-slate-600",
}

const payTypeStyles: Record<string, string> = {
  선불: "bg-blue-100 text-blue-700",
  후불: "bg-amber-100 text-amber-700",
  기타: "bg-slate-200 text-slate-600",
}

// ── 샘플 데이터 ─────────────────────────────────────────────────────────────

const initialRows: FixedCost[] = [
  { category: "임대료",    categoryEtc: "", item: "사무실 임대료",   amount: "3,200,000", cycle: "매월", payDay: "5일",  payType: "선불", account: "국민 123-456-789012", memo: "",              registeredAt: "2024-01-10" },
  { category: "관리비",    categoryEtc: "", item: "건물 관리비",     amount: "320,000",   cycle: "매월", payDay: "10일", payType: "후불", account: "신한 110-234-567890", memo: "",              registeredAt: "2024-01-10" },
  { category: "통신비",    categoryEtc: "", item: "인터넷/전화",     amount: "150,000",   cycle: "매월", payDay: "15일", payType: "후불", account: "우리 1002-345-678901", memo: "회선 2개",     registeredAt: "2024-02-01" },
  { category: "인건비",    categoryEtc: "", item: "직원 급여",       amount: "28,000,000",cycle: "매월", payDay: "25일", payType: "후불", account: "기업 123-456-7890123", memo: "세전 기준",    registeredAt: "2024-01-01" },
  { category: "4대보험비", categoryEtc: "", item: "사업주 부담분",   amount: "2,850,000", cycle: "매월", payDay: "10일", payType: "후불", account: "농협 301-234-5678901", memo: "",             registeredAt: "2024-01-01" },
  { category: "기타",      categoryEtc: "회계 프로그램", item: "회계 프로그램 구독료", amount: "150,000", cycle: "매월", payDay: "1일", payType: "선불", account: "하나 123-456789-01011", memo: "ERP 라이선스", registeredAt: "2024-03-15" },
]

// ── 컬럼 정의 ────────────────────────────────────────────────────────────────

type Column = {
  key: keyof FixedCost
  label: string
  minWidth?: string
  filterOptions?: string[]
}

const columns: Column[] = [
  { key: "category",    label: "구분",      minWidth: "130px", filterOptions: CATEGORY_OPTIONS },
  { key: "item",        label: "비용항목",  minWidth: "160px" },
  { key: "amount",      label: "금액",      minWidth: "130px" },
  { key: "cycle",       label: "지급주기",  minWidth: "110px", filterOptions: CYCLE_OPTIONS },
  { key: "payDay",      label: "지급일",    minWidth: "100px" },
  { key: "payType",     label: "지급타입",  minWidth: "110px", filterOptions: PAY_TYPE_OPTIONS },
  { key: "account",     label: "지급계좌",  minWidth: "200px" },
  { key: "memo",        label: "메모",      minWidth: "180px" },
  { key: "registeredAt",label: "등록일",    minWidth: "110px" },
]

const stickyOffsets = [0, 130, 290]   // category(130) + item(160)

// ── 배지 컴포넌트 ────────────────────────────────────────────────────────────

function Chip({ label, styleMap }: { label: string; styleMap: Record<string, string> }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", styleMap[label] ?? "bg-muted text-muted-foreground")}>
      {label}
    </span>
  )
}

// ── 폼 필드 헬퍼 ─────────────────────────────────────────────────────────────

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

// ── 등록 다이얼로그 ──────────────────────────────────────────────────────────

const emptyForm: Omit<FixedCost, "registeredAt"> = {
  category: "임대료", categoryEtc: "", item: "", amount: "",
  cycle: "매월", payDay: "", payType: "선불", account: "", memo: "",
}

function FixedCostDialog({ open, onOpenChange, onSubmit }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (data: Omit<FixedCost, "registeredAt">) => void
}) {
  const [form, setForm] = useState<Omit<FixedCost, "registeredAt">>(emptyForm)
  const set = (k: keyof typeof emptyForm, v: string) => setForm((p) => ({ ...p, [k]: v }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
    setForm(emptyForm)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>고정 비용 등록</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2">

          {/* 구분 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fc-category" className="text-xs text-muted-foreground">구분</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger id="fc-category">
                <span>{form.category}</span>
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 기타 구분 직접 입력 */}
          {form.category === "기타" && (
            <Field id="fc-category-etc" label="기타 구분 입력" value={form.categoryEtc}
              onChange={(v) => set("categoryEtc", v)} placeholder="구분명을 입력하세요" />
          )}

          {/* 비용항목 */}
          <Field id="fc-item" label="비용항목" value={form.item}
            onChange={(v) => set("item", v)} placeholder="예: 사무실 임대료" />

          {/* 금액 */}
          <Field id="fc-amount" label="금액 (원)" value={form.amount}
            onChange={(v) => set("amount", toCommaNumber(v))} placeholder="예: 3,200,000" />

          {/* 지급주기 / 지급일 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fc-cycle" className="text-xs text-muted-foreground">지급주기</Label>
              <Select value={form.cycle} onValueChange={(v) => set("cycle", v)}>
                <SelectTrigger id="fc-cycle"><span>{form.cycle}</span></SelectTrigger>
                <SelectContent>
                  {CYCLE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Field id="fc-payday" label="지급일" value={form.payDay}
              onChange={(v) => set("payDay", v)} placeholder="예: 5일 / 매주 월요일" />
          </div>

          {/* 지급 타입 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fc-paytype" className="text-xs text-muted-foreground">지급 타입</Label>
            <Select value={form.payType} onValueChange={(v) => set("payType", v)}>
              <SelectTrigger id="fc-paytype"><span>{form.payType}</span></SelectTrigger>
              <SelectContent>
                {PAY_TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 지급 계좌 */}
          <Field id="fc-account" label="지급 계좌" value={form.account}
            onChange={(v) => set("account", v)} placeholder="예: 국민 123-456-789012" />

          {/* 메모 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fc-memo" className="text-xs text-muted-foreground">메모</Label>
            <Textarea id="fc-memo" value={form.memo} onChange={(e) => set("memo", e.target.value)}
              placeholder="추가 메모를 입력하세요" rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit">등록</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── 메인 뷰 ─────────────────────────────────────────────────────────────────

export function FixedCostView() {
  const [rows, setRows] = useState<FixedCost[]>(initialRows)
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})

  const setFilter = (k: string, v: string) => setFilters((p) => ({ ...p, [k]: v }))

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      columns.every((col) => {
        const term = filters[col.key]?.trim()
        if (!term) return true
        if (col.filterOptions) return String(row[col.key]) === term
        return String(row[col.key] ?? "").toLowerCase().includes(term.toLowerCase())
      }),
    )
  }, [rows, filters])

  function handleSubmit(data: Omit<FixedCost, "registeredAt">) {
    const registeredAt = new Date().toISOString().slice(0, 10)
    setRows((prev) => [{ ...data, registeredAt }, ...prev])
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">고정 비용</h2>
          <p className="text-sm text-muted-foreground">
            전체 {rows.length}건 · 현재 {filteredRows.length}건 표시
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          비용 등록
        </Button>
      </div>

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
                        colIdx < 3 && "sticky z-10",
                      )}
                      style={{ minWidth: col.minWidth, left: colIdx < 3 ? stickyOffsets[colIdx] : undefined }}
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
                  filteredRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="group border-b border-border/60 transition-colors last:border-0 hover:bg-accent/50"
                    >
                      {columns.map((col, colIdx) => (
                        <td
                          key={col.key}
                          className={cn(
                            "whitespace-nowrap px-3 py-2.5 text-foreground",
                            colIdx < 3 && "sticky z-10 bg-card group-hover:bg-accent",
                          )}
                          style={{ left: colIdx < 3 ? stickyOffsets[colIdx] : undefined }}
                        >
                          {col.key === "category" ? (
                            <Chip label={row.category === "기타" && row.categoryEtc ? row.categoryEtc : row.category} styleMap={categoryStyles} />
                          ) : col.key === "payType" ? (
                            <Chip label={row.payType} styleMap={payTypeStyles} />
                          ) : col.key === "amount" ? (
                            <span className="font-medium tabular-nums">
                              ₩{row.amount}
                            </span>
                          ) : col.key === "memo" ? (
                            <span className="text-muted-foreground">{row[col.key] || "-"}</span>
                          ) : (
                            row[col.key] || "-"
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

      <FixedCostDialog open={open} onOpenChange={setOpen} onSubmit={handleSubmit} />
    </div>
  )
}
