"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn, toCommaNumber } from "@/lib/utils"

// corporations-view의 운영 법인 데이터와 동기화
const OPERATING_CORPS = [
  { id: "op1", name: "운영 법인", ceo: "김한빛", region: "서울 강남구",   account: "신한 110-123-456789" },
  { id: "op2", name: "운영 법인", ceo: "최운영", region: "부산 해운대구", account: "농협 606-8100-77234" },
]

type TxType = "입금" | "출금"

type Transaction = {
  id: string
  date: string
  type: TxType
  amount: number
  description: string
  note: string
}

type CorpTransactions = Record<string, Transaction[]>

const initialTransactions: CorpTransactions = {
  op1: [
    { id: "op1-t1", date: "2024-01-05", type: "입금",  amount: 5000000, description: "사업 수익",      note: "" },
    { id: "op1-t2", date: "2024-01-10", type: "출금",  amount: 1200000, description: "임대료",          note: "1월분" },
    { id: "op1-t3", date: "2024-02-03", type: "입금",  amount: 3000000, description: "컨설팅 수수료",  note: "" },
    { id: "op1-t4", date: "2024-02-15", type: "출금",  amount: 800000,  description: "유류비",          note: "차량 운영" },
  ],
  op2: [
    { id: "op2-t1", date: "2024-01-08", type: "입금",  amount: 8000000, description: "매출 수익",  note: "" },
    { id: "op2-t2", date: "2024-01-20", type: "출금",  amount: 2500000, description: "인건비",     note: "파트타임" },
    { id: "op2-t3", date: "2024-02-10", type: "출금",  amount: 500000,  description: "사무용품",   note: "" },
  ],
}

const fmt = (n: number) => n.toLocaleString("ko-KR") + "원"
const today = () => new Date().toISOString().slice(0, 10)
const firstOfMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

const emptyForm = () => ({ date: today(), type: "입금" as TxType, amount: "", description: "", note: "" })

