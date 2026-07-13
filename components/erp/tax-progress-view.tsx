"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { api, ApiError } from "@/lib/api"

/* ─── 타입 ─────────────────────────────────────────────── */
type TaxProgress = {
  id: number
  corpName: string
  yearMonth: string
  category: string
  pgName: string
  outstandingAmount: number | null
  quarter: string
  clientTotal: number | null
  salesAmount: number | null
  erpUsed: string
  totalCommission: number | null
  commission: number | null
  salesCommissionConfirmed: string
  invoiceIssued: string
  subsidiaryCommission: number | null
  subsidiaryInvoiceIssued: string
  task: string; dueDate: string; manager: string; status: string; memo: string
  createdAt: string
}

type MiniTradingCorp = {
  id: number; name: string
  commission: number | null
  pgs: { id: number; pgCompanyName: string }[]
  subsidiaries: { id: number; name: string }[]
  giftCorps: { id: number; name: string }[]
}

type EditCell = { id: number; field: string; value: string }

type AddForm = {
  corpName: string; pgName: string; yearMonth: string; category: string; quarter: string
  outstandingAmount: string; clientTotal: string; salesAmount: string
  erpUsed: string; totalCommission: string; commission: string
  salesCommissionConfirmed: string; invoiceIssued: string
  subsidiaryCommission: string; subsidiaryInvoiceIssued: string
}

/* ─── 상수 ─────────────────────────────────────────────── */
const QUARTER_OPTIONS = ["", "1분기", "2분기", "3분기", "4분기"]

const EMPTY_FORM: AddForm = {
  corpName: "", pgName: "", yearMonth: "", category: "", quarter: "",
  outstandingAmount: "", clientTotal: "", salesAmount: "",
  erpUsed: "", totalCommission: "", commission: "",
  salesCommissionConfirmed: "", invoiceIssued: "",
  subsidiaryCommission: "", subsidiaryInvoiceIssued: "",
}

/* ─── 유틸 ─────────────────────────────────────────────── */
function parseAmount(s: string): number | null {
  const n = parseInt(s.replace(/[^0-9-]/g, ""), 10)
  return isNaN(n) ? null : n
}

function cycleOX(v: string): string {
  return v === "" ? "O" : v === "O" ? "X" : ""
}

