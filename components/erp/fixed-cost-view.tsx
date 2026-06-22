"use client"

import { useEffect, useMemo, useState } from "react"
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
import { ApiError, api } from "@/lib/api"

type FixedCost = {
  id: number
  corporationId: number | null
  category: string
  categoryEtc: string
  item: string
  amount: number
  cycle: string
  payDay: string
  payType: string
  account: string
  memo: string
  registeredAt: string
}

type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

const CATEGORY_OPTIONS = ["임대료", "관리비", "통신비", "인건비", "4대보험비", "기타"]
const CYCLE_OPTIONS = ["매일", "매주", "매월"]
const PAY_TYPE_OPTIONS = ["선불", "후불", "기타"]

const categoryStyles: Record<string, string> = {
  임대료: "bg-sky-100 text-sky-700",
  관리비: "bg-violet-100 text-violet-700",
  통신비: "bg-teal-100 text-teal-700",
  인건비: "bg-orange-100 text-orange-700",
  "4대보험비": "bg-pink-100 text-pink-700",
  기타: "bg-slate-200 text-slate-600",
}

const payTypeStyles: Record<string, string> = {
  선불: "bg-blue-100 text-blue-700",
  후불: "bg-amber-100 text-amber-700",
  기타: "bg-slate-200 text-slate-600",
}

type Column = {
  key: keyof FixedCost
  label: string
  minWidth?: string
  filterOptions?: string[]
}

const columns: Column[] = [
  { key: "category", label: "구분", minWidth: "130px", filterOptions: CATEGORY_OPTIONS },
  { key: "item", label: "비용항목", minWidth: "160px" },
  { key: "amount", label: "금액", minWidth: "130px" },
  { key: "cycle", label: "지급주기", minWidth: "110px", filterOptions: CYCLE_OPTIONS },
  { key: "payDay", label: "지급일", minWidth: "100px" },
  { key: "payType", label: "지급타입", minWidth: "110px", filterOptions: PAY_TYPE_OPTIONS },
  { key: "account", label: "지급계좌", minWidth: "200px" },
  { key: "memo", label: "메모", minWidth: "180px" },
  { key: "registeredAt", label: "등록일", minWidth: "110px" },
]

const stickyOffsets = [0, 130, 290]

function Chip({ label, styleMap }: { label: string; styleMap: Record<string, string> }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", styleMap[label] ?? "bg-muted text-muted-foreground")}>
      {label}
    </span>
  )
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

type FormState = {
  category: string
  categoryEtc: string
  item: string
  amount: string
  cycle: string
  payDay: string
  payType: string
  account: string
  memo: string
}

const emptyForm: FormState = {
  category: "임대료", categoryEtc: "", item: "", amount: "",
  cycle: "매월", payDay: "", payType: "선불", account: "", memo: "",
}

function FixedCostDialog({ open, onOpenChange, onSubmit }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (data: FormState) => Promise<void> | void
}) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }))

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
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>고정 비용 등록</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2">

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

          {form.category === "기타" && (
            <Field id="fc-category-etc" label="기타 구분 입력" value={form.categoryEtc}
              onChange={(v) => set("categoryEtc", v)} placeholder="구분명을 입력하세요" />
          )}

          <Field id="fc-item" label="비용항목" value={form.item}
            onChange={(v) => set("item", v)} placeholder="예: 사무실 임대료" />

          <Field id="fc-amount" label="금액 (원)" value={form.amount}
            onChange={(v) => set("amount", toCommaNumber(v))} placeholder="예: 3,200,000" />

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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fc-paytype" className="text-xs text-muted-foreground">지급 타입</Label>
            <Select value={form.payType} onValueChange={(v) => set("payType", v)}>
              <SelectTrigger id="fc-paytype"><span>{form.payType}</span></SelectTrigger>
              <SelectContent>
                {PAY_TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Field id="fc-account" label="지급 계좌" value={form.account}
            onChange={(v) => set("account", v)} placeholder="예: 국민 123-456-789012" />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fc-memo" className="text-xs text-muted-foreground">메모</Label>
            <Textarea id="fc-memo" value={form.memo} onChange={(e) => set("memo", e.target.value)}
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

export function FixedCostView() {
  const [rows, setRows] = useState<FixedCost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})

  const setFilter = (k: string, v: string) => setFilters((p) => ({ ...p, [k]: v }))

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const page = await api.get<PageResponse<FixedCost>>("/api/fixed-costs?size=200")
      setRows(page.content)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "고정 비용 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      columns.every((col) => {
        const term = filters[col.key]?.trim()
        if (!term) return true
        if (col.filterOptions) return String(row[col.key]) === term
        if (col.key === "amount") {
          return String(row.amount).includes(term.replace(/,/g, ""))
        }
        return String(row[col.key] ?? "").toLowerCase().includes(term.toLowerCase())
      }),
    )
  }, [rows, filters])

  async function handleSubmit(data: FormState) {
    setSubmitError(null)
    try {
      await api.post<FixedCost>("/api/fixed-costs", {
        category: data.category,
        categoryEtc: data.categoryEtc,
        item: data.item,
        amount: Number(data.amount.replace(/,/g, "")) || 0,
        cycle: data.cycle,
        payDay: data.payDay,
        payType: data.payType,
        account: data.account,
        memo: data.memo,
      })
      await refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "고정 비용 등록에 실패했습니다."
      setSubmitError(message)
      throw err
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">고정 비용</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "불러오는 중..." : `전체 ${rows.length}건 · 현재 ${filteredRows.length}건 표시`}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          비용 등록
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      ) : null}
      {submitError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{submitError}</div>
      ) : null}

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
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
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
                              ₩{Math.round(row.amount).toLocaleString("ko-KR")}
                            </span>
                          ) : col.key === "memo" ? (
                            <span className="text-muted-foreground">{row[col.key] || "-"}</span>
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

      <FixedCostDialog open={open} onOpenChange={setOpen} onSubmit={handleSubmit} />
    </div>
  )
}
