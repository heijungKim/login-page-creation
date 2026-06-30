"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { ExcelUploadButton, type ExcelColumn } from "@/components/erp/excel-upload-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn, toCommaNumber } from "@/lib/utils"
import { ApiError, api } from "@/lib/api"

type PaymentEntry = {
  id: number
  businessIncomeId: number
  payDate: string
  revenue: number
  commission: number
  amount: number
  reportType: string
  incomeTax: number
  localTax: number
  memo: string
}

type IncomeEntry = {
  id: number
  corporationId: number | null
  name: string
  regNo: string
  address: string
  phone: string
  account: string
  revenue: number
  commission: number
  memo: string
  reportType: string
  registeredAt: string
  payment: number
  totalIncomeTax: number
  totalLocalTax: number
  actualPayment: number
  payments: PaymentEntry[]
}

type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

const columns = [
  { key: "name", label: "소득자명", minWidth: "120px" },
  { key: "phone", label: "전화번호", minWidth: "130px" },
  { key: "revenue", label: "총 매출액", minWidth: "130px" },
  { key: "payment", label: "지급액", minWidth: "120px" },
  { key: "actualPayment", label: "실 지급액", minWidth: "120px" },
  { key: "reportType", label: "신고 여부", minWidth: "100px" },
  { key: "memo", label: "비고", minWidth: "180px" },
  { key: "registeredAt", label: "등록일", minWidth: "110px" },
] as const

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR") + "원"

const calcTaxes = (reportType: string, amount: number) => {
  if (reportType !== "신고") return { incomeTax: 0, localTax: 0, withholding: 0, actual: amount }
  const incomeTax = Math.floor(amount * 0.03)
  const localTax = Math.floor(amount * 0.003)
  const withholding = incomeTax + localTax
  return { incomeTax, localTax, withholding, actual: Math.max(0, amount - withholding) }
}

type FormData = {
  name: string; regNo: string; address: string; phone: string
  account: string; revenue: string; commission: string; payment: string; memo: string; reportType: string; payDate: string
}

const getTodayDate = () => new Date().toISOString().slice(0, 10)

const emptyForm: FormData = {
  name: "", regNo: "", address: "", phone: "",
  account: "", revenue: "", commission: "", payment: "", memo: "", reportType: "미신고", payDate: getTodayDate(),
}

