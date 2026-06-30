"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Trash2, ChevronLeft, ChevronRight, Save, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn, toCommaNumber } from "@/lib/utils"
import { api, ApiError } from "@/lib/api"

type Item = { id: number; itemName: string; createdAt: string }
type Entry = { id: number; itemId: number; year: number; month: number; entryDate: string; amount: number; memo: string }

type RowState = {
  entryDate: string
  amount: string
  memo: string
  error: string
}

function makeRowState(entry?: Entry): RowState {
  return {
    entryDate: entry?.entryDate ?? "",
    amount: entry ? entry.amount.toLocaleString("ko-KR") : "",
    memo: entry?.memo ?? "",
    error: "",
  }
}

export function FixedExpenseView() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const [items, setItems] = useState<Item[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [rowStates, setRowStates] = useState<Record<number, RowState>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const [newItemName, setNewItemName] = useState("")
  const [addLoading, setAddLoading] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  const loadAll = useCallback(async (y: number, m: number) => {
    setLoading(true)
    setError(null)
    try {
      const [itemList, entryList] = await Promise.all([
        api.get<Item[]>("/api/fixed-expense-items"),
        api.get<Entry[]>(`/api/fixed-expense-entries?year=${y}&month=${m}`),
      ])
      setItems([...itemList].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      setEntries(entryList)
      const states: Record<number, RowState> = {}
      for (const item of itemList) {
        const entry = entryList.find((e) => e.itemId === item.id)
        states[item.id] = makeRowState(entry)
      }
      setRowStates(states)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "데이터를 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadAll(year, month) }, [loadAll, year, month])

  function setRow(itemId: number, patch: Partial<RowState>) {
    setRowStates((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch, error: "" } }))
  }

  // 항목 추가
  async function handleAdd() {
    const name = newItemName.trim()
    if (!name) {
      nameInputRef.current?.focus()
      return
    }
    setAddLoading(true)
    try {
      const created = await api.post<Item>("/api/fixed-expense-items", { itemName: name })
      setItems((prev) => [...prev, created])
      setRowStates((prev) => ({ ...prev, [created.id]: makeRowState() }))
      setNewItemName("")
      nameInputRef.current?.focus()
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "등록 실패")
    } finally {
      setAddLoading(false)
    }
  }

  // 전체 저장
  async function handleSaveAll() {
    const newStates = { ...rowStates }
    let hasError = false

    for (const item of items) {
      const row = rowStates[item.id] ?? makeRowState()
      const hasDate = row.entryDate.trim() !== ""
      const hasAmount = Number(row.amount.replace(/,/g, "")) > 0
      const hasMemo = row.memo.trim() !== ""
      const hasAny = hasDate || hasAmount || hasMemo

      if (hasAny) {
        if (!hasDate) {
          newStates[item.id] = { ...row, error: "날짜를 입력해주세요." }
          hasError = true
        } else if (!hasAmount) {
          newStates[item.id] = { ...row, error: "금액을 입력해주세요." }
          hasError = true
        }
      }
    }

    if (hasError) {
      setRowStates(newStates)
      return
    }

    const targets = items.filter((item) => {
      const row = rowStates[item.id] ?? makeRowState()
      return row.entryDate.trim() !== "" && Number(row.amount.replace(/,/g, "")) > 0
    })

    if (targets.length === 0) return

    setSaving(true)
    try {
      const results = await Promise.all(
        targets.map((item) => {
          const row = rowStates[item.id]
          return api.post<Entry>("/api/fixed-expense-entries/save", {
            itemId: item.id,
            year,
            month,
            entryDate: row.entryDate,
            amount: Number(row.amount.replace(/,/g, "")),
            memo: row.memo,
          })
        })
      )
      setEntries((prev) => {
        let updated = [...prev]
        for (const saved of results) {
          const exists = updated.find((e) => e.itemId === saved.itemId)
          updated = exists
            ? updated.map((e) => (e.itemId === saved.itemId ? saved : e))
            : [...updated, saved]
        }
        return updated
      })
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    } catch {
      alert("저장 실패")
    } finally {
      setSaving(false)
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      for (const id of selectedIds) {
        await api.delete(`/api/fixed-expense-items/${id}`)
      }
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)))
      setSelectedIds(new Set())
      setBulkMode(false)
      setBulkConfirm(false)
    } catch (e) {
      // 에러는 무시하고 로컬 업데이트
    } finally {
      setBulkDeleting(false)
    }
  }

  // 항목 삭제
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.delete(`/api/fixed-expense-items/${deleteTarget.id}`)
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
      setEntries((prev) => prev.filter((e) => e.itemId !== deleteTarget.id))
      setRowStates((prev) => {
        const next = { ...prev }
        delete next[deleteTarget.id]
        return next
      })
      setDeleteTarget(null)
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "삭제 실패")
    } finally {
      setDeleteLoading(false)
    }
  }

  const totalAmount = entries
    .filter((e) => e.year === year && e.month === month)
    .reduce((sum, e) => sum + e.amount, 0)

  const hasChanges = items.some((item) => {
    const row = rowStates[item.id] ?? makeRowState()
    return row.entryDate.trim() !== "" || Number(row.amount.replace(/,/g, "")) > 0
  })

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">고정지출</h2>
          <p className="text-sm text-muted-foreground">전체 {items.length}개 항목</p>
        </div>
        <div className="flex items-center gap-2">
          {bulkMode ? (
            <>
              {selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setBulkConfirm(true)}>
                  삭제 ({selectedIds.size}건)
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => { setBulkMode(false); setSelectedIds(new Set()) }}>취소</Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setBulkMode(true)}>일괄 삭제</Button>
          )}
          <Button onClick={handleSaveAll} disabled={saving || !hasChanges} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? "저장 중..." : savedMsg ? "저장 완료!" : "전체 저장"}
          </Button>
        </div>
      </div>

      {/* 월 네비게이터 */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{year}년 {month}월</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      )}

      {/* 항목 추가 영역 - 테이블 밖 */}
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3">
        <Input
          ref={nameInputRef}
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAdd() } }}
          placeholder="항목명 입력"
          className="h-9 max-w-[240px]"
          disabled={addLoading}
        />
        <Button
          onClick={() => void handleAdd()}
          disabled={addLoading}
          size="sm"
          className="h-9 gap-1.5 px-4"
        >
          <Plus className="h-4 w-4" />
          {addLoading ? "추가 중..." : "추가"}
        </Button>
        <span className="text-xs text-muted-foreground">항목명 입력 후 추가 버튼 또는 Enter</span>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              {bulkMode && (
                <th className="w-10 px-4 py-3 font-medium">
                  <input type="checkbox"
                    className="h-4 w-4 rounded border-border"
                    checked={selectedIds.size === items.length && items.length > 0}
                    onChange={(e) => setSelectedIds(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())}
                  />
                </th>
              )}
              <th className="px-4 py-3 font-medium w-[150px]">날짜</th>
              <th className="px-4 py-3 font-medium w-[180px]">항목명</th>
              <th className="px-4 py-3 font-medium w-[150px]">금액 (원)</th>
              <th className="px-4 py-3 font-medium">메모</th>
              <th className="px-4 py-3 w-[48px]" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-muted-foreground">불러오는 중...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-muted-foreground">
                  위에서 항목을 추가하세요.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const row = rowStates[item.id] ?? makeRowState()
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors",
                      row.error ? "bg-destructive/5" : "hover:bg-muted/10"
                    )}
                  >
                    {bulkMode && (
                      <td className="w-10 px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox"
                          className="h-4 w-4 rounded border-border"
                          checked={selectedIds.has(item.id)}
                          onChange={(e) => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev)
                              if (e.target.checked) { next.add(item.id) } else { next.delete(item.id) }
                              return next
                            })
                          }}
                        />
                      </td>
                    )}
                    <td className="px-4 py-2">
                      <Input
                        type="date"
                        value={row.entryDate}
                        onChange={(e) => setRow(item.id, { entryDate: e.target.value })}
                        className={cn("h-8 text-xs w-full", row.error && !row.entryDate && "border-destructive")}
                      />
                    </td>
                    <td className="px-4 py-2 font-medium">
                      {item.itemName}
                      {row.error && <p className="text-[11px] text-destructive mt-0.5">{row.error}</p>}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={row.amount}
                        onChange={(e) => setRow(item.id, { amount: toCommaNumber(e.target.value) })}
                        placeholder="0"
                        className={cn("h-8 text-xs text-right tabular-nums w-full", row.error && !Number(row.amount.replace(/,/g, "")) && "border-destructive")}
                        inputMode="numeric"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={row.memo}
                        onChange={(e) => setRow(item.id, { memo: e.target.value })}
                        placeholder="메모 (선택)"
                        className="h-8 text-xs w-full"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground/50 hover:text-destructive transition-colors" />
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {items.length > 0 && !loading && (
            <tfoot>
              <tr className="border-t border-border bg-muted/40">
                <td className="px-4 py-2.5 text-sm font-medium text-muted-foreground">합계</td>
                <td />
                <td className="px-4 py-2.5 text-sm font-semibold tabular-nums text-right">
                  ₩{totalAmount.toLocaleString("ko-KR")}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* 일괄 삭제 확인 */}
      <Dialog open={bulkConfirm} onOpenChange={(o) => { if (!o) setBulkConfirm(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>일괄 삭제</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            선택한 <span className="font-semibold text-foreground">{selectedIds.size}건</span>을 삭제하시겠습니까?<br />
            삭제 후 복구할 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirm(false)}>취소</Button>
            <Button variant="destructive" disabled={bulkDeleting} onClick={handleBulkDelete}>
              {bulkDeleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 항목 삭제 확인 */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>항목 삭제</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            <span className="font-semibold text-foreground">{deleteTarget?.itemName}</span> 항목과 모든 달의 내역이 삭제됩니다.
            <br />삭제 후 복구할 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button variant="destructive" disabled={deleteLoading} onClick={handleDelete}>
              {deleteLoading ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
