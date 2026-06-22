"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
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
  { key: "name", label: "소득자명", minWidth: "110px" },
  { key: "phone", label: "전화번호", minWidth: "130px" },
  { key: "revenue", label: "총 매출액", minWidth: "130px" },
  { key: "payment", label: "지급액", minWidth: "120px" },
  { key: "actualPayment", label: "실 지급액", minWidth: "120px" },
  { key: "reportType", label: "신고 여부", minWidth: "100px" },
  { key: "memo", label: "비고", minWidth: "180px" },
  { key: "registeredAt", label: "등록일", minWidth: "110px" },
] as const

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR") + "원"

const getPaymentTaxes = (reportType: string, amount: number) => {
  if (reportType !== "신고") return { incomeTax: 0, localTax: 0 }
  return { incomeTax: Math.floor(amount * 0.033), localTax: Math.floor(amount * 0.003) }
}

type FormData = {
  name: string; regNo: string; address: string; phone: string
  account: string; revenue: string; payment: string; memo: string; reportType: string; payDate: string
}

const getTodayDate = () => new Date().toISOString().slice(0, 10)

const emptyForm: FormData = {
  name: "", regNo: "", address: "", phone: "",
  account: "", revenue: "", payment: "", memo: "", reportType: "미신고", payDate: getTodayDate(),
}