const QUICK_RANGES: { label: string; getRange: () => { from: string; to: string } }[] = [
  { label: "당일", getRange: () => { const d = today(); return { from: d, to: d } } },
  { label: "전일", getRange: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = d.toISOString().slice(0, 10); return { from: s, to: s } } },
  { label: "당월", getRange: () => ({ from: firstOfMonth(), to: today() }) },
  { label: "전월", getRange: () => { const d = new Date(); const y = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear(); const m = d.getMonth() === 0 ? 12 : d.getMonth(); const last = new Date(y, m, 0).getDate(); return { from: `${y}-${String(m).padStart(2, "0")}-01`, to: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}` } } },
  { label: "전체", getRange: () => ({ from: "", to: "" }) },
]

export function OperatingCostView() {
  const [activeTab, setActiveTab]       = useState(OPERATING_CORPS[0].id)
  const [transactions, setTransactions] = useState<CorpTransactions>(initialTransactions)
  const [dateFrom, setDateFrom]         = useState(firstOfMonth())
  const [dateTo, setDateTo]             = useState(today())
  const [appliedFrom, setAppliedFrom]   = useState(firstOfMonth())
  const [appliedTo, setAppliedTo]       = useState(today())
  const [form, setForm]                 = useState(emptyForm())
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [editForm, setEditForm]           = useState(emptyForm())
  const [activeShortcut, setActiveShortcut] = useState<string | null>("당월")

  const currentTxs = transactions[activeTab] ?? []

  const filtered = useMemo(() =>
    [...currentTxs]
      .filter((tx) => {
        if (appliedFrom && tx.date < appliedFrom) return false
        if (appliedTo   && tx.date > appliedTo)   return false
        return true
      })
      .sort((a, b) => a.date.localeCompare(b.date)),
    [currentTxs, appliedFrom, appliedTo],
  )

  const totalIn  = filtered.filter((t) => t.type === "입금").reduce((s, t) => s + t.amount, 0)
  const totalOut = filtered.filter((t) => t.type === "출금").reduce((s, t) => s + t.amount, 0)
  const balance  = totalIn - totalOut

  function handleAdd() {
    const amount = Number(form.amount.replace(/,/g, ""))
    if (!form.date || !amount) return
    setTransactions((prev) => ({
      ...prev,
      [activeTab]: [
        ...(prev[activeTab] ?? []),
        { id: `${activeTab}-${Date.now()}`, date: form.date, type: form.type, amount, description: form.description, note: form.note },
      ],
    }))
    setForm(emptyForm())
  }

  function handleDelete(id: string) {
    setTransactions((prev) => ({ ...prev, [activeTab]: (prev[activeTab] ?? []).filter((t) => t.id !== id) }))
    if (editingId === id) setEditingId(null)
  }

  function handleEdit(tx: Transaction) {
    setEditingId(tx.id)
    setEditForm({ date: tx.date, type: tx.type, amount: tx.amount.toLocaleString("ko-KR"), description: tx.description, note: tx.note })
  }

  function handleSaveEdit(id: string) {
    const amount = Number(editForm.amount.replace(/,/g, ""))
    if (!editForm.date || !amount) return
    setTransactions((prev) => ({
      ...prev,
      [activeTab]: (prev[activeTab] ?? []).map((t) =>
        t.id === id ? { ...t, date: editForm.date, type: editForm.type, amount, description: editForm.description, note: editForm.note } : t,
      ),
    }))
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 헤더 */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">운영비 관리</h2>
        <p className="text-sm text-muted-foreground">운영 법인별 입출금 내역을 관리합니다.</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-0 border-b border-border">
        {OPERATING_CORPS.map((corp) => (
          <button
            key={corp.id}
            onClick={() => { setActiveTab(corp.id); setEditingId(null) }}
            className={cn(
              "px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === corp.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {corp.name}
            <span className="ml-1.5 text-xs text-muted-foreground">· {corp.ceo}</span>
          </button>
        ))}
      </div>

      {/* 기간 검색 */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">시작일</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setActiveShortcut(null) }}
                className="w-40"
              />
            </div>
            <span className="pb-2.5 text-muted-foreground">~</span>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">종료일</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setActiveShortcut(null) }}
                className="w-40"
              />
            </div>
            <Button
              onClick={() => { setAppliedFrom(dateFrom); setAppliedTo(dateTo); setActiveShortcut(null) }}
            >
              검색
            </Button>
            <div className="w-px h-5 bg-border self-end mb-[11px]" />
            {QUICK_RANGES.map(({ label, getRange }) => (
              <Button
                key={label}
                variant={activeShortcut === label ? "default" : "outline"}
                size="sm"
                className={cn("h-10 px-3.5 text-sm", activeShortcut === label && "font-semibold")}
                onClick={() => {
                  const { from, to } = getRange()
                  setDateFrom(from); setDateTo(to)
                  setAppliedFrom(from); setAppliedTo(to)
                  setActiveShortcut(label)
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">총 입금</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-blue-600">{fmt(totalIn)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">총 출금</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-red-500">{fmt(totalOut)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">잔액</p>
            <p className={cn("mt-1 text-xl font-semibold tabular-nums", balance >= 0 ? "text-emerald-600" : "text-red-500")}>{fmt(balance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* 거래 내역 테이블 */}
      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-muted/70 text-left text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">날짜</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">유형</th>
                  <th className="px-3 py-2.5 text-right font-medium whitespace-nowrap">금액</th>
                  <th className="px-3 py-2.5 font-medium min-w-[160px]">내용</th>
                  <th className="px-3 py-2.5 font-medium min-w-[120px]">비고</th>
                  <th className="px-3 py-2.5 text-right font-medium whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-40 text-center text-muted-foreground">조회된 내역이 없습니다.</td>
                  </tr>
                ) : (
                  filtered.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/50 last:border-0 hover:bg-accent/40 transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {editingId === tx.id
                          ? <Input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} className="h-8 w-36" />
                          : tx.date}
                      </td>
                      <td className="px-3 py-2.5">
                        {editingId === tx.id ? (
                          <select
                            value={editForm.type}
                            onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value as TxType }))}
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                          >
                            <option value="입금">입금</option>
                            <option value="출금">출금</option>
                          </select>
                        ) : (
                          <span className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                            tx.type === "입금" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-600",
                          )}>
                            {tx.type}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {editingId === tx.id
                          ? <Input value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: toCommaNumber(e.target.value) }))} className="h-8 text-right w-36" />
                          : <span className={cn("font-medium", tx.type === "입금" ? "text-blue-600" : "text-red-500")}>{fmt(tx.amount)}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {editingId === tx.id
                          ? <Input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="h-8" />
                          : tx.description}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {editingId === tx.id
                          ? <Input value={editForm.note} onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))} className="h-8" />
                          : tx.note || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
                        {editingId === tx.id ? (
                          <>
                            <Button size="sm" className="h-7 px-2" onClick={() => handleSaveEdit(tx.id)}>저장</Button>
                            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setEditingId(null)}>취소</Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleEdit(tx)}>수정</Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleDelete(tx.id)}>삭제</Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 내역 추가 폼 */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">내역 추가</p>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">날짜</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">유형</Label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TxType }))}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="입금">입금</option>
                <option value="출금">출금</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">금액</Label>
              <Input value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: toCommaNumber(e.target.value) }))} placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs text-muted-foreground">내용</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="내용 입력" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">비고</Label>
              <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="비고" />
            </div>
            <div className="flex flex-col justify-end">
              <Button className="h-10" onClick={handleAdd}>
                <Plus className="mr-1 h-4 w-4" />추가
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