function MonthPicker({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => value ? parseInt(value.slice(0, 4)) : new Date().getFullYear())
  const ref = useRef<HTMLDivElement>(null)

  const selYear = value ? parseInt(value.slice(0, 4)) : null
  const selMonth = value ? parseInt(value.slice(5, 7)) : null

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  function select(m: number) {
    onChange(`${viewYear}-${String(m).padStart(2, "0")}`)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "h-9 min-w-[130px] rounded-lg border-2 px-4 text-sm font-semibold transition-all text-center shadow-sm",
          open
            ? "border-primary ring-2 ring-primary/20 bg-background text-primary"
            : value
              ? "border-primary bg-primary/5 text-primary hover:bg-primary/10"
              : "border-input bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
        )}
      >
        {value ? `${selYear}년 ${selMonth}월` : placeholder}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-[196px] rounded-xl border border-border bg-popover shadow-lg p-3">
          {/* 연도 네비 */}
          <div className="flex items-center justify-between mb-2.5">
            <button type="button" onClick={() => setViewYear((y) => y - 1)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold">{viewYear}년</span>
            <button type="button" onClick={() => setViewYear((y) => y + 1)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {/* 월 버튼 그리드 */}
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const isSelected = selYear === viewYear && selMonth === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => select(m)}
                  className={cn(
                    "rounded-md py-1.5 text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  {m}월
                </button>
              )
            })}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false) }}
              className="mt-2 w-full rounded-md py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              선택 해제
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ReportBadge({ type }: { type: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
      type === "신고" ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200" : "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200"
    )}>
      {type}
    </span>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "blue" | "red" | "green" }) {
  return (
    <div className={cn(
      "rounded-xl border p-4",
      accent === "blue" && "border-blue-200 bg-blue-50",
      accent === "red" && "border-red-100 bg-red-50",
      accent === "green" && "border-emerald-100 bg-emerald-50",
      !accent && "border-border bg-muted/40",
    )}>
      <p className={cn("text-xs font-medium mb-1", accent === "blue" ? "text-blue-500" : accent === "red" ? "text-red-400" : accent === "green" ? "text-emerald-600" : "text-muted-foreground")}>{label}</p>
      <p className={cn("text-sm font-bold tabular-nums", accent === "blue" ? "text-blue-700" : accent === "red" ? "text-red-700" : accent === "green" ? "text-emerald-700" : "text-foreground")}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function Field({ id, label, value, onChange, placeholder, readOnly, required }: {
  id: string; label: string; value: string
  onChange?: (v: string) => void; placeholder?: string; readOnly?: boolean; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {readOnly ? (
        <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center text-sm text-foreground">
          {value || <span className="text-muted-foreground/50">-</span>}
        </div>
      ) : (
        <Input id={id} value={value} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} className="h-9" />
      )}
    </div>
  )
}

function SelectField({ id, label, value, onChange, options }: {
  id: string; label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function ReadonlyField({ label, value, accent }: { label: string; value: string; accent?: "blue" }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className={cn(
        "h-9 rounded-md border px-3 flex items-center text-sm font-medium",
        accent === "blue" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-input bg-muted/30 text-foreground"
      )}>
        {value || "-"}
      </div>
    </div>
  )
}

function TaxPreviewCards({ reportType, amount }: { reportType: string; amount: number }) {
  if (reportType !== "신고" || amount <= 0) return null
  const taxes = calcTaxes(reportType, amount)
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2.5">
        <p className="text-xs text-orange-500 mb-0.5">소득세 (3%)</p>
        <p className="text-sm font-bold tabular-nums text-orange-700">{fmt(taxes.incomeTax)}</p>
      </div>
      <div className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2.5">
        <p className="text-xs text-orange-500 mb-0.5">지방세 (0.3%)</p>
        <p className="text-sm font-bold tabular-nums text-orange-700">{fmt(taxes.localTax)}</p>
      </div>
      <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5">
        <p className="text-xs text-red-500 mb-0.5">원천징수 합계</p>
        <p className="text-sm font-bold tabular-nums text-red-700">{fmt(taxes.withholding)}</p>
      </div>
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
        <p className="text-xs text-blue-500 mb-0.5">실 입금 금액</p>
        <p className="text-sm font-bold tabular-nums text-blue-700">{fmt(taxes.actual)}</p>
      </div>
    </div>
  )
}

const reportOptions = [{ value: "미신고", label: "미신고" }, { value: "신고", label: "신고" }]

export function BusinessIncomeView() {
  const [rows, setRows] = useState<IncomeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<IncomeEntry | null>(null)
  const [detailForm, setDetailForm] = useState<FormData>(emptyForm)
  const [paymentForm, setPaymentForm] = useState({ payDate: getTodayDate(), revenue: "", reportType: "미신고", memo: "" })
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null)
  const [editingPaymentForm, setEditingPaymentForm] = useState({ payDate: "", revenue: "", reportType: "미신고", memo: "" })
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [paymentFrom, setPaymentFrom] = useState<string>("")
  const [paymentTo, setPaymentTo] = useState<string>("")
  const [paymentPage, setPaymentPage] = useState(0)

  const PAYMENT_PAGE_SIZE = 10
  const [submitting, setSubmitting] = useState(false)

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const setFilter = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v }))
  const setDetailField = (k: keyof FormData, v: string) => setDetailForm((f) => ({ ...f, [k]: v }))
  const setPaymentField = (k: keyof typeof paymentForm, v: string) => setPaymentForm((f) => ({ ...f, [k]: v }))
  const setEditingPaymentField = (k: keyof typeof editingPaymentForm, v: string) => setEditingPaymentForm((f) => ({ ...f, [k]: v }))

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const page = await api.get<PageResponse<IncomeEntry>>("/api/business-incomes?size=200")
      setRows(page.content)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "사업소득 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const filteredRows = useMemo(() =>
    rows
      .filter((row) =>
        columns.every((col) => {
          const term = filters[col.key]?.trim().toLowerCase()
          if (!term) return true
          const val = String(row[col.key as keyof IncomeEntry] ?? "")
          return val.toLowerCase().includes(term)
        })
      )
      .sort((a, b) => (b.registeredAt ?? "").localeCompare(a.registeredAt ?? "")),
    [rows, filters])

  async function refreshDetail(id: number) {
    try {
      const updated = await api.get<IncomeEntry>(`/api/business-incomes/${id}`)
      setDetail(updated)
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)))
      return updated
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "상세를 불러오지 못했습니다.")
      return null
    }
  }

  async function handleSubmit() {
    setSubmitError(null)
    if (!form.name.trim() || !form.regNo.trim()) {
      setSubmitError("소득자명과 주민번호는 필수입니다.")
      return
    }
    const revenue = Number(form.revenue.replace(/,/g, "")) || 0
    const commissionRate = parseFloat(form.commission) || 0
    const payment = Math.floor(revenue * commissionRate / 100)
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(), regNo: form.regNo, address: form.address,
        phone: form.phone, account: form.account, revenue,
        commission: commissionRate, memo: form.memo, reportType: form.reportType,
      }
      if (revenue > 0) {
        body.initialPayment = {
          payDate: form.payDate, revenue, commission: commissionRate,
          amount: payment, reportType: form.reportType, memo: "최초 지급",
        }
      }
      await api.post<IncomeEntry>("/api/business-incomes", body)
      setForm({ ...emptyForm, payDate: getTodayDate() })
      setOpen(false)
      await refresh()
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "등록에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  function openDetailView(row: IncomeEntry) {
    setDetail(row)
    setDetailForm({
      name: row.name, regNo: row.regNo, address: row.address, phone: row.phone,
      account: row.account, revenue: row.revenue.toLocaleString("ko-KR"),
      commission: row.commission.toString(), payment: row.payment.toLocaleString("ko-KR"),
      memo: row.memo, reportType: row.reportType, payDate: getTodayDate(),
    })
    setPaymentForm({ payDate: getTodayDate(), revenue: "", reportType: row.reportType, memo: "" })
    setEditingPaymentId(null)
    setEditMode(false)
    setSubmitError(null)
    setPaymentFrom("")
    setPaymentTo("")
    setPaymentPage(0)
  }

  async function handleSaveDetail() {
    if (!detail) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const revenue = Number(detailForm.revenue.replace(/,/g, "")) || 0
      const commission = parseFloat(detailForm.commission) || 0
      await api.put<IncomeEntry>(`/api/business-incomes/${detail.id}`, {
        name: detailForm.name.trim(), regNo: detailForm.regNo, address: detailForm.address,
        phone: detailForm.phone, account: detailForm.account, revenue, commission,
        memo: detailForm.memo, reportType: detailForm.reportType,
      })
      await refreshDetail(detail.id)
      setEditMode(false)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "수정에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteIncome() {
    if (!detail) return
    if (!confirm(`"${detail.name}" 소득자를 삭제하시겠습니까?\n등록된 지급 내역도 모두 함께 삭제됩니다.`)) return
    setSubmitError(null)
    try {
      await api.delete(`/api/business-incomes/${detail.id}`)
      setDetail(null)
      setEditMode(false)
      await refresh()
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "삭제에 실패했습니다.")
    }
  }

  async function handleAddPaymentEntry() {
    if (!detail) return
    const revenue = Number(paymentForm.revenue.replace(/,/g, ""))
    const amount = Math.floor(revenue * payCommissionRate / 100)
    if (!paymentForm.payDate || !revenue) {
      setSubmitError("지급일과 매출총액은 필수입니다.")
      return
    }
    setSubmitError(null)
    setSubmitting(true)
    try {
      await api.post(`/api/business-incomes/${detail.id}/payments`, {
        payDate: paymentForm.payDate, revenue: payRevenue, commission: payCommissionRate,
        amount, reportType: paymentForm.reportType, memo: paymentForm.memo,
      })
      setPaymentForm({ payDate: getTodayDate(), revenue: "", reportType: detail.reportType, memo: "" })
      await refreshDetail(detail.id)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "지급 내역 추가에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemovePaymentEntry(id: number) {
    if (!detail) return
    if (!confirm("이 지급 내역을 삭제하시겠습니까?")) return
    setSubmitError(null)
    try {
      await api.delete(`/api/business-incomes/${detail.id}/payments/${id}`)
      if (editingPaymentId === id) setEditingPaymentId(null)
      await refreshDetail(detail.id)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "삭제에 실패했습니다.")
    }
  }

  function handleEditPaymentEntry(p: PaymentEntry) {
    setEditingPaymentId(p.id)
    setEditingPaymentForm({ payDate: p.payDate, revenue: p.revenue.toLocaleString("ko-KR"), reportType: p.reportType, memo: p.memo })
  }

  function handleCancelEditPayment() {
    setEditingPaymentId(null)
    setEditingPaymentForm({ payDate: "", revenue: "", reportType: detail?.reportType ?? "미신고", memo: "" })
  }

  async function handleSavePaymentEntry(id: number) {
    if (!detail) return
    const editingItem = detail.payments.find((p) => p.id === id)
    const revenue = Number(editingPaymentForm.revenue.replace(/,/g, ""))
    const amount = Math.floor(revenue * (editingItem?.commission ?? 0) / 100)
    if (!editingPaymentForm.payDate || !revenue) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      await api.put(`/api/business-incomes/${detail.id}/payments/${id}`, {
        payDate: editingPaymentForm.payDate, revenue, amount,
        reportType: editingPaymentForm.reportType, memo: editingPaymentForm.memo,
      })
      setEditingPaymentId(null)
      await refreshDetail(detail.id)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "지급 내역 수정에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPayments = useMemo(() => {
    if (!detail) return []
    return detail.payments.filter((p) => {
      const ym = p.payDate.slice(0, 7)
      if (paymentFrom && ym < paymentFrom) return false
      if (paymentTo && ym > paymentTo) return false
      return true
    })
  }, [detail, paymentFrom, paymentTo])

  const paymentTotalPages = Math.max(1, Math.ceil(filteredPayments.length / PAYMENT_PAGE_SIZE))
  const pagedPayments = filteredPayments.slice(paymentPage * PAYMENT_PAGE_SIZE, (paymentPage + 1) * PAYMENT_PAGE_SIZE)

  const filteredPaymentTotals = useMemo(() => filteredPayments.reduce(
    (acc, p) => ({ payment: acc.payment + p.amount, incomeTax: acc.incomeTax + p.incomeTax, localTax: acc.localTax + p.localTax, actual: acc.actual + (p.amount - p.incomeTax - p.localTax) }),
    { payment: 0, incomeTax: 0, localTax: 0, actual: 0 }
  ), [filteredPayments])

  const formRevenue = Number(form.revenue.replace(/,/g, "")) || 0
  const formCommissionRate = parseFloat(form.commission) || 0
  const formPayment = Math.floor(formRevenue * formCommissionRate / 100)

  const payRevenue = Number(paymentForm.revenue.replace(/,/g, "")) || 0
  const payCommissionRate = editMode ? (parseFloat(detailForm.commission) || 0) : (detail?.commission ?? 0)
  const payAmount = Math.floor(payRevenue * payCommissionRate / 100)

  const stickyOffsets = [0, 120]

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">사업소득</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {loading ? "불러오는 중..." : `전체 ${rows.length}건 · 표시 ${filteredRows.length}건`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExcelUploadButton
            templateName="사업소득"
            columns={[
              { key: "name", label: "소득자명", required: true, example: "홍길동" },
              { key: "regNo", label: "주민번호", required: true, example: "900101-1234567" },
              { key: "phone", label: "전화번호", example: "010-1234-5678" },
              { key: "account", label: "계좌번호", example: "국민은행 123-456-789012" },
              { key: "address", label: "주소", example: "서울시 강남구" },
              { key: "revenue", label: "총매출액", example: "10000000" },
              { key: "commission", label: "수수료율(%)", example: "30" },
              { key: "reportType", label: "신고여부", example: "미신고" },
              { key: "memo", label: "메모", example: "" },
            ] satisfies ExcelColumn[]}
            onRows={async (rows) => {
              let success = 0
              const failed: Array<{ row: number; reason: string }> = []
              for (let i = 0; i < rows.length; i++) {
                const r = rows[i]
                try {
                  await api.post("/api/business-incomes", {
                    name: r.name, regNo: r.regNo, phone: r.phone,
                    account: r.account, address: r.address,
                    revenue: Number(r.revenue.replace(/,/g, "")) || 0,
                    commission: parseFloat(r["수수료율(%)"] || r.commission) || 0,
                    reportType: r.reportType || "미신고",
                    memo: r.memo,
                  })
                  success++
                } catch (e) { failed.push({ row: i + 2, reason: e instanceof ApiError ? e.message : "오류" }) }
              }
              await refresh()
              return { success, failed }
            }}
          />
          <Button onClick={() => { setSubmitError(null); setOpen(true) }} className="gap-2 h-9">
            <Plus className="h-4 w-4" />
            소득 등록
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</div>
      )}

      {/* 목록 테이블 */}
      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20">
                {/* 컬럼 레이블 */}
                <tr className="border-b border-border/60 bg-muted/80 backdrop-blur">
                  {columns.map((col, i) => (
                    <th
                      key={col.key + "-label"}
                      className={cn("px-3 pt-2.5 pb-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground", i < 2 && "sticky z-10 bg-muted/80")}
                      style={{ minWidth: col.minWidth, left: i < 2 ? stickyOffsets[i] : undefined }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
                {/* 필터 행 */}
                <tr className="border-b border-border bg-muted/40 backdrop-blur">
                  {columns.map((col, i) => (
                    <th
                      key={col.key + "-filter"}
                      className={cn("px-2 py-1.5", i < 2 && "sticky z-10 bg-muted/40")}
                      style={{ left: i < 2 ? stickyOffsets[i] : undefined }}
                    >
                      <Input
                        value={filters[col.key] ?? ""}
                        onChange={(e) => setFilter(col.key, e.target.value)}
                        placeholder="검색..."
                        className="h-7 text-xs bg-background/80"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="h-48 text-center text-sm text-muted-foreground">
                      {loading ? "불러오는 중..." : "데이터가 없습니다."}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, rowIdx) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "group cursor-pointer transition-colors hover:bg-blue-50/50",
                        rowIdx % 2 === 1 && "bg-muted/20",
                      )}
                      onClick={() => openDetailView(row)}
                    >
                      {columns.map((col, i) => (
                        <td
                          key={col.key}
                          className={cn(
                            "px-3 py-2.5 text-foreground",
                            i < 2 && "sticky z-10 bg-card group-hover:bg-blue-50/50",
                            rowIdx % 2 === 1 && i < 2 && "bg-muted/20",
                          )}
                          style={{ left: i < 2 ? stickyOffsets[i] : undefined }}
                        >
                          {col.key === "name" && (
                            <span className="font-semibold text-foreground">{row.name}</span>
                          )}
                          {col.key === "revenue" && (
                            <span className="tabular-nums text-foreground">{fmt(row.revenue)}</span>
                          )}
                          {col.key === "payment" && (
                            <span className="tabular-nums text-foreground">{fmt(row.payment)}</span>
                          )}
                          {col.key === "actualPayment" && (
                            <span className="font-bold tabular-nums text-blue-600">{fmt(row.actualPayment)}</span>
                          )}
                          {col.key === "reportType" && <ReportBadge type={row.reportType} />}
                          {col.key === "memo" && (
                            <span className="text-muted-foreground text-xs">{row.memo || "-"}</span>
                          )}
                          {col.key !== "name" && col.key !== "revenue" && col.key !== "payment" && col.key !== "actualPayment" && col.key !== "reportType" && col.key !== "memo" && (
                            <span className="text-muted-foreground">{String(row[col.key as keyof IncomeEntry] ?? "") || "-"}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
              {filteredRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/60">
                    <td colSpan={columns.length} className="px-3 py-2.5 text-right">
                      <span className="text-xs font-medium text-muted-foreground">실 지급액 합계</span>
                      <span className="ml-3 text-sm font-bold tabular-nums text-blue-600">
                        {fmt(filteredRows.reduce((s, r) => s + r.actualPayment, 0))}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 상세 팝업 */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setEditMode(false); setEditingPaymentId(null); setSubmitError(null) } }}>
        <DialogContent className="!w-[78vw] !max-w-[78vw] max-h-[92vh] overflow-x-hidden overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-muted/30">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-lg font-bold">{detail?.name}</DialogTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">{detail?.regNo} · 등록일 {detail?.registeredAt}</p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {detail && <ReportBadge type={detail.reportType} />}
              </div>
            </div>
          </DialogHeader>

          {detail && (
            <div className="flex flex-col gap-5 px-6 py-5">
              {submitError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{submitError}</div>
              )}

              {/* 요약 카드 */}
              <div className="grid grid-cols-4 gap-3">
                <StatCard label="총 매출액" value={fmt(detail.revenue)} />
                <StatCard label="총 지급액" value={fmt(detail.payment)} sub={`수수료 ${detail.commission}%`} />
                <StatCard label="원천징수 합계" value={fmt(detail.totalIncomeTax + detail.totalLocalTax)} accent="red" />
                <StatCard label="실 입금액" value={fmt(detail.actualPayment)} accent="blue" />
              </div>

              {/* 기본 정보 */}
              <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                  <p className="text-sm font-semibold text-foreground">기본 정보</p>
                  <div className="flex gap-2">
                    {editMode ? (
                      <>
                        <Button variant="outline" size="sm" className="h-8" disabled={submitting} onClick={() => openDetailView(detail)}>취소</Button>
                        <Button size="sm" className="h-8" disabled={submitting} onClick={handleSaveDetail}>
                          {submitting ? "저장 중..." : "저장"}
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => setEditMode(true)}>
                        <Pencil className="h-3.5 w-3.5" />수정
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  {editMode ? (
                    <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                      <Field id="detail-name" label="소득자명" required value={detailForm.name} onChange={(v) => setDetailField("name", v)} />
                      <Field id="detail-regno" label="주민번호" required value={detailForm.regNo} onChange={(v) => setDetailField("regNo", v)} />
                      <Field id="detail-phone" label="전화번호" value={detailForm.phone} onChange={(v) => setDetailField("phone", v)} />
                      <Field id="detail-account" label="계좌번호" value={detailForm.account} onChange={(v) => setDetailField("account", v)} />
                      <Field id="detail-address" label="주소" value={detailForm.address} onChange={(v) => setDetailField("address", v)} />
                      <SelectField id="detail-reportType" label="신고 항목" value={detailForm.reportType} onChange={(v) => setDetailField("reportType", v)} options={reportOptions} />
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="detail-commission" className="text-xs font-medium text-muted-foreground">수수료 (%)</Label>
                        <Input id="detail-commission" type="number" step="0.0001" min="0" max="100" value={detailForm.commission} onChange={(e) => setDetailField("commission", e.target.value)} placeholder="0.00" className="h-9" />
                      </div>
                      <Field id="detail-revenue" label="총 매출액" value={detailForm.revenue} onChange={(v) => setDetailField("revenue", toCommaNumber(v))} placeholder="0" />
                      <Field id="detail-memo" label="비고" value={detailForm.memo} onChange={(v) => setDetailField("memo", v)} placeholder="메모" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-x-8 gap-y-3 text-sm">
                      {[
                        { label: "소득자명", value: detail.name },
                        { label: "주민번호", value: detail.regNo },
                        { label: "전화번호", value: detail.phone || "-" },
                        { label: "계좌번호", value: detail.account || "-" },
                        { label: "주소", value: detail.address || "-" },
                        { label: "신고 항목", value: detail.reportType },
                        { label: "수수료율", value: detail.commission + "%" },
                        { label: "총 매출액", value: fmt(detail.revenue) },
                        { label: "비고", value: detail.memo || "-" },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                          <p className="font-medium text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 지급 내역 */}
              <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border/60">
                  {/* 타이틀 */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <p className="text-sm font-semibold text-foreground">
                      지급 내역
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        {(paymentFrom || paymentTo) ? `${filteredPayments.length}건` : `전체 ${detail.payments.length}건`}
                      </span>
                    </p>
                    {(paymentFrom || paymentTo) && (
                      <button
                        onClick={() => { setPaymentFrom(""); setPaymentTo(""); setPaymentPage(0) }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                      >
                        초기화
                      </button>
                    )}
                  </div>
                  {/* 월 범위 검색 - 가운데 강조 */}
                  <div className="flex items-center justify-center gap-3 bg-muted/30 px-4 py-2.5">
                    <MonthPicker value={paymentFrom} onChange={(v) => { setPaymentFrom(v); setPaymentPage(0) }} placeholder="시작월 선택" />
                    <span className="text-sm font-semibold text-muted-foreground">~</span>
                    <MonthPicker value={paymentTo} onChange={(v) => { setPaymentTo(v); setPaymentPage(0) }} placeholder="종료월 선택" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2.5 text-left whitespace-nowrap">일자</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap">매출총액</th>
                        <th className="px-3 py-2.5 text-center whitespace-nowrap">수수료율</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap">지급총액</th>
                        <th className="px-3 py-2.5 text-center whitespace-nowrap">신고</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap">소득세</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap">지방세</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap">원천징수</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap font-bold text-blue-600">실 입금</th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap min-w-[120px]">메모</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {pagedPayments.map((item, idx) => {
                        const withholding = item.incomeTax + item.localTax
                        const actualIncome = item.amount - withholding
                        const isEditing = editingPaymentId === item.id
                        const editRevenue = Number(editingPaymentForm.revenue.replace(/,/g, "")) || 0
                        const editAmount = Math.floor(editRevenue * item.commission / 100)
                        return (
                          <tr key={item.id} className={cn("transition-colors", idx % 2 === 1 && "bg-muted/20", isEditing && "bg-blue-50/60")}>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {isEditing ? (
                                <Input value={editingPaymentForm.payDate} type="date" onChange={(e) => setEditingPaymentField("payDate", e.target.value)} className="h-8 w-36 text-xs" />
                              ) : (
                                <span className="text-foreground">{item.payDate}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                              {isEditing ? (
                                <Input value={editingPaymentForm.revenue} onChange={(e) => setEditingPaymentField("revenue", toCommaNumber(e.target.value))} className="h-8 w-28 text-right text-xs" placeholder="매출총액" />
                              ) : (
                                <span>{item.revenue > 0 ? fmt(item.revenue) : <span className="text-muted-foreground">-</span>}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                                {item.commission}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium whitespace-nowrap">
                              {isEditing
                                ? <span className={cn("text-xs", editRevenue > 0 ? "text-blue-600 font-semibold" : "text-muted-foreground")}>{editRevenue > 0 ? fmt(editAmount) : "-"}</span>
                                : fmt(item.amount)
                              }
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {isEditing ? (
                                <select value={editingPaymentForm.reportType} onChange={(e) => setEditingPaymentField("reportType", e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                                  <option value="미신고">미신고</option>
                                  <option value="신고">신고</option>
                                </select>
                              ) : <ReportBadge type={item.reportType} />}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-orange-600">{item.incomeTax > 0 ? fmt(item.incomeTax) : <span className="text-muted-foreground">-</span>}</td>
                            <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-orange-600">{item.localTax > 0 ? fmt(item.localTax) : <span className="text-muted-foreground">-</span>}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium whitespace-nowrap text-red-600">{withholding > 0 ? fmt(withholding) : <span className="text-muted-foreground">-</span>}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-bold whitespace-nowrap text-blue-600">{fmt(actualIncome)}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {isEditing ? (
                                <Input value={editingPaymentForm.memo} onChange={(e) => setEditingPaymentField("memo", e.target.value)} className="h-8 text-xs" />
                              ) : (item.memo || "-")}
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              {isEditing ? (
                                <div className="flex gap-1 justify-end">
                                  <Button size="sm" className="h-7 px-2.5 text-xs" disabled={submitting} onClick={() => handleSavePaymentEntry(item.id)}>저장</Button>
                                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={handleCancelEditPayment}>취소</Button>
                                </div>
                              ) : (
                                <div className="flex gap-0.5 justify-end">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => handleEditPaymentEntry(item)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemovePaymentEntry(item.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {filteredPayments.length === 0 && (
                        <tr>
                          <td colSpan={11} className="py-10 text-center text-sm text-muted-foreground">
                            {(paymentFrom || paymentTo) ? "해당 기간의 지급 내역이 없습니다." : "등록된 지급 내역이 없습니다."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/40 font-semibold text-sm">
                        <td className="px-3 pt-3 pb-2.5">{(paymentFrom || paymentTo) ? "기간 합계" : "합계"}</td>
                        <td className="px-3 pt-3 pb-2.5 text-center text-muted-foreground">-</td>
                        <td className="px-3 pt-3 pb-2.5 text-center text-muted-foreground">-</td>
                        <td className="px-3 pt-3 pb-2.5 text-right tabular-nums">{fmt(filteredPaymentTotals.payment)}</td>
                        <td className="px-3 pt-3 pb-2.5 text-center text-muted-foreground">-</td>
                        <td className="px-3 pt-3 pb-2.5 text-right tabular-nums text-orange-600">{fmt(filteredPaymentTotals.incomeTax)}</td>
                        <td className="px-3 pt-3 pb-2.5 text-right tabular-nums text-orange-600">{fmt(filteredPaymentTotals.localTax)}</td>
                        <td className="px-3 pt-3 pb-2.5 text-right tabular-nums text-red-600">{fmt(filteredPaymentTotals.incomeTax + filteredPaymentTotals.localTax)}</td>
                        <td className="px-3 pt-3 pb-2.5 text-right tabular-nums text-blue-700 font-bold">{fmt(filteredPaymentTotals.actual)}</td>
                        <td className="px-3 pt-3 pb-2.5 text-xs text-muted-foreground">실 지급액</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* 페이지네이션 */}
                {paymentTotalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border/60 px-4 py-2.5 bg-muted/10">
                    <span className="text-xs text-muted-foreground">
                      {paymentPage + 1} / {paymentTotalPages} 페이지
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={paymentPage === 0}
                        onClick={() => setPaymentPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: paymentTotalPages }, (_, i) => (
                        <Button
                          key={i}
                          variant={i === paymentPage ? "default" : "ghost"}
                          size="sm"
                          className="h-7 w-7 p-0 text-xs"
                          onClick={() => setPaymentPage(i)}
                        >
                          {i + 1}
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={paymentPage === paymentTotalPages - 1}
                        onClick={() => setPaymentPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 지급 내역 추가 */}
                <div className="border-t border-border/60 bg-muted/20 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">지급 내역 추가</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="payment-paydate" className="text-xs font-medium text-muted-foreground">지급 일자</Label>
                      <Input id="payment-paydate" type="date" value={paymentForm.payDate} onChange={(e) => setPaymentField("payDate", e.target.value)} className="h-9" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="payment-revenue" className="text-xs font-medium text-muted-foreground">매출총액</Label>
                      <Input id="payment-revenue" value={paymentForm.revenue} onChange={(e) => setPaymentField("revenue", toCommaNumber(e.target.value))} placeholder="0" className="h-9" />
                    </div>
                    <ReadonlyField label="수수료율" value={payCommissionRate + "%"} />
                    <ReadonlyField label="지급 총액" value={payRevenue > 0 ? fmt(payAmount) : "-"} accent={payRevenue > 0 ? "blue" : undefined} />
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="payment-reportType" className="text-xs font-medium text-muted-foreground">신고 항목</Label>
                      <select
                        id="payment-reportType"
                        value={paymentForm.reportType}
                        onChange={(e) => setPaymentField("reportType", e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="미신고">미신고</option>
                        <option value="신고">신고</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5 justify-end">
                      <Label className="text-xs opacity-0">추가</Label>
                      <Button className="h-9" disabled={submitting} onClick={handleAddPaymentEntry}>추가</Button>
                    </div>
                    <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-6">
                      <Label htmlFor="payment-memo" className="text-xs font-medium text-muted-foreground">메모</Label>
                      <Input id="payment-memo" value={paymentForm.memo} onChange={(e) => setPaymentField("memo", e.target.value)} placeholder="내용 (선택)" className="h-9" />
                    </div>
                  </div>
                  {payRevenue > 0 && <TaxPreviewCards reportType={paymentForm.reportType} amount={payAmount} />}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDeleteIncome}
            >
              <Trash2 className="h-3.5 w-3.5" />
              삭제
            </Button>
            <Button variant="outline" onClick={() => { setDetail(null); setEditMode(false); setEditingPaymentId(null) }}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 소득 등록 다이얼로그 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[58vw] !max-w-[58vw] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-bold">소득자 등록</DialogTitle>
          </DialogHeader>

          {submitError && (
            <div className="mx-6 mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{submitError}</div>
          )}

          <div className="flex flex-col gap-5 px-6 py-5">
            {/* 기본 정보 */}
            <div className="rounded-xl border border-border bg-card">
              <div className="px-4 py-3 border-b border-border/60">
                <p className="text-sm font-semibold text-foreground">기본 정보</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                <Field id="bi-name" label="소득자명" required value={form.name} onChange={(v) => set("name", v)} placeholder="홍길동" />
                <Field id="bi-phone" label="전화번호" value={form.phone} onChange={(v) => set("phone", v)} placeholder="010-0000-0000" />
                <Field id="bi-regno" label="주민번호" required value={form.regNo} onChange={(v) => set("regNo", v)} placeholder="000000-0000000" />
                <Field id="bi-account" label="계좌번호" value={form.account} onChange={(v) => set("account", v)} placeholder="은행명 000-000-000000" />
                <Field id="bi-address" label="주소" value={form.address} onChange={(v) => set("address", v)} placeholder="주소 입력" />
                <SelectField id="bi-reportType" label="신고 항목" value={form.reportType} onChange={(v) => set("reportType", v)} options={reportOptions} />
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bi-commission" className="text-xs font-medium text-muted-foreground">수수료 (%)</Label>
                  <Input id="bi-commission" type="number" step="0.0001" min="0" max="100" value={form.commission} onChange={(e) => set("commission", e.target.value)} placeholder="예: 20" className="h-9" />
                </div>
                <Field id="bi-memo" label="비고" value={form.memo} onChange={(v) => set("memo", v)} placeholder="메모 (선택)" />
              </div>
            </div>

            {/* 최초 지급 */}
            <div className="rounded-xl border border-border bg-card">
              <div className="px-4 py-3 border-b border-border/60">
                <p className="text-sm font-semibold text-foreground">최초 지급 <span className="ml-1.5 text-xs font-normal text-muted-foreground">선택 · 매출총액 입력 시 자동 등록</span></p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bi-paydate" className="text-xs font-medium text-muted-foreground">지급 일자</Label>
                    <Input id="bi-paydate" type="date" value={form.payDate} onChange={(e) => set("payDate", e.target.value)} className="h-9" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bi-revenue" className="text-xs font-medium text-muted-foreground">매출총액</Label>
                    <Input id="bi-revenue" value={form.revenue} onChange={(e) => set("revenue", toCommaNumber(e.target.value))} placeholder="0" className="h-9" />
                  </div>
                  <ReadonlyField label="수수료율" value={formCommissionRate > 0 ? formCommissionRate + "%" : "-"} />
                  <ReadonlyField label="지급 총액" value={formRevenue > 0 && formCommissionRate > 0 ? fmt(formPayment) : "-"} accent={formRevenue > 0 && formCommissionRate > 0 ? "blue" : undefined} />
                </div>
                {formRevenue > 0 && <TaxPreviewCards reportType={form.reportType} amount={formPayment} />}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20">
            <Button variant="outline" disabled={submitting} onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="min-w-[80px]">
              {submitting ? "등록 중..." : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