function Field({ id, label, value, onChange, placeholder }: {
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

export function BusinessIncomeView() {
  const [rows, setRows] = useState<IncomeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<IncomeEntry | null>(null)
  const [detailForm, setDetailForm] = useState<FormData>(emptyForm)
  const [paymentForm, setPaymentForm] = useState({ payDate: "", amount: "", reportType: "미신고", memo: "" })
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null)
  const [editingPaymentForm, setEditingPaymentForm] = useState({ payDate: "", amount: "", reportType: "미신고", memo: "" })
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [filters, setFilters] = useState<Record<string, string>>({})
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

  useEffect(() => {
    void refresh()
  }, [])

  const filteredRows = useMemo(() =>
    rows.filter((row) =>
      columns.every((col) => {
        const term = filters[col.key]?.trim().toLowerCase()
        if (!term) return true
        const val = String(row[col.key as keyof IncomeEntry] ?? "")
        return val.toLowerCase().includes(term)
      })
    ), [rows, filters])

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
    const payment = Number(form.payment.replace(/,/g, "")) || 0
    setSubmitting(true)
    try {
      const body: any = {
        name: form.name.trim(),
        regNo: form.regNo,
        address: form.address,
        phone: form.phone,
        account: form.account,
        revenue,
        memo: form.memo,
        reportType: form.reportType,
      }
      if (payment > 0) {
        body.initialPayment = {
          payDate: form.payDate,
          amount: payment,
          reportType: form.reportType,
          memo: "최초 지급",
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
      account: row.account,
      revenue: row.revenue.toLocaleString("ko-KR"),
      payment: row.payment.toLocaleString("ko-KR"),
      memo: row.memo, reportType: row.reportType,
      payDate: getTodayDate(),
    })
    setPaymentForm({ payDate: getTodayDate(), amount: "", reportType: row.reportType, memo: "" })
    setEditingPaymentId(null)
    setEditMode(false)
    setSubmitError(null)
  }

  async function handleSaveDetail() {
    if (!detail) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const revenue = Number(detailForm.revenue.replace(/,/g, "")) || 0
      await api.put<IncomeEntry>(`/api/business-incomes/${detail.id}`, {
        name: detailForm.name.trim(),
        regNo: detailForm.regNo,
        address: detailForm.address,
        phone: detailForm.phone,
        account: detailForm.account,
        revenue,
        memo: detailForm.memo,
        reportType: detailForm.reportType,
      })
      await refreshDetail(detail.id)
      setEditMode(false)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "수정에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddPaymentEntry() {
    if (!detail) return
    const amount = Number(paymentForm.amount.replace(/,/g, ""))
    if (!paymentForm.payDate || !amount) {
      setSubmitError("지급일과 금액은 필수입니다.")
      return
    }
    setSubmitError(null)
    setSubmitting(true)
    try {
      await api.post(`/api/business-incomes/${detail.id}/payments`, {
        payDate: paymentForm.payDate,
        amount,
        reportType: paymentForm.reportType,
        memo: paymentForm.memo,
      })
      setPaymentForm({ payDate: getTodayDate(), amount: "", reportType: detail.reportType, memo: "" })
      await refreshDetail(detail.id)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "지급 내역 추가에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemovePaymentEntry(id: number) {
    if (!detail) return
    if (!confirm("삭제하시겠습니까?")) return
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
    setEditingPaymentForm({
      payDate: p.payDate,
      amount: p.amount.toLocaleString("ko-KR"),
      reportType: p.reportType,
      memo: p.memo,
    })
  }

  function handleCancelEditPayment() {
    setEditingPaymentId(null)
    setEditingPaymentForm({ payDate: "", amount: "", reportType: detail?.reportType ?? "미신고", memo: "" })
  }

  async function handleSavePaymentEntry(id: number) {
    if (!detail) return
    const amount = Number(editingPaymentForm.amount.replace(/,/g, ""))
    if (!editingPaymentForm.payDate || !amount) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      await api.put(`/api/business-incomes/${detail.id}/payments/${id}`, {
        payDate: editingPaymentForm.payDate,
        amount,
        reportType: editingPaymentForm.reportType,
        memo: editingPaymentForm.memo,
      })
      setEditingPaymentId(null)
      await refreshDetail(detail.id)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "지급 내역 수정에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  const paymentPreviewTaxes = getPaymentTaxes(
    paymentForm.reportType,
    Number(paymentForm.amount.replace(/,/g, "")) || 0,
  )

  const formPreviewTaxes = getPaymentTaxes(
    form.reportType,
    Number(form.payment.replace(/,/g, "")) || 0,
  )

  const stickyOffsets = [0, 110]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">사업소득</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "불러오는 중..." : `전체 ${rows.length}건 · 현재 ${filteredRows.length}건 표시`}
          </p>
        </div>
        <Button onClick={() => { setSubmitError(null); setOpen(true) }} className="gap-1.5">
          <Plus className="h-4 w-4" />
          소득 등록
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
                      <Input
                        value={filters[col.key] ?? ""}
                        onChange={(e) => setFilter(col.key, e.target.value)}
                        placeholder={col.label}
                        className="h-8 bg-background text-xs font-normal"
                        aria-label={`${col.label} 필터`}
                      />
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
                      onClick={() => openDetailView(row)}
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
                          {col.key === "name" && <span className="font-medium">{row.name}</span>}
                          {col.key === "revenue" && <span className="tabular-nums">{fmt(row.revenue)}</span>}
                          {col.key === "payment" && <span className="tabular-nums">{fmt(row.payment)}</span>}
                          {col.key === "actualPayment" && <span className="font-semibold tabular-nums text-blue-600">{fmt(row.actualPayment)}</span>}
                          {col.key === "reportType" && <span className="font-medium">{row.reportType}</span>}
                          {col.key === "memo" && <span className="text-muted-foreground">{row.memo || "-"}</span>}
                          {col.key !== "name" && col.key !== "revenue" && col.key !== "payment" && col.key !== "actualPayment" && col.key !== "reportType" && col.key !== "memo" && (String(row[col.key as keyof IncomeEntry] ?? "") || "-")}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
              {filteredRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/50">
                    <td colSpan={columns.length} className="px-3 py-2.5 text-right">
                      <span className="text-sm text-muted-foreground">실 지급액 총합계</span>
                      <span className="ml-3 text-sm font-semibold tabular-nums text-blue-600">
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

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setEditMode(false); setEditingPaymentId(null); setSubmitError(null) } }}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>소득자 상세 정보</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="flex flex-col gap-5 py-2">
              {submitError ? <p className="text-xs text-destructive">{submitError}</p> : null}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
                  <div className="flex gap-2">
                    {editMode ? (
                      <>
                        <Button variant="outline" size="sm" className="h-8 px-3" disabled={submitting} onClick={() => { openDetailView(detail) }}>취소</Button>
                        <Button size="sm" className="h-8 px-3" disabled={submitting} onClick={handleSaveDetail}>{submitting ? "저장 중..." : "저장"}</Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => setEditMode(true)}>수정</Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                  {editMode ? (
                    <>
                      <Field id="detail-name" label="소득자명" value={detailForm.name} onChange={(v) => setDetailField("name", v)} />
                      <Field id="detail-regno" label="주민번호" value={detailForm.regNo} onChange={(v) => setDetailField("regNo", v)} />
                      <Field id="detail-phone" label="전화번호" value={detailForm.phone} onChange={(v) => setDetailField("phone", v)} />
                      <Field id="detail-account" label="계좌번호" value={detailForm.account} onChange={(v) => setDetailField("account", v)} />
                      <Field id="detail-address" label="주소" value={detailForm.address} onChange={(v) => setDetailField("address", v)} />
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="detail-reportType" className="text-xs text-muted-foreground">신고 항목</Label>
                        <select
                          id="detail-reportType"
                          value={detailForm.reportType}
                          onChange={(e) => setDetailField("reportType", e.target.value)}
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                        >
                          <option value="미신고">미신고</option>
                          <option value="신고">신고</option>
                        </select>
                      </div>
                      <Field id="detail-memo" label="비고" value={detailForm.memo} onChange={(v) => setDetailField("memo", v)} />
                      <Field id="detail-revenue" label="총 매출액" value={detailForm.revenue} onChange={(v) => setDetailField("revenue", toCommaNumber(v))} />
                    </>
                  ) : (
                    [
                      { label: "소득자명", value: detail.name },
                      { label: "주민번호", value: detail.regNo },
                      { label: "전화번호", value: detail.phone },
                      { label: "계좌번호", value: detail.account },
                      { label: "주소", value: detail.address },
                      { label: "등록일", value: detail.registeredAt },
                      { label: "신고 항목", value: detail.reportType },
                      { label: "총 매출액", value: fmt(detail.revenue) },
                      { label: "비고", value: detail.memo || "-" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex gap-2">
                        <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
                        <span className="font-medium text-foreground">{value}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">지급 내역</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 font-medium">일자</th>
                        <th className="pb-2 text-right font-medium">금액</th>
                        <th className="pb-2 text-center font-medium">신고 항목</th>
                        <th className="pb-2 text-right font-medium">소득세</th>
                        <th className="pb-2 text-right font-medium">지방세</th>
                        <th className="pb-2 text-center font-medium min-w-[180px]">메모</th>
                        <th className="pb-2 text-right font-medium">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {detail.payments.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 text-foreground">
                            {editingPaymentId === item.id ? (
                              <Input value={editingPaymentForm.payDate} type="date" onChange={(e) => setEditingPaymentField("payDate", e.target.value)} />
                            ) : item.payDate}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {editingPaymentId === item.id ? (
                              <Input value={editingPaymentForm.amount} onChange={(e) => setEditingPaymentField("amount", toCommaNumber(e.target.value))} />
                            ) : fmt(item.amount)}
                          </td>
                          <td className="py-2 text-center text-foreground">
                            {editingPaymentId === item.id ? (
                              <select value={editingPaymentForm.reportType} onChange={(e) => setEditingPaymentField("reportType", e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                                <option value="미신고">미신고</option>
                                <option value="신고">신고</option>
                              </select>
                            ) : item.reportType}
                          </td>
                          <td className="py-2 text-right tabular-nums">{fmt(item.incomeTax)}</td>
                          <td className="py-2 text-right tabular-nums">{fmt(item.localTax)}</td>
                          <td className="py-2 text-center text-foreground whitespace-normal">
                            {editingPaymentId === item.id ? (
                              <Input value={editingPaymentForm.memo} onChange={(e) => setEditingPaymentField("memo", e.target.value)} />
                            ) : item.memo || "-"}
                          </td>
                          <td className="py-2 text-right space-x-1">
                            {editingPaymentId === item.id ? (
                              <>
                                <Button size="sm" className="h-7 px-2" disabled={submitting} onClick={() => handleSavePaymentEntry(item.id)}>저장</Button>
                                <Button variant="outline" size="sm" className="h-7 px-2" onClick={handleCancelEditPayment}>취소</Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleEditPaymentEntry(item)}>수정</Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleRemovePaymentEntry(item.id)}>삭제</Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      {detail.payments.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-muted-foreground">등록된 지급 내역이 없습니다.</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border text-sm text-foreground">
                        <td className="pt-3 font-semibold">총합계</td>
                        <td className="pt-3 text-right tabular-nums font-semibold text-blue-600">{fmt(detail.payment)}</td>
                        <td className="pt-3 text-center font-semibold">-</td>
                        <td className="pt-3 text-right tabular-nums font-semibold text-blue-600">{fmt(detail.totalIncomeTax)}</td>
                        <td className="pt-3 text-right tabular-nums font-semibold text-blue-600">{fmt(detail.totalLocalTax)}</td>
                        <td className="pt-3 text-center font-semibold">실 지급액 {fmt(detail.actualPayment)}</td>
                        <td className="pt-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-4 rounded-lg border border-border bg-background p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">지급 내역 추가</p>
                  <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-5">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="payment-paydate" className="text-xs text-muted-foreground">일자</Label>
                      <Input id="payment-paydate" type="date" value={paymentForm.payDate} onChange={(e) => setPaymentField("payDate", e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="payment-amount" className="text-xs text-muted-foreground">금액</Label>
                      <Input id="payment-amount" value={paymentForm.amount} onChange={(e) => setPaymentField("amount", toCommaNumber(e.target.value))} placeholder="0" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="payment-reportType" className="text-xs text-muted-foreground">신고 항목</Label>
                      <select
                        id="payment-reportType"
                        value={paymentForm.reportType}
                        onChange={(e) => setPaymentField("reportType", e.target.value)}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                      >
                        <option value="미신고">미신고</option>
                        <option value="신고">신고</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="payment-memo" className="text-xs text-muted-foreground">메모</Label>
                      <Input id="payment-memo" value={paymentForm.memo} onChange={(e) => setPaymentField("memo", e.target.value)} placeholder="내용" />
                    </div>
                    <div className="flex flex-col gap-1.5 justify-end col-span-2 sm:col-span-1">
                      <Button className="h-10" disabled={submitting} onClick={handleAddPaymentEntry}>추가</Button>
                    </div>
                  </div>
                  {paymentForm.reportType === "신고" && Number(paymentForm.amount.replace(/,/g, "")) > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
                        <span>소득세</span>
                        <span className="font-medium text-foreground">{fmt(paymentPreviewTaxes.incomeTax)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
                        <span>지방세</span>
                        <span className="font-medium text-foreground">{fmt(paymentPreviewTaxes.localTax)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
                        <span>실 지급액</span>
                        <span className="font-medium text-blue-600">{fmt(Number(paymentForm.amount.replace(/,/g, "")) - paymentPreviewTaxes.incomeTax - paymentPreviewTaxes.localTax)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDetail(null); setEditMode(false); setEditingPaymentId(null) }}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>소득 등록</DialogTitle>
          </DialogHeader>
          {submitError && <p className="text-xs text-destructive">{submitError}</p>}
          <div className="flex flex-col gap-5 py-2">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <Field id="bi-name" label="소득자명 *" value={form.name} onChange={(v) => set("name", v)} placeholder="홍길동" />
                <Field id="bi-phone" label="전화번호" value={form.phone} onChange={(v) => set("phone", v)} placeholder="010-0000-0000" />
                <Field id="bi-regno" label="주민번호 *" value={form.regNo} onChange={(v) => set("regNo", v)} placeholder="000000-0000000" />
                <Field id="bi-account" label="계좌번호" value={form.account} onChange={(v) => set("account", v)} placeholder="은행명 000-000-000000" />
                <Field id="bi-address" label="주소" value={form.address} onChange={(v) => set("address", v)} placeholder="시/도 구/군 읍/면/동" />
                <Field id="bi-revenue" label="총 매출액 (원)" value={form.revenue} onChange={(v) => set("revenue", toCommaNumber(v))} placeholder="0" />
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bi-reportType" className="text-xs text-muted-foreground">신고 항목</Label>
                  <select
                    id="bi-reportType"
                    value={form.reportType}
                    onChange={(e) => set("reportType", e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="미신고">미신고</option>
                    <option value="신고">신고</option>
                  </select>
                </div>
                <Field id="bi-memo" label="비고" value={form.memo} onChange={(v) => set("memo", v)} placeholder="메모 입력" />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">최초 지급 (선택)</p>
              <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bi-paydate" className="text-xs text-muted-foreground">지급 일자</Label>
                  <Input id="bi-paydate" type="date" value={form.payDate} onChange={(e) => set("payDate", e.target.value)} />
                </div>
                <Field id="bi-payment" label="지급액 (원)" value={form.payment} onChange={(v) => set("payment", toCommaNumber(v))} placeholder="0" />
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bi-payment-reportType" className="text-xs text-muted-foreground">신고 항목</Label>
                  <div className="h-10 rounded-md border border-input bg-muted/20 px-3 flex items-center text-sm text-muted-foreground">
                    {form.reportType}
                  </div>
                </div>
              </div>
              {form.reportType === "신고" && Number(form.payment.replace(/,/g, "")) > 0 && (
                <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
                    <span className="text-muted-foreground">소득세</span>
                    <span className="font-medium text-foreground">{fmt(formPreviewTaxes.incomeTax)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
                    <span className="text-muted-foreground">지방세</span>
                    <span className="font-medium text-foreground">{fmt(formPreviewTaxes.localTax)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
                    <span className="text-muted-foreground">실 지급액</span>
                    <span className="font-medium text-foreground text-blue-600">{fmt((Number(form.payment.replace(/,/g, "")) || 0) - formPreviewTaxes.incomeTax - formPreviewTaxes.localTax)}</span>
                  </div>
                </div>
              )}
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
