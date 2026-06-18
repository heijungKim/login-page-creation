"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn, toCommaNumber } from "@/lib/utils"

type PaymentEntry = {
  id: string
  payDate: string
  amount: number
  reportType: string
  incomeTax: number
  localTax: number
  memo: string
}

type IncomeEntry = {
  name: string       // 소득자명
  regNo: string      // 주민번호
  address: string    // 주소
  phone: string      // 전화번호
  account: string    // 계좌번호
  revenue: number    // 총 매출액
  payment: number    // 지급액
  actualPayment: number // 실 지급액
  memo: string       // 비고
  reportType: string // 신고 항목
  registeredAt: string
  paymentDetails: PaymentEntry[]
}

const columns = [
  { key: "name",          label: "소득자명",  minWidth: "110px" },
  { key: "phone",         label: "전화번호",  minWidth: "130px" },
  { key: "revenue",       label: "총 매출액", minWidth: "130px" },
  { key: "payment",       label: "지급액",    minWidth: "120px" },
  { key: "actualPayment", label: "실 지급액", minWidth: "120px" },
  { key: "reportType",    label: "신고 여부", minWidth: "100px" },
  { key: "memo",          label: "비고",      minWidth: "180px" },
  { key: "registeredAt",  label: "등록일",    minWidth: "110px" },
]

const fmt = (n: number) =>
  n.toLocaleString("ko-KR") + "원"

const getActualPayment = (payment: number, reportType: string) => {
  if (reportType !== "신고") return payment
  const incomeTax = Math.floor(payment * 0.033)
  const localTax = Math.floor(payment * 0.003)
  return payment - incomeTax - localTax
}

const getPaymentTaxes = (reportType: string, amount: number) => {
  if (reportType !== "신고") return { incomeTax: 0, localTax: 0 }
  return { incomeTax: Math.floor(amount * 0.033), localTax: Math.floor(amount * 0.003) }
}

const randomReportType = () =>
  Math.random() < 0.5 ? "미신고" : "신고"

const initialRows: IncomeEntry[] = [
  {
    name: "김철수",
    regNo: "800101-1234567",
    address: "서울 강남구 테헤란로 123",
    phone: "010-1234-5678",
    account: "국민 123-456-789012",
    revenue: 12000000,
    payment: 10800000,
    reportType: randomReportType(),
    actualPayment: 0,
    memo: "3.3% 원천징수",
    registeredAt: "2024-01-10",
    paymentDetails: [],
  },
  {
    name: "이영희",
    regNo: "850515-2345678",
    address: "서울 서초구 반포대로 55",
    phone: "010-2345-6789",
    account: "신한 110-234-567890",
    revenue: 8500000,
    payment: 7650000,
    reportType: randomReportType(),
    actualPayment: 0,
    memo: "",
    registeredAt: "2024-01-15",
    paymentDetails: [],
  },
  {
    name: "박민준",
    regNo: "900320-1456789",
    address: "경기 성남시 분당구 정자로 10",
    phone: "010-3456-7890",
    account: "우리 1002-345-678901",
    revenue: 15000000,
    payment: 13500000,
    reportType: randomReportType(),
    actualPayment: 0,
    memo: "분기 정산",
    registeredAt: "2024-02-05",
    paymentDetails: [],
  },
  {
    name: "최지수",
    regNo: "921210-2567890",
    address: "부산 해운대구 센텀로 30",
    phone: "010-4567-8901",
    account: "하나 123-456789-01011",
    revenue: 6200000,
    payment: 5580000,
    reportType: randomReportType(),
    actualPayment: 0,
    memo: "2월분",
    registeredAt: "2024-02-18",
    paymentDetails: [],
  },
  {
    name: "정태양",
    regNo: "880730-1678901",
    address: "인천 남동구 논현로 88",
    phone: "010-5678-9012",
    account: "기업 123-456-7890123",
    revenue: 20000000,
    payment: 18000000,
    reportType: randomReportType(),
    actualPayment: 0,
    memo: "연간 계약 소득",
    registeredAt: "2024-03-01",
    paymentDetails: [],
  },
  {
    name: "한소희",
    regNo: "950408-2789012",
    address: "대전 유성구 대학로 99",
    phone: "010-6789-0123",
    account: "농협 606-8100-77234",
    revenue: 4800000,
    payment: 4320000,
    reportType: randomReportType(),
    actualPayment: 0,
    memo: "",
    registeredAt: "2024-03-20",
    paymentDetails: [],
  },
].map((row) => ({
  ...row,
  actualPayment: getActualPayment(row.payment, row.reportType),
}))

