"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChangeHistory } from "@/components/erp/change-history"
import { ApiError, api } from "@/lib/api"

export type FixedExpenseItem = { id: number; itemName: string; detail?: string; oneTimeMonth?: string | null; createdAt: string }

type HistoryEntry = {
  id: number
  year: number
  month: number
  entryDate: string
  amount: number
  memo: string
  completed: boolean
  completedAt: string | null
}

const won = (n: number) => `₩${Math.round(n).toLocaleString("ko-KR")}`

/** 고정지출 항목 세부내역: 항목명·세부내역 수정 + 월별 지출 내역 */
export function FixedExpenseItemDetail({
  item, onClose, onSaved,
}: {
  item: FixedExpenseItem | null
  onClose: () => void
  onSaved: (item: FixedExpenseItem) => void
}) {
  const [name, setName] = useState("")
  const [detail, setDetail] = useState("")
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!item) return
    setName(item.itemName)
    setDetail(item.detail ?? "")
    setError(null)
    setSavedAt(null)
    setLoading(true)
    api.get<HistoryEntry[]>(`/api/fixed-expense-entries/by-item/${item.id}`)
      .then(setHistory)
      .catch((e) => setError(e instanceof ApiError ? e.message : "내역을 불러오지 못했습니다."))
      .finally(() => setLoading(false))
  }, [item])

  const dirty = !!item && (name.trim() !== item.itemName || detail.trim() !== (item.detail ?? ""))
  const total = history.reduce((s, h) => s + (h.amount || 0), 0)

  async function handleSave() {
    if (!item) return
    if (!name.trim()) { setError("항목명을 입력해주세요."); return }
    setSaving(true)
    setError(null)
    try {
      const updated = await api.put<FixedExpenseItem>(`/api/fixed-expense-items/${item.id}`, { itemName: name.trim(), detail: detail.trim() })
      onSaved(updated)
      setSavedAt(new Date().toISOString())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "저장에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>고정지출 세부내역</DialogTitle></DialogHeader>
        {item && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fe-item-name" className="flex items-center gap-2 text-xs text-muted-foreground">
                항목명
                <span className={item.oneTimeMonth ? "rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700" : "rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"}>
                  {item.oneTimeMonth ? `단발성 · ${item.oneTimeMonth}` : "지속성 · 매달 이어짐"}
                </span>
              </Label>
              <Input id="fe-item-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fe-item-detail" className="text-xs text-muted-foreground">세부내역</Label>
              <Textarea
                id="fe-item-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={4}
                placeholder={"예: 자동이체 (국민은행 123-456-789012)\n전월분을 매월 10일에 납부\n담당자 연락처 010-0000-0000"}
              />
            </div>

            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground">월별 지출 내역 ({history.length}건)</p>
                {history.length > 0 && <p className="text-xs text-muted-foreground">합계 <span className="font-semibold text-foreground tabular-nums">{won(total)}</span></p>}
              </div>
              {loading ? (
                <p className="py-6 text-center text-xs text-muted-foreground">불러오는 중...</p>
              ) : history.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">아직 입력된 지출 내역이 없습니다.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">월</th>
                        <th className="px-3 py-2 text-left font-medium">날짜</th>
                        <th className="px-3 py-2 text-right font-medium">금액</th>
                        <th className="px-3 py-2 text-left font-medium">메모</th>
                        <th className="px-3 py-2 text-center font-medium">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id} className="border-t border-border/60">
                          <td className="px-3 py-2 whitespace-nowrap">{h.year}년 {h.month}월</td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{h.entryDate || "-"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{h.amount ? won(h.amount) : "-"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{h.memo || "-"}</td>
                          <td className="px-3 py-2 text-center">
                            {h.completed ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                <Check className="h-3 w-3" />완료
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">미완료</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <ChangeHistory entityType="FixedExpenseItem" entityId={item.id} refreshKey={savedAt} />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
        <DialogFooter>
          {savedAt && !dirty && <span className="mr-auto self-center text-xs text-emerald-600">저장했습니다.</span>}
          <Button variant="outline" onClick={onClose}>닫기</Button>
          <Button disabled={saving || !dirty} onClick={() => void handleSave()}>{saving ? "저장 중..." : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