function buildRequest(row: TaxProgress) {
  return {
    corpName: row.corpName, task: row.task || "", dueDate: row.dueDate || "",
    manager: row.manager || "", status: row.status || "대기", memo: row.memo || "",
    yearMonth: row.yearMonth || "", category: row.category || "",
    pgName: row.pgName || "",
    outstandingAmount: row.outstandingAmount, quarter: row.quarter || "",
    clientTotal: row.clientTotal, salesAmount: row.salesAmount, erpUsed: row.erpUsed || "",
    totalCommission: row.totalCommission, commission: row.commission,
    salesCommissionConfirmed: row.salesCommissionConfirmed || "",
    invoiceIssued: row.invoiceIssued || "",
    subsidiaryCommission: row.subsidiaryCommission,
    subsidiaryInvoiceIssued: row.subsidiaryInvoiceIssued || "",
  }
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, "0")}`
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number)
  if (m === 12) return `${y + 1}-01`
  return `${y}-${String(m + 1).padStart(2, "0")}`
}

function currentYM(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/* ─── 법인 검색 콤보박스 ─────────────────────────────────── */
function CorpSearchCombobox({
  corps,
  value,
  onSelect,
}: {
  corps: MiniTradingCorp[]
  value: string
  onSelect: (corp: MiniTradingCorp) => void
}) {
  const [search, setSearch] = useState(value)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setSearch(value) }, [value])

  const filtered = corps
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 30)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="법인명 검색..."
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full max-h-52 overflow-y-auto rounded-md border border-border bg-background shadow-lg mt-1">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="flex w-full items-start gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(c); setSearch(c.name); setOpen(false) }}
            >
              <span className="font-medium flex-1">{c.name}</span>
              {c.pgs.length > 0 && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {c.pgs.map((p) => p.pgCompanyName).join(", ")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── 서브 컴포넌트 (외부 정의 → 리렌더 시 재마운트 없음) ── */
function OxBadge({ value, onClick }: { value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-semibold min-w-[28px] cursor-pointer select-none transition-colors",
        value === "O" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" :
        value === "X" ? "bg-red-100 text-red-600 hover:bg-red-200" :
        "text-muted-foreground hover:bg-accent",
      )}
    >
      {value || "-"}
    </button>
  )
}

function EditableCell({
  rowId, field, rawValue, displayValue, editCell, setEditCell, onSave, className,
}: {
  rowId: number; field: string
  rawValue: string        // 편집 시 input에 들어갈 값
  displayValue: string    // 표시용 (포맷 적용된 값)
  editCell: EditCell | null
  setEditCell: React.Dispatch<React.SetStateAction<EditCell | null>>
  onSave: (id: number, field: string, value: string) => void
  className?: string
}) {
  const isEditing = editCell?.id === rowId && editCell?.field === field

  function commit() {
    if (!editCell || !isEditing) return
    onSave(editCell.id, editCell.field, editCell.value)
  }

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={editCell.value}
        onChange={(e) => setEditCell((p) => p ? { ...p, value: e.target.value } : null)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditCell(null) }}
        className="h-7 text-xs px-1.5 py-0 w-full"
      />
    )
  }

  return (
    <span
      onClick={() => setEditCell({ id: rowId, field, value: rawValue })}
      title="클릭하여 수정"
      className={cn(
        "block w-full cursor-text rounded px-1 hover:bg-accent/60 transition-colors text-xs truncate min-h-[22px] leading-[22px]",
        className,
      )}
    >
      {displayValue || <span className="text-muted-foreground/30">-</span>}
    </span>
  )
}

function QuarterCell({
  rowId, value, onSave,
}: {
  rowId: number; value: string; onSave: (id: number, field: string, value: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onSave(rowId, "quarter", e.target.value)}
      className="h-7 w-full text-xs rounded border border-input bg-background px-1"
    >
      {QUARTER_OPTIONS.map((o) => <option key={o} value={o}>{o || "-"}</option>)}
    </select>
  )
}

const TH = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th className={cn("px-2 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap border-b border-border bg-muted", className)}>
    {children}
  </th>
)
const TD = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={cn("px-2 py-1.5 align-middle", className)}>{children}</td>
)

/* ─── 메인 ─────────────────────────────────────────────── */
export function TaxProgressView() {
  const [rows, setRows] = useState<TaxProgress[]>([])
  const [tradingCorps, setTradingCorps] = useState<MiniTradingCorp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 기간 필터
  const [filterYM, setFilterYM] = useState("")

  // 인라인 편집
  const [editCell, setEditCell] = useState<EditCell | null>(null)

  // 등록 다이얼로그
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_FORM)
  const [addSelectedCorp, setAddSelectedCorp] = useState<MiniTradingCorp | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState("")

  // 삭제
  const [deleteTarget, setDeleteTarget] = useState<TaxProgress | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 일괄 삭제
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [data, corps] = await Promise.all([
        api.get<TaxProgress[]>("/api/tax-progress"),
        api.get<MiniTradingCorp[]>("/api/trading-corporations"),
      ])
      setRows(Array.isArray(data) ? [...data].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : [])
      setTradingCorps(Array.isArray(corps) ? corps : [])
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "목록을 불러오지 못했습니다.")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  /* 거래 법인 조인 */
  function findCorp(name: string) { return tradingCorps.find((c) => c.name === name) }

  /* 인라인 셀 저장 */
  async function saveField(id: number, field: string, rawValue: string) {
    const row = rows.find((r) => r.id === id)
    if (!row) return
    const amountFields = ["outstandingAmount","clientTotal","salesAmount","totalCommission","commission","subsidiaryCommission"]
    const value = amountFields.includes(field) ? parseAmount(rawValue) : rawValue
    const updated: TaxProgress = { ...row, [field]: value }
    setRows((prev) => prev.map((r) => r.id === id ? updated : r))
    setEditCell(null)
    try {
      const result = await api.put<TaxProgress>(`/api/tax-progress/${id}`, buildRequest(updated))
      setRows((prev) => prev.map((r) => r.id === id ? result : r))
    } catch { setRows((prev) => prev.map((r) => r.id === id ? row : r)) }
  }

  /* 등록 */
  async function handleAdd() {
    if (!addForm.corpName.trim()) { setAddError("법인명을 입력해주세요."); return }
    setAddError(""); setAddLoading(true)
    try {
      const created = await api.post<TaxProgress>("/api/tax-progress", {
        corpName: addForm.corpName.trim(),
        pgName: addForm.pgName,
        yearMonth: addForm.yearMonth,
        category: addForm.category,
        quarter: addForm.quarter,
        outstandingAmount: parseAmount(addForm.outstandingAmount),
        clientTotal: parseAmount(addForm.clientTotal),
        salesAmount: parseAmount(addForm.salesAmount),
        erpUsed: addForm.erpUsed,
        totalCommission: parseAmount(addForm.totalCommission),
        commission: parseAmount(addForm.commission),
        salesCommissionConfirmed: addForm.salesCommissionConfirmed,
        invoiceIssued: addForm.invoiceIssued,
        subsidiaryCommission: parseAmount(addForm.subsidiaryCommission),
        subsidiaryInvoiceIssued: addForm.subsidiaryInvoiceIssued,
      })
      setRows((prev) => [...prev, created])
      setShowAdd(false)
      setAddForm(EMPTY_FORM)
    } catch (e) {
      setAddError(e instanceof ApiError ? e.message : "등록 실패")
    } finally { setAddLoading(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.delete(`/api/tax-progress/${deleteTarget.id}`)
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e) { alert(e instanceof ApiError ? e.message : "삭제 실패") }
    finally { setDeleteLoading(false) }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      for (const id of selectedIds) await api.delete(`/api/tax-progress/${id}`)
      setRows((prev) => prev.filter((r) => !selectedIds.has(r.id)))
      setSelectedIds(new Set()); setBulkMode(false); setBulkConfirm(false)
    } finally { setBulkDeleting(false) }
  }

  /* 필터링 */
  const displayRows = filterYM ? rows.filter((r) => r.yearMonth === filterYM) : rows

  /* 폼 헬퍼 */
  const setF = (k: keyof AddForm, v: string) => setAddForm((p) => ({ ...p, [k]: v }))

  /* OX select 공통 */
  const OxSelect = ({ field, value }: { field: keyof AddForm; value: string }) => (
    <select value={value} onChange={(e) => setF(field, e.target.value)}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
      <option value="">-</option>
      <option value="O">O</option>
      <option value="X">X</option>
    </select>
  )

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="mobile-hidden text-lg font-semibold">월 세무 진행현황</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "불러오는 중..." : `전체 ${rows.length}건 · 표시 ${displayRows.length}건`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 기간 검색 */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterYM((ym) => ym ? prevMonth(ym) : currentYM())}
              className="flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent transition-colors"
              title="이전 월"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <input
              type="month"
              value={filterYM}
              onChange={(e) => setFilterYM(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-sm text-foreground"
            />
            <button
              type="button"
              onClick={() => setFilterYM((ym) => ym ? nextMonth(ym) : currentYM())}
              className="flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent transition-colors"
              title="다음 월"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            {filterYM && (
              <button onClick={() => setFilterYM("")} className="flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {bulkMode ? (
            <>
              {selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setBulkConfirm(true)}>삭제 ({selectedIds.size}건)</Button>
              )}
              <Button variant="outline" size="sm" onClick={() => { setBulkMode(false); setSelectedIds(new Set()) }}>취소</Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setBulkMode(true)}>일괄 삭제</Button>
          )}
          <Button size="sm" onClick={() => {
            const now = new Date()
            const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
            const q = Math.ceil((now.getMonth() + 1) / 3)
            setShowAdd(true)
            setAddForm({ ...EMPTY_FORM, yearMonth: ym, quarter: `${q}분기` })
            setAddSelectedCorp(null)
            setAddError("")
          }}>
            <Plus className="mr-1.5 h-4 w-4" />항목 등록
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

      {/* 테이블 */}
      <div className="rounded-lg border border-border bg-card min-h-80 max-h-[calc(100svh-14rem)] overflow-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr>
              {bulkMode && <TH className="w-10"><input type="checkbox" className="h-4 w-4 rounded"
                checked={selectedIds.size === rows.length && rows.length > 0}
                onChange={(e) => setSelectedIds(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
              /></TH>}
              <TH className="min-w-[90px]">년월</TH>
              <TH className="min-w-[80px]">구분</TH>
              <TH className="min-w-[100px]">PG사</TH>
              <TH className="min-w-[130px]">법인명</TH>
              <TH className="min-w-[100px] text-right">미수 금액</TH>
              <TH className="min-w-[80px]">분기</TH>
              <TH className="min-w-[110px] text-right">거래처별 합계</TH>
              <TH className="min-w-[100px] text-right">매출액</TH>
              <TH className="min-w-[90px] text-center">ERP<br />사용 여부</TH>
              <TH className="min-w-[110px] text-right">수수료 합계</TH>
              <TH className="min-w-[100px] text-right">수수료</TH>
              <TH className="min-w-[110px] text-center">영업 수수료<br />입금 확인</TH>
              <TH className="min-w-[100px] text-center">계산서<br />발급 여부</TH>
              <TH className="min-w-[100px] text-right">수수료</TH>
              <TH className="min-w-[110px] text-center">하위 법인<br />계산서 발급</TH>
              <TH className="min-w-[120px]">하위 법인</TH>
              <TH className="min-w-[120px]">상품권 법인</TH>
              <TH className="w-9"></TH>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={19} className="py-16 text-center text-muted-foreground">불러오는 중...</td></tr>
            ) : displayRows.length === 0 ? (
              <tr><td colSpan={19} className="py-16 text-center text-muted-foreground">
                {filterYM ? `${filterYM} 에 해당하는 항목이 없습니다.` : "등록된 항목이 없습니다."}
              </td></tr>
            ) : displayRows.map((row) => {
              const corp = findCorp(row.corpName)
              const pgNames = corp?.pgs.map((p) => p.pgCompanyName).join(", ") || "-"
              const subNames = corp?.subsidiaries.map((s) => s.name).join(", ") || "-"
              const giftNames = corp?.giftCorps.map((g) => g.name).join(", ") || "-"
              const amtRaw = (v: number | null) => v != null ? String(v) : ""
              const amtFmt = (v: number | null) => v != null ? v.toLocaleString("ko-KR") : ""
              return (
                <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                  {bulkMode && <TD><input type="checkbox" className="h-4 w-4 rounded" checked={selectedIds.has(row.id)}
                    onChange={(e) => setSelectedIds((prev) => { const n = new Set(prev); e.target.checked ? n.add(row.id) : n.delete(row.id); return n })}
                  /></TD>}
                  {/* 년월 */}
                  <TD><EditableCell rowId={row.id} field="yearMonth" rawValue={row.yearMonth} displayValue={row.yearMonth}
                    editCell={editCell} setEditCell={setEditCell} onSave={saveField} /></TD>
                  {/* 구분 */}
                  <TD><EditableCell rowId={row.id} field="category" rawValue={row.category} displayValue={row.category}
                    editCell={editCell} setEditCell={setEditCell} onSave={saveField} /></TD>
                  {/* PG사 */}
                  <TD><EditableCell rowId={row.id} field="pgName" rawValue={row.pgName} displayValue={row.pgName || pgNames}
                    editCell={editCell} setEditCell={setEditCell} onSave={saveField} /></TD>
                  {/* 법인명 */}
                  <TD><EditableCell rowId={row.id} field="corpName" rawValue={row.corpName} displayValue={row.corpName}
                    editCell={editCell} setEditCell={setEditCell} onSave={saveField} className="font-medium" /></TD>
                  {/* 미수 금액 */}
                  <TD className="text-right"><EditableCell rowId={row.id} field="outstandingAmount"
                    rawValue={amtRaw(row.outstandingAmount)} displayValue={amtFmt(row.outstandingAmount)}
                    editCell={editCell} setEditCell={setEditCell} onSave={saveField} className="text-right" /></TD>
                  {/* 분기 */}
                  <TD><QuarterCell rowId={row.id} value={row.quarter} onSave={saveField} /></TD>
                  {/* 거래처별 합계 */}
                  <TD className="text-right"><EditableCell rowId={row.id} field="clientTotal"
                    rawValue={amtRaw(row.clientTotal)} displayValue={amtFmt(row.clientTotal)}
                    editCell={editCell} setEditCell={setEditCell} onSave={saveField} className="text-right" /></TD>
                  {/* 매출액 */}
                  <TD className="text-right"><EditableCell rowId={row.id} field="salesAmount"
                    rawValue={amtRaw(row.salesAmount)} displayValue={amtFmt(row.salesAmount)}
                    editCell={editCell} setEditCell={setEditCell} onSave={saveField} className="text-right" /></TD>
                  {/* ERP 사용 여부 */}
                  <TD className="text-center"><OxBadge value={row.erpUsed} onClick={() => { const n = cycleOX(row.erpUsed); saveField(row.id, "erpUsed", n) }} /></TD>
                  {/* 수수료 합계 */}
                  <TD className="text-right"><EditableCell rowId={row.id} field="totalCommission"
                    rawValue={amtRaw(row.totalCommission)} displayValue={amtFmt(row.totalCommission)}
                    editCell={editCell} setEditCell={setEditCell} onSave={saveField} className="text-right" /></TD>
                  {/* 수수료 */}
                  <TD className="text-right"><EditableCell rowId={row.id} field="commission"
                    rawValue={amtRaw(row.commission)} displayValue={amtFmt(row.commission)}
                    editCell={editCell} setEditCell={setEditCell} onSave={saveField} className="text-right" /></TD>
                  {/* 영업 수수료 입금 확인 */}
                  <TD className="text-center"><OxBadge value={row.salesCommissionConfirmed} onClick={() => saveField(row.id, "salesCommissionConfirmed", cycleOX(row.salesCommissionConfirmed))} /></TD>
                  {/* 계산서 발급 여부 */}
                  <TD className="text-center"><OxBadge value={row.invoiceIssued} onClick={() => saveField(row.id, "invoiceIssued", cycleOX(row.invoiceIssued))} /></TD>
                  {/* 수수료 (하위 법인) */}
                  <TD className="text-right"><EditableCell rowId={row.id} field="subsidiaryCommission"
                    rawValue={amtRaw(row.subsidiaryCommission)} displayValue={amtFmt(row.subsidiaryCommission)}
                    editCell={editCell} setEditCell={setEditCell} onSave={saveField} className="text-right" /></TD>
                  {/* 하위 법인 계산서 발급 */}
                  <TD className="text-center"><OxBadge value={row.subsidiaryInvoiceIssued} onClick={() => saveField(row.id, "subsidiaryInvoiceIssued", cycleOX(row.subsidiaryInvoiceIssued))} /></TD>
                  {/* 하위 법인 */}
                  <TD><span className="text-xs">{subNames}</span></TD>
                  {/* 상품권 법인 */}
                  <TD><span className="text-xs">{giftNames}</span></TD>
                  {/* 삭제 */}
                  <TD><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(row)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive/60" />
                  </Button></TD>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 등록 다이얼로그 */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) setShowAdd(false) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>항목 등록</DialogTitle></DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-5 py-2">
              {/* 기본 정보 */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">기본 정보</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label>법인명 *</Label>
                    <CorpSearchCombobox
                      corps={tradingCorps}
                      value={addForm.corpName}
                      onSelect={(corp) => {
                        setAddSelectedCorp(corp)
                        setAddForm((f) => ({
                          ...f,
                          corpName: corp.name,
                          commission: corp.commission != null ? String(corp.commission) : f.commission,
                        }))
                      }}
                    />
                    {addSelectedCorp && addSelectedCorp.pgs.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1.5">PG사 선택 <span className="text-muted-foreground/60">(클릭하여 선택)</span></p>
                        <div className="flex flex-wrap gap-1.5">
                          {addSelectedCorp.pgs.map((pg) => {
                            const selected = addForm.pgName === pg.pgCompanyName
                            return (
                              <button
                                key={pg.id}
                                type="button"
                                onClick={() => setF("pgName", selected ? "" : pg.pgCompanyName)}
                                className={cn(
                                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
                                  selected
                                    ? "bg-violet-600 text-white ring-2 ring-violet-400 ring-offset-1"
                                    : "bg-violet-100 text-violet-700 hover:bg-violet-200",
                                )}
                              >
                                {pg.pgCompanyName}
                              </button>
                            )
                          })}
                        </div>
                        {addForm.pgName && (
                          <p className="mt-1 text-xs text-violet-600 font-medium">선택됨: {addForm.pgName}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>년월</Label>
                    <input type="month" value={addForm.yearMonth} onChange={(e) => setF("yearMonth", e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>구분</Label>
                    <Input value={addForm.category} onChange={(e) => setF("category", e.target.value)} placeholder="구분 입력" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>분기</Label>
                    <select value={addForm.quarter} onChange={(e) => setF("quarter", e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {QUARTER_OPTIONS.map((o) => <option key={o} value={o}>{o || "선택 안함"}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* 금액 */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">금액</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>미수 금액</Label>
                    <Input type="number" value={addForm.outstandingAmount} onChange={(e) => setF("outstandingAmount", e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>거래처별 합계</Label>
                    <Input type="number" value={addForm.clientTotal} onChange={(e) => setF("clientTotal", e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>매출액</Label>
                    <Input type="number" value={addForm.salesAmount} onChange={(e) => setF("salesAmount", e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>수수료 합계</Label>
                    <Input type="number" value={addForm.totalCommission} onChange={(e) => setF("totalCommission", e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>수수료</Label>
                    <Input type="number" value={addForm.commission} onChange={(e) => setF("commission", e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>수수료 (하위 법인)</Label>
                    <Input type="number" value={addForm.subsidiaryCommission} onChange={(e) => setF("subsidiaryCommission", e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* 확인 사항 */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">확인 사항</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>ERP 사용 여부</Label>
                    <OxSelect field="erpUsed" value={addForm.erpUsed} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>영업 수수료 입금 확인</Label>
                    <OxSelect field="salesCommissionConfirmed" value={addForm.salesCommissionConfirmed} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>계산서 발급 여부</Label>
                    <OxSelect field="invoiceIssued" value={addForm.invoiceIssued} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>하위 법인 계산서 발급</Label>
                    <OxSelect field="subsidiaryInvoiceIssued" value={addForm.subsidiaryInvoiceIssued} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {addError && <p className="text-xs text-destructive mt-1">{addError}</p>}
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>취소</Button>
            <Button disabled={addLoading} onClick={handleAdd}>{addLoading ? "등록 중..." : "등록"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>항목 삭제</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            <span className="font-semibold text-foreground">{deleteTarget?.corpName}</span> 항목을 삭제하시겠습니까?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button variant="destructive" disabled={deleteLoading} onClick={handleDelete}>{deleteLoading ? "삭제 중..." : "삭제"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄 삭제 확인 */}
      <Dialog open={bulkConfirm} onOpenChange={(o) => { if (!o) setBulkConfirm(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>일괄 삭제</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            선택한 <span className="font-semibold text-foreground">{selectedIds.size}건</span>을 삭제하시겠습니까?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirm(false)}>취소</Button>
            <Button variant="destructive" disabled={bulkDeleting} onClick={handleBulkDelete}>{bulkDeleting ? "삭제 중..." : "삭제"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