type FormData = {
  name: string; regNo: string; address: string; phone: string
  account: string; revenue: string; payment: string; actualPayment: string; memo: string; reportType: string; payDate: string
}
const getTodayDate = () => new Date().toISOString().slice(0, 10)
const emptyForm: FormData = {
  name: "", regNo: "", address: "", phone: "",
  account: "", revenue: "", payment: "", actualPayment: "", memo: "", reportType: "미신고", payDate: getTodayDate(),
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
  const [rows, setRows] = useState<IncomeEntry[]>(initialRows)
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<IncomeEntry | null>(null)
  const [detailForm, setDetailForm] = useState<FormData>(emptyForm)
  const [paymentRows, setPaymentRows] = useState<PaymentEntry[]>([])
  const [paymentForm, setPaymentForm] = useState({ payDate: "", amount: "", reportType: "미신고", memo: "" })
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [editingPaymentForm, setEditingPaymentForm] = useState({ payDate: "", amount: "", reportType: "미신고", memo: "" })
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [error, setError] = useState("")

  const set = (k: keyof FormData, v: string) => {
    if (k === "payDate" && !v) {
      setForm((f) => ({ ...f, [k]: getTodayDate() }))
    } else {
      setForm((f) => ({ ...f, [k]: v }))
    }
  }
  const setFilter = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v }))
  const setDetailField = (k: keyof FormData, v: string) => setDetailForm((f) => ({ ...f, [k]: v }))
  const setPaymentField = (k: keyof typeof paymentForm, v: string) => setPaymentForm((f) => ({ ...f, [k]: v }))
  const setEditingPaymentField = (k: keyof typeof editingPaymentForm, v: string) => setEditingPaymentForm((f) => ({ ...f, [k]: v }))

  const filteredRows = useMemo(() =>
    rows.filter((row) =>
      columns.every((col) => {
        const term = filters[col.key]?.trim().toLowerCase()
        if (!term) return true
        const val = String((row as any)[col.key] ?? "")
        return val.toLowerCase().includes(term)
      })
    ), [rows, filters])

  function handleSubmit() {
    if (!form.name.trim()) { setError("소득자명은 필수입니다."); return }
    const revenue = Number(form.revenue.replace(/,/g, "")) || 0
    const payment = Number(form.payment.replace(/,/g, "")) || 0
    const actualPayment = getActualPayment(payment, form.reportType)
    const today = new Date().toISOString().slice(0, 10)
    setRows((prev) => [...prev, {
      name: form.name.trim(), regNo: form.regNo, address: form.address,
      phone: form.phone, account: form.account,
      revenue, payment, actualPayment, memo: form.memo, reportType: form.reportType, registeredAt: today,
      paymentDetails: [],
    }])
    setForm(emptyForm)
    setError("")
    setOpen(false)
  }

  function openDetailView(row: IncomeEntry) {
    setDetail(row)
    setDetailForm({
      name: row.name,
      regNo: row.regNo,
      address: row.address,
      phone: row.phone,
      account: row.account,
      revenue: row.revenue.toLocaleString("ko-KR"),
      payment: row.payment.toLocaleString("ko-KR"),
      actualPayment: row.actualPayment.toLocaleString("ko-KR"),
      memo: row.memo,
      reportType: row.reportType,
    })
    setPaymentRows(row.paymentDetails.length > 0 ? row.paymentDetails : [{
      id: `${row.name}-${row.registeredAt}-default`,
      payDate: row.registeredAt,
      amount: row.payment,
      reportType: row.reportType,
      ...getPaymentTaxes(row.reportType, row.payment),
      memo: "기본 지급",
    }])
    setPaymentForm({ payDate: row.registeredAt, amount: "", reportType: row.reportType, memo: "" })
    setEditingPaymentId(null)
    setEditingPaymentForm({ payDate: "", amount: "", reportType: row.reportType, memo: "" })
    setEditMode(false)
  }

  function handleSaveDetail() {
    if (!detail) return
    const revenue = Number(detailForm.revenue.replace(/,/g, "")) || 0
    const paymentTotal = paymentRows.reduce((sum, item) => sum + item.amount, 0)
    const totalIncomeTax = paymentRows.reduce((sum, item) =>
      sum + (item.reportType === "원천세(3.3%)" ? Math.floor(item.amount * 0.033) : 0), 0)
    const totalLocalTax = paymentRows.reduce((sum, item) =>
      sum + (item.reportType === "원천세(3.3%)" ? Math.floor(item.amount * 0.003) : 0), 0)
    const actualPayment = paymentTotal - totalIncomeTax - totalLocalTax

    setRows((prev) => prev.map((row) => row === detail ? {
      ...row,
      name: detailForm.name.trim(),
      regNo: detailForm.regNo,
      address: detailForm.address,
      phone: detailForm.phone,
      account: detailForm.account,
      revenue,
      payment: paymentTotal,
      actualPayment,
      memo: detailForm.memo,
      reportType: detailForm.reportType,
      paymentDetails: paymentRows,
    } : row))

    const updatedDetail = {
      ...detail,
      name: detailForm.name.trim(),
      regNo: detailForm.regNo,
      address: detailForm.address,
      phone: detailForm.phone,
      account: detailForm.account,
      revenue,
      payment: paymentTotal,
      actualPayment,
      memo: detailForm.memo,
      reportType: detailForm.reportType,
      paymentDetails: paymentRows,
    }
    setDetail(updatedDetail)
    setEditMode(false)
  }

  function handleAddPaymentEntry() {
    const amount = Number(paymentForm.amount.replace(/,/g, ""))
    if (!paymentForm.payDate || !amount) { return }

    const taxes = getPaymentTaxes(paymentForm.reportType, amount)
    setPaymentRows((prev) => [
      ...prev,
      {
        id: `${paymentForm.payDate}-${amount}-${prev.length}`,
        payDate: paymentForm.payDate,
        amount,
        reportType: paymentForm.reportType,
        incomeTax: taxes.incomeTax,
        localTax: taxes.localTax,
        memo: paymentForm.memo,
      },
    ])
    setPaymentForm({ payDate: detail?.registeredAt ?? "", amount: "", reportType: detail?.reportType ?? "미신고", memo: "" })
  }

  function resetDetailState(row: IncomeEntry) {
    setDetailForm({
      name: row.name,
      regNo: row.regNo,
      address: row.address,
      phone: row.phone,
      account: row.account,
      revenue: row.revenue.toLocaleString("ko-KR"),
      payment: row.payment.toLocaleString("ko-KR"),
      actualPayment: row.actualPayment.toLocaleString("ko-KR"),
      memo: row.memo,
      reportType: row.reportType,
    })
    setPaymentRows(row.paymentDetails.length > 0 ? row.paymentDetails : [{
      id: `${row.name}-${row.registeredAt}-default`,
      payDate: row.registeredAt,
      amount: row.payment,
      reportType: row.reportType,
      ...getPaymentTaxes(row.reportType, row.payment),
      memo: "기본 지급",
    }])
    setPaymentForm({ payDate: row.registeredAt, amount: "", reportType: row.reportType, memo: "" })
    setEditingPaymentId(null)
    setEditingPaymentForm({ payDate: "", amount: "", reportType: row.reportType, memo: "" })
    setEditMode(false)
  }

  function handleRemovePaymentEntry(id: string) {
    setPaymentRows((prev) => prev.filter((item) => item.id !== id))
    if (editingPaymentId === id) setEditingPaymentId(null)
  }

  function handleEditPaymentEntry(id: string) {
    const target = paymentRows.find((item) => item.id === id)
    if (!target) return
    setEditingPaymentId(id)
    setEditingPaymentForm({
      payDate: target.payDate,
      amount: target.amount.toLocaleString("ko-KR"),
      reportType: target.reportType,
      memo: target.memo,
    })
  }

  function handleCancelEditPayment() {
    setEditingPaymentId(null)
    setEditingPaymentForm({ payDate: "", amount: "", reportType: detail?.reportType ?? "미신고", memo: "" })
  }

  function handleSavePaymentEntry(id: string) {
    const amount = Number(editingPaymentForm.amount.replace(/,/g, ""))
    if (!editingPaymentForm.payDate || !amount) { return }
    const taxes = getPaymentTaxes(editingPaymentForm.reportType, amount)
    setPaymentRows((prev) => prev.map((item) => item.id === id ? {
      ...item,
      payDate: editingPaymentForm.payDate,
      amount,
      reportType: editingPaymentForm.reportType,
      incomeTax: taxes.incomeTax,
      localTax: taxes.localTax,
      memo: editingPaymentForm.memo,
    } : item))
    setEditingPaymentId(null)
  }

  const paymentPreviewTaxes = getPaymentTaxes(
    paymentForm.reportType,
    Number(paymentForm.amount.replace(/,/g, "")) || 0,
  )

  // 좌측 고정 열 offset (소득자명 110px, 전화번호 130px)
  const stickyOffsets = [0, 110]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">사업소득</h2>
          <p className="text-sm text-muted-foreground">
            전체 {rows.length}건 · 현재 {filteredRows.length}건 표시
          </p>
        </div>
        <Button onClick={() => { setError(""); setOpen(true) }} className="gap-1.5">
          <Plus className="h-4 w-4" />
          소득 등록
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
                  filteredRows.map((row, idx) => (
                    <tr
                      key={idx}
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
                          {col.key === "regNo" && <span className="tabular-nums text-muted-foreground">{row.regNo}</span>}
                          {col.key === "memo" && <span className="text-muted-foreground">{row.memo}</span>}
                          {col.key !== "name" && col.key !== "revenue" && col.key !== "payment" && col.key !== "actualPayment" && col.key !== "reportType" && col.key !== "regNo" && col.key !== "memo" && (row as any)[col.key]}
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

      {/* 상세 다이얼로그 */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>소득자 상세 정보</DialogTitle>
          </DialogHeader>
          {detail && (() => {
            const incomeTax      = Math.floor(detail.payment * 0.03)
            const localTax       = Math.floor(detail.payment * 0.003)
            const totalDeduction = incomeTax + localTax
            const netPayment     = detail.payment - totalDeduction

            return (
              <div className="flex flex-col gap-5 py-2">
                {/* 기본 정보 */}
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
                    <div className="flex gap-2">
                      {editMode ? (
                        <>
                          <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => resetDetailState(detail!)}>취소</Button>
                          <Button size="sm" className="h-8 px-3" onClick={handleSaveDetail}>저장</Button>
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
                        <Field id="detail-revenue" label="총 매출액" value={detailForm.revenue} onChange={(v) => setDetailField("revenue", toCommaNumber(v))} />
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
                      </>
                    ) : (
                      [
                        { label: "소득자명",  value: detail.name },
                        { label: "주민번호",  value: detail.regNo },
                        { label: "전화번호",  value: detail.phone },
                        { label: "계좌번호",  value: detail.account },
                        { label: "주소",      value: detail.address },
                        { label: "등록일",    value: detail.registeredAt },
                        { label: "총 매출액", value: fmt(detail.revenue) },
                        { label: "신고 항목", value: detail.reportType },
                        { label: "비고",      value: detail.memo || "-" },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex gap-2">
                          <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
                          <span className="font-medium text-foreground">{value}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 지급 내역 */}
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
                          {editMode && <th className="pb-2 text-right font-medium">삭제</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {paymentRows.map((item) => {
                          return (
                            <tr key={item.id}>
                              <td className="py-2 text-foreground">
                                {editMode && editingPaymentId === item.id ? (
                                  <Input
                                    value={editingPaymentForm.payDate}
                                    type="date"
                                    onChange={(e) => setEditingPaymentField("payDate", e.target.value)}
                                  />
                                ) : item.payDate}
                              </td>
                              <td className="py-2 text-right tabular-nums">
                                {editMode && editingPaymentId === item.id ? (
                                  <Input
                                    value={editingPaymentForm.amount}
                                    onChange={(e) => setEditingPaymentField("amount", toCommaNumber(e.target.value))}
                                  />
                                ) : fmt(item.amount)}
                              </td>
                              <td className="py-2 text-center text-foreground">
                                {editMode && editingPaymentId === item.id ? (
                                  <select
                                    value={editingPaymentForm.reportType}
                                    onChange={(e) => setEditingPaymentField("reportType", e.target.value)}
                                    className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                  >
                                    <option value="미신고">미신고</option>
                                    <option value="신고">신고</option>
                                  </select>
                                ) : item.reportType}
                              </td>
                              <td className="py-2 text-right tabular-nums">{fmt(item.incomeTax)}</td>
                              <td className="py-2 text-right tabular-nums">{fmt(item.localTax)}</td>
                              <td className="py-2 text-center text-foreground whitespace-normal">
                                {editMode && editingPaymentId === item.id ? (
                                  <Input
                                    value={editingPaymentForm.memo}
                                    onChange={(e) => setEditingPaymentField("memo", e.target.value)}
                                  />
                                ) : item.memo || "-"}
                              </td>
                              {editMode && (
                                <td className="py-2 text-right space-x-1">
                                  {editingPaymentId === item.id ? (
                                    <>
                                      <Button size="sm" className="h-7 px-2" onClick={() => handleSavePaymentEntry(item.id)}>저장</Button>
                                      <Button variant="outline" size="sm" className="h-7 px-2" onClick={handleCancelEditPayment}>취소</Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleEditPaymentEntry(item.id)}>수정</Button>
                                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleRemovePaymentEntry(item.id)}>삭제</Button>
                                    </>
                                  )}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                        {paymentRows.length === 0 && (
                          <tr>
                            <td colSpan={editMode ? 7 : 6} className="py-8 text-center text-muted-foreground">등록된 지급 내역이 없습니다.</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border text-sm text-foreground">
                          <td className="pt-3 font-semibold">총합계</td>
                          <td className="pt-3 text-right tabular-nums font-semibold text-blue-600">{fmt(paymentRows.reduce((sum, item) => sum + item.amount, 0))}</td>
                          <td className="pt-3 text-center font-semibold">-</td>
                          <td className="pt-3 text-right tabular-nums font-semibold text-blue-600">{fmt(paymentRows.reduce((sum, item) => sum + (item.reportType === "신고" ? Math.floor(item.amount * 0.033) : 0), 0))}</td>
                          <td className="pt-3 text-right tabular-nums font-semibold text-blue-600">{fmt(paymentRows.reduce((sum, item) => sum + (item.reportType === "신고" ? Math.floor(item.amount * 0.003) : 0), 0))}</td>
                          <td className="pt-3 text-center font-semibold">-</td>
                          {editMode && <td className="pt-3" />}
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
                        <Button className="h-10" onClick={handleAddPaymentEntry}>추가</Button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
                        <span>소득세</span>
                        <span className="font-medium text-foreground">{fmt(paymentPreviewTaxes.incomeTax)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
                        <span>지방세</span>
                        <span className="font-medium text-foreground">{fmt(paymentPreviewTaxes.localTax)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 등록 다이얼로그 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>소득 등록</DialogTitle>
          </DialogHeader>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex flex-col gap-5 py-2">
            {/* 기본 정보 */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <Field id="bi-name"    label="소득자명 *" value={form.name}    onChange={(v) => set("name", v)}    placeholder="홍길동" />
                <Field id="bi-phone"   label="전화번호"   value={form.phone}   onChange={(v) => set("phone", v)}   placeholder="010-0000-0000" />
                <Field id="bi-regno"   label="주민번호"   value={form.regNo}   onChange={(v) => set("regNo", v)}   placeholder="000000-0000000" />
                <Field id="bi-account" label="계좌번호"   value={form.account} onChange={(v) => set("account", v)} placeholder="은행명 000-000-000000" />
                <Field id="bi-address" label="주소"       value={form.address} onChange={(v) => set("address", v)} placeholder="시/도 구/군 읍/면/동" />
                <Field id="bi-revenue" label="총 매출액" value={form.revenue} onChange={(v) => set("revenue", toCommaNumber(v))} placeholder="0" />
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

            {/* 지급 정보 */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">지급 정보</p>
              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bi-paydate" className="text-xs text-muted-foreground">지급 일자</Label>
                  <Input id="bi-paydate" type="date" value={form.payDate} onChange={(e) => set("payDate", e.target.value)} />
                </div>
                <Field id="bi-payment" label="지급액 (원)" value={form.payment} onChange={(v) => set("payment", toCommaNumber(v))} placeholder="0" />
              </div>
              <div className="grid grid-cols-1 gap-4 text-sm mb-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bi-payment-reportType" className="text-xs text-muted-foreground">신고 항목</Label>
                  <select
                    id="bi-payment-reportType"
                    value={form.reportType}
                    onChange={(e) => set("reportType", e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="미신고">미신고</option>
                    <option value="신고">신고</option>
                  </select>
                </div>
              </div>
              {Number(form.payment.replace(/,/g, "")) > 0 && (
                <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
                    <span className="text-muted-foreground">소득세</span>
                    <span className="font-medium text-foreground">{fmt(getPaymentTaxes(form.reportType, Number(form.payment.replace(/,/g, "")) || 0).incomeTax)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
                    <span className="text-muted-foreground">지방세</span>
                    <span className="font-medium text-foreground">{fmt(getPaymentTaxes(form.reportType, Number(form.payment.replace(/,/g, "")) || 0).localTax)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
                    <span className="text-muted-foreground">실 지급액</span>
                    <span className="font-medium text-foreground text-blue-600">{fmt(getActualPayment(Number(form.payment.replace(/,/g, "")) || 0, form.reportType))}</span>
                  </div>
                </div>
              )}
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
