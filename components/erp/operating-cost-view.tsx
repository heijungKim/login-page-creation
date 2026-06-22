"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn, toCommaNumber } from "@/lib/utils"
import { ApiError, api } from "@/lib/api"
import { useCorporations } from "@/components/erp/corporations-context"

type TxType = "입금" | "출금"

type Transaction = {
  id: number
  corporationId: number
  date: string
  type: TxType
  amount: number
  description: string
  note: string
}

type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

type Totals = {
  corporationId: number
  from: string | null
  to: string | null
  totalIn: number
  totalOut: number
  balance: number
}

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR") + "원"
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
  const { rows: corporations, loading: corpsLoading } = useCorporations()

  const operatingCorps = useMemo(
    () => corporations.filter((c) => c.status !== "폐업" && c.id != null),
    [corporations],
  )

  const [activeTab, setActiveTab] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState(firstOfMonth())
  const [dateTo, setDateTo] = useState(today())
  const [appliedFrom, setAppliedFrom] = useState(firstOfMonth())
  const [appliedTo, setAppliedTo] = useState(today())
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState(emptyForm())
  const [activeShortcut, setActiveShortcut] = useState<string | null>("당월")

  useEffect(() => {
    if (activeTab == null && operatingCorps.length > 0) {
      setActiveTab(operatingCorps[0].id!)
    }
  }, [operatingCorps, activeTab])

  async function refresh(corporationId: number, from: string, to: string) {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("corporationId", String(corporationId))
      params.set("size", "500")
      if (from) params.set("from", from)
      if (to) params.set("to", to)

      const totalsParams = new URLSearchParams()
      totalsParams.set("corporationId", String(corporationId))
      if (from) totalsParams.set("from", from)
      if (to) totalsParams.set("to", to)

      const [page, totalsResult] = await Promise.all([
        api.get<PageResponse<Transaction>>(`/api/operating-costs?${params.toString()}`),
        api.get<Totals>(`/api/operating-costs/totals?${totalsParams.toString()}`),
      ])
      setTransactions(page.content)
      setTotals(totalsResult)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "운영비 내역을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab != null) {
      void refresh(activeTab, appliedFrom, appliedTo)
    }
  }, [activeTab, appliedFrom, appliedTo])

  const filtered = useMemo(
    () => [...transactions].sort((a, b) => a.date.localeCompare(b.date)),
    [transactions],
  )

  async function handleAdd() {
    if (activeTab == null) return
    const amount = Number(form.amount.replace(/,/g, ""))
    if (!form.date || !amount) {
      setSubmitError("날짜와 금액은 필수입니다.")
      return
    }
    setSubmitError(null)
    try {
      await api.post<Transaction>("/api/operating-costs", {
        corporationId: activeTab,
        date: form.date,
        type: form.type,
        amount,
        description: form.description,
        note: form.note,
      })
      setForm(emptyForm())
      await refresh(activeTab, appliedFrom, appliedTo)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "추가에 실패했습니다.")
    }
  }

  async function handleDelete(id: number) {
    if (activeTab == null) return
    if (!confirm("삭제하시겠습니까?")) return
    setSubmitError(null)
    try {
      await api.delete(`/api/operating-costs/${id}`)
      if (editingId === id) setEditingId(null)
      await refresh(activeTab, appliedFrom, appliedTo)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "삭제에 실패했습니다.")
    }
  }

  function handleEdit(tx: Transaction) {
    setEditingId(tx.id)
    setEditForm({ date: tx.date, type: tx.type, amount: tx.amount.toLocaleString("ko-KR"), description: tx.description, note: tx.note })
  }

  async function handleSaveEdit(id: number) {
    if (activeTab == null) return
    const amount = Number(editForm.amount.replace(/,/g, ""))
    if (!editForm.date || !amount) {
      setSubmitError("날짜와 금액은 필수입니다.")
      return
    }
    setSubmitError(null)
    try {
      await api.put<Transaction>(`/api/operating-costs/${id}`, {
        date: editForm.date,
        type: editForm.type,
        amount,
        description: editForm.description,
        note: editForm.note,
      })
      setEditingId(null)
      await refresh(activeTab, appliedFrom, appliedTo)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "수정에 실패했습니다.")
    }
  }

  const totalIn = totals?.totalIn ?? 0
  const totalOut = totals?.totalOut ?? 0
  const balance = totals?.balance ?? 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">운영비 관리</h2>
        <p className="text-sm text-muted-foreground">법인별 입출금 내역을 관리합니다.</p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      ) : null}
      {submitError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{submitError}</div>
      ) : null}

      {corpsLoading ? (
        <p className="text-sm text-muted-foreground">법인 목록 불러오는 중...</p>
      ) : operatingCorps.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">
            등록된 법인이 없습니다. 법인 관리에서 먼저 법인을 등록해주세요.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-0 border-b border-border overflow-x-auto">
            {operatingCorps.map((corp) => (
              <button
                key={corp.id}
                onClick={() => { setActiveTab(corp.id!); setEditingId(null) }}
                className={cn(
                  "px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                  activeTab === corp.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                {corp.name}
                {corp.ceo ? <span className="ml-1.5 text-xs text-muted-foreground">· {corp.ceo}</span> : null}
              </button>
            ))}
          </div>

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
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="h-40 text-center text-muted-foreground">불러오는 중...</td>
                      </tr>
                    ) : filtered.length === 0 ? (
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
        </>
      )}
    </div>
  )
}
