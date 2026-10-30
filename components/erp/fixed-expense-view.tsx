"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { Trash2, ChevronLeft, ChevronRight, Save, Plus, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn, toCommaNumber } from "@/lib/utils"
import { api, ApiError } from "@/lib/api"
import { FixedExpenseItemDetail } from "@/components/erp/fixed-expense-item-detail"

type Item = { id: number; itemName: string; detail?: string; createdAt: string }
type Entry = {
  id: number
  itemId: number
  year: number
  month: number
  entryDate: string
  amount: number
  memo: string
  completed: boolean
  completedAt: string | null
}

function formatCompletedAt(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())} 완료`
}

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

/** 저장된 내역과 비교해 입력값이 바뀌었는지 */
function isRowDirty(row: RowState, entry?: Entry): boolean {
  const saved = makeRowState(entry)
  return (
    row.entryDate !== saved.entryDate ||
    Number(row.amount.replace(/,/g, "") || 0) !== Number(saved.amount.replace(/,/g, "") || 0) ||
    row.memo !== saved.memo
  )
}

/** 하나라도 입력했다면 날짜와 금액은 필수. 문제 없으면 null */
function validateRow(row: RowState): string | null {
  const hasDate = row.entryDate.trim() !== ""
  const hasAmount = Number(row.amount.replace(/,/g, "")) > 0
  const hasMemo = row.memo.trim() !== ""
  if (!(hasDate || hasAmount || hasMemo)) return null
  if (!hasDate) return "날짜를 입력해주세요."
  if (!hasAmount) return "금액을 입력해주세요."
  return null
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
  const [completingIds, setCompletingIds] = useState<Set<number>>(new Set())
  // 완료된 행 중 수정 버튼을 눌러 편집 중인 행
  const [editingIds, setEditingIds] = useState<Set<number>>(new Set())
  const [rowSavingIds, setRowSavingIds] = useState<Set<number>>(new Set())
  // 세부내역 창에서 보고 있는 항목
  const [detailItem, setDetailItem] = useState<Item | null>(null)

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
      setEditingIds(new Set())
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

  function entryOf(itemId: number): Entry | undefined {
    return entries.find((e) => e.itemId === itemId && e.year === year && e.month === month)
  }

  function upsertEntry(saved: Entry) {
    setEntries((prev) =>
      prev.some((e) => e.itemId === saved.itemId)
        ? prev.map((e) => (e.itemId === saved.itemId ? saved : e))
        : [...prev, saved],
    )
  }

  function markSet(setter: typeof setEditingIds, id: number, on: boolean) {
    setter((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function postSave(itemId: number, row: RowState, editCompleted = false) {
    return api.post<Entry>("/api/fixed-expense-entries/save", {
      itemId,
      year,
      month,
      entryDate: row.entryDate,
      amount: Number(row.amount.replace(/,/g, "") || 0),
      memo: row.memo,
      editCompleted,
    })
  }

  // 전체 저장 (완료된 항목은 잠겨 있으므로 제외)
  async function handleSaveAll() {
    const newStates = { ...rowStates }
    let hasError = false
    const editable = items.filter((item) => !entryOf(item.id)?.completed)

    for (const item of editable) {
      const row = rowStates[item.id] ?? makeRowState()
      const err = validateRow(row)
      if (err) {
        newStates[item.id] = { ...row, error: err }
        hasError = true
      }
    }

    if (hasError) {
      setRowStates(newStates)
      return
    }

    const targets = editable.filter((item) => {
      const row = rowStates[item.id] ?? makeRowState()
      return row.entryDate.trim() !== "" && Number(row.amount.replace(/,/g, "")) > 0
    })

    if (targets.length === 0) return

    setSaving(true)
    try {
      const results = await Promise.all(targets.map((item) => postSave(item.id, rowStates[item.id])))
      results.forEach(upsertEntry)
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "저장 실패")
    } finally {
      setSaving(false)
    }
  }

  // 완료된 행: 수정 시작
  function startEdit(item: Item) {
    markSet(setEditingIds, item.id, true)
  }

  // 완료된 행: 수정 취소 (저장된 값으로 되돌림)
  function cancelEdit(item: Item) {
    setRowStates((prev) => ({ ...prev, [item.id]: makeRowState(entryOf(item.id)) }))
    markSet(setEditingIds, item.id, false)
  }

  // 완료된 행: 수정 내용 저장
  async function saveEdit(item: Item) {
    const row = rowStates[item.id] ?? makeRowState()
    const err = validateRow(row)
    if (err) {
      setRowStates((prev) => ({ ...prev, [item.id]: { ...row, error: err } }))
      return
    }
    markSet(setRowSavingIds, item.id, true)
    try {
      const saved = await postSave(item.id, row, true)
      upsertEntry(saved)
      setRowStates((prev) => ({ ...prev, [item.id]: makeRowState(saved) }))
      markSet(setEditingIds, item.id, false)
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "저장 실패")
    } finally {
      markSet(setRowSavingIds, item.id, false)
    }
  }

  // 항목 완료 처리 / 해제 (즉시 저장)
  async function handleToggleComplete(item: Item, completed: boolean) {
    const row = rowStates[item.id] ?? makeRowState()
    const entry = entryOf(item.id)

    // 저장 안 된 입력이 있는 상태로 완료하면 그 값을 먼저 저장한 뒤 잠근다
    if (completed && isRowDirty(row, entry)) {
      const err = validateRow(row)
      if (err) {
        setRowStates((prev) => ({ ...prev, [item.id]: { ...row, error: `완료하려면 ${err}` } }))
        return
      }
    }

    markSet(setCompletingIds, item.id, true)
    try {
      if (completed && isRowDirty(row, entry)) {
        const savedRow = await postSave(item.id, row)
        upsertEntry(savedRow)
      }
      const saved = await api.post<Entry>("/api/fixed-expense-entries/complete", {
        itemId: item.id,
        year,
        month,
        completed,
      })
      upsertEntry(saved)
      setRowStates((prev) => ({ ...prev, [item.id]: makeRowState(saved) }))
      markSet(setEditingIds, item.id, false)
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "완료 처리 실패")
    } finally {
      markSet(setCompletingIds, item.id, false)
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

  const completedItemIds = useMemo(
    () => new Set(entries.filter((e) => e.year === year && e.month === month && e.completed).map((e) => e.itemId)),
    [entries, year, month],
  )
  const completedCount = items.filter((i) => completedItemIds.has(i.id)).length

  // 날짜 기준 오름차순 정렬 (1일 → 말일, 날짜 없는 항목은 맨 아래)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const dateA = rowStates[a.id]?.entryDate ?? ""
      const dateB = rowStates[b.id]?.entryDate ?? ""
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      const dayA = parseInt(dateA.slice(8, 10)) || 0
      const dayB = parseInt(dateB.slice(8, 10)) || 0
      return dayA - dayB
    })
  }, [items, rowStates])

  const hasChanges = items.some((item) => {
    if (completedItemIds.has(item.id)) return false
    const row = rowStates[item.id] ?? makeRowState()
    return row.entryDate.trim() !== "" || Number(row.amount.replace(/,/g, "")) > 0
  })

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="mobile-hidden text-lg font-semibold">고정지출</h2>
          <p className="text-sm text-muted-foreground">
            전체 {items.length}개 항목
            {items.length > 0 && (
              <span className={cn("ml-2 font-medium", completedCount === items.length ? "text-emerald-600" : "text-foreground")}>
                · {month}월 완료 {completedCount}/{items.length}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
                    checked={selectedIds.size === sortedItems.length && sortedItems.length > 0}
                    onChange={(e) => setSelectedIds(e.target.checked ? new Set(sortedItems.map((i) => i.id)) : new Set())}
                  />
                </th>
              )}
              <th className="px-4 py-3 font-medium w-[64px] text-center">완료</th>
              <th className="px-4 py-3 font-medium w-[150px]">날짜</th>
              <th className="px-4 py-3 font-medium w-[280px]">항목명</th>
              <th className="px-4 py-3 font-medium w-[150px]">금액 (원)</th>
              <th className="px-4 py-3 font-medium w-[160px]">메모</th>
              <th className="px-4 py-3 w-[150px]" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={bulkMode ? 7 : 6} className="py-16 text-center text-muted-foreground">불러오는 중...</td>
              </tr>
            ) : sortedItems.length === 0 ? (
              <tr>
                <td colSpan={bulkMode ? 7 : 6} className="py-16 text-center text-muted-foreground">
                  위에서 항목을 추가하세요.
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const row = rowStates[item.id] ?? makeRowState()
                const entry = entries.find((e) => e.itemId === item.id && e.year === year && e.month === month)
                const completed = completedItemIds.has(item.id)
                const completing = completingIds.has(item.id)
                const editing = completed && editingIds.has(item.id)
                const locked = completed && !editing
                const dirty = editing && isRowDirty(row, entry)
                const rowSaving = rowSavingIds.has(item.id)
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors",
                      row.error ? "bg-destructive/5" : editing ? "bg-amber-50/70" : completed ? "bg-emerald-50/60 hover:bg-emerald-50" : "hover:bg-muted/10"
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
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${item.itemName} 완료`}
                        title={editing ? "수정 중에는 완료 상태를 바꿀 수 없습니다" : completed ? "완료 해제" : "완료 처리"}
                        className="h-4 w-4 cursor-pointer rounded border-border accent-emerald-600 disabled:cursor-wait disabled:opacity-50"
                        checked={completed}
                        disabled={completing || editing || rowSaving}
                        onChange={(e) => void handleToggleComplete(item, e.target.checked)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="date"
                        value={row.entryDate}
                        onChange={(e) => setRow(item.id, { entryDate: e.target.value })}
                        disabled={locked || rowSaving}
                        className={cn("h-8 text-xs w-full", row.error && !row.entryDate && "border-destructive")}
                      />
                    </td>
                    <td className="px-4 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => setDetailItem(item)}
                        title="세부내역 보기"
                        className={cn("text-left hover:text-primary hover:underline underline-offset-2", completed && "text-muted-foreground line-through decoration-muted-foreground/60")}
                      >
                        {item.itemName}
                      </button>
                      {completed && entry?.completedAt && (
                        <span className="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          {formatCompletedAt(entry.completedAt)}
                        </span>
                      )}
                      {item.detail && (
                        <p className="mt-0.5 max-w-[260px] truncate text-[11px] font-normal text-muted-foreground" title={item.detail}>{item.detail.split(/\r?\n/)[0]}</p>
                      )}
                      {row.error && <p className="text-[11px] text-destructive mt-0.5">{row.error}</p>}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={row.amount}
                        onChange={(e) => setRow(item.id, { amount: toCommaNumber(e.target.value) })}
                        placeholder="0"
                        className={cn("h-8 text-xs text-right tabular-nums w-full", row.error && !Number(row.amount.replace(/,/g, "")) && "border-destructive")}
                        inputMode="numeric"
                        disabled={locked || rowSaving}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={row.memo}
                        onChange={(e) => setRow(item.id, { memo: e.target.value })}
                        placeholder={locked ? "" : "메모 (선택)"}
                        className="h-8 text-xs w-full"
                        disabled={locked || rowSaving}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {locked && (
                          <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs" onClick={() => startEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />수정
                          </Button>
                        )}
                        {editing && dirty && (
                          <Button size="sm" className="h-8 px-2.5 text-xs" disabled={rowSaving} onClick={() => void saveEdit(item)}>
                            {rowSaving ? "저장 중..." : "저장"}
                          </Button>
                        )}
                        {editing && (
                          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" disabled={rowSaving} onClick={() => cancelEdit(item)}>
                            취소
                          </Button>
                        )}
                        {!editing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground/50 hover:text-destructive transition-colors" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {items.length > 0 && !loading && (
            <tfoot>
              <tr className="border-t border-border bg-muted/40">
                <td colSpan={bulkMode ? 3 : 2} className="px-4 py-2.5 text-sm font-medium text-muted-foreground">합계</td>
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

      <FixedExpenseItemDetail
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onSaved={(updated) => {
          setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)))
          setDetailItem((cur) => (cur && cur.id === updated.id ? { ...cur, ...updated } : cur))
        }}
      />

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
