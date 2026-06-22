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
  paymentDay: "", bankName: "", accountNo: "", memo: "",
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
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

  const setFilter = (k: string, v: string) => setFilters((p) => ({ ...p, [k]: v }))

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
    return rows.filter((row) =>
      columns.every((col) => {
        const term = filters[col.key]?.trim()
        if (!term) return true
        if (col.filterOptions) return String(row[col.key]) === term
        if (col.key === "cost") return String(row.cost).includes(term.replace(/,/g, ""))
        return String(row[col.key] ?? "").toLowerCase().includes(term.toLowerCase())
      }),
    )
  }, [rows, filters])

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
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">통신비</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "불러오는 중..." : `전체 ${rows.length}건 · 현재 ${filteredRows.length}건 표시`}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          통신비 등록
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
                    <tr key={row.id} className="group border-b border-border/50 transition-colors last:border-0 hover:bg-accent/50">
                      {columns.map((col, colIdx) => (
                        <td
                          key={col.key}
                          className={cn(
                            "whitespace-nowrap px-3 py-2.5 text-foreground",
                            colIdx < 3 && "sticky z-10 bg-card group-hover:bg-accent",
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
    </div>
  )
}
