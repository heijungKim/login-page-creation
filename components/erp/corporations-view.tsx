"use client"

import React, { useMemo, useState } from "react"
import { MessageSquareText, Plus, Trash2 } from "lucide-react"
import { ExcelUploadButton, type ExcelColumn } from "@/components/erp/excel-upload-button"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CorporationFormDialog,
  ShareholdersEditor,
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
  formatResidentNo,
  type Corporation,
  type Shareholder,
} from "@/components/erp/corporation-form-dialog"
import { useCorporations } from "@/components/erp/corporations-context"

const statusStyles: Record<string, string> = {
  활성: "bg-blue-100 text-blue-700",
  진행중: "bg-yellow-100 text-yellow-700",
  대기중: "bg-gray-200 text-gray-700",
  중지: "bg-red-100 text-red-700",
  폐업: "bg-stone-300 text-stone-700",
}

function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] ?? "bg-muted text-muted-foreground"
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{status}</span>
}

const categoryStyles: Record<string, string> = {
  "운영 법인": "bg-emerald-100 text-emerald-700",
  "하위 법인": "bg-sky-100 text-sky-700",
  "상품권 법인": "bg-orange-100 text-orange-700",
  "계약법인(영세)": "bg-slate-200 text-slate-700",
}

function CategoryBadge({ category }: { category: string }) {
  const style = categoryStyles[category] ?? "bg-muted text-muted-foreground"
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{category}</span>
}

function parseDate(raw: string | undefined | null): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // 한국어 형식: 2025년09월17일, 2025년9월2일, 2026월 06월 23일(오타 포함)
  const m = s.match(/(\d{4})[년월]\s*(\d{1,2})월\s*(\d{1,2})일/)
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`
  return null
}

function parseCategory(raw: string): string {
  const v = (raw ?? "").trim()
  const exact: Record<string, string> = {
    "운영법인": "운영 법인", "운영 법인": "운영 법인",
    "계약법인": "계약법인(영세)", "계약법인(영세)": "계약법인(영세)", "영세법인": "계약법인(영세)",
    "하위법인": "하위 법인", "하위 법인": "하위 법인",
    "상품권법인": "상품권 법인", "상품권 법인": "상품권 법인",
  }
  if (exact[v]) return exact[v]
  if (v.includes("영세")) return "계약법인(영세)"
  if (v.includes("하위")) return "하위 법인"
  if (v.includes("상품권")) return "상품권 법인"
  if (v.includes("운영")) return "운영 법인"
  return "운영 법인"
}

type Column = {
  key: keyof Corporation
  label: string
  minWidth?: string
  filterOptions?: string[]
  sticky?: boolean
}

const columns: Column[] = [
  { key: "category", label: "구분", minWidth: "130px", filterOptions: CATEGORY_OPTIONS, sticky: true },
  { key: "intro", label: "소개", minWidth: "120px" },
  { key: "status", label: "상태", minWidth: "130px", filterOptions: STATUS_OPTIONS, sticky: true },
  { key: "name", label: "법인명", minWidth: "140px", sticky: true },
  { key: "region", label: "지역", minWidth: "120px" },
  { key: "openDate", label: "개업일", minWidth: "120px" },
  { key: "startDate", label: "개시일", minWidth: "120px" },
  { key: "bizNo", label: "사업자 번호", minWidth: "130px" },
  { key: "corpNo", label: "법인 번호", minWidth: "140px" },
  { key: "ceo", label: "법인 대표", minWidth: "100px" },
  { key: "auditorDirector", label: "감사/사내이사", minWidth: "130px" },
  { key: "shareholders", label: "주주", minWidth: "160px" },
  { key: "residentNo", label: "주민번호", minWidth: "140px" },
  { key: "phone", label: "휴대폰 번호", minWidth: "130px" },
  { key: "phonePlan", label: "휴대폰 요금제", minWidth: "120px" },
  { key: "bizAddress", label: "사업 소재지", minWidth: "200px" },
  { key: "bizEmail", label: "사업자 메일", minWidth: "180px" },
  { key: "corpAccountNo", label: "법인계좌", minWidth: "170px" },
  { key: "certCorp", label: "법인 인증서", minWidth: "160px" },
  { key: "certPersonal", label: "개인 인증서", minWidth: "160px" },
  { key: "certExpiry", label: "인증서 만료일", minWidth: "120px" },
  { key: "iros", label: "등기소 아이디", minWidth: "130px" },
  { key: "irosPw", label: "등기소 비밀번호", minWidth: "120px" },
  { key: "irosUserNo", label: "사용자 등록번호", minWidth: "130px" },
  { key: "hometaxId", label: "홈택스 아이디", minWidth: "130px" },
  { key: "hometaxPw", label: "홈택스 비밀번호", minWidth: "120px" },
  { key: "note", label: "비고", minWidth: "160px" },
  { key: "registeredAt", label: "등록일", minWidth: "120px" },
]

export function CorporationsView() {
  const { rows, loading, error, refresh, createCorporation, updateCorporation, removeCorporation } = useCorporations()
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [detail, setDetail] = useState<Corporation | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Corporation | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [memoPopup, setMemoPopup] = useState<string | null>(null)
  const [memoTooltip, setMemoTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // 좌측 고정(sticky) 열의 누적 left 위치 (sticky: true 컬럼만)
  const stickyOffsets = useMemo(() => {
    const offsets: Record<string, number> = {}
    let acc = 0
    columns.forEach((col) => {
      if (col.sticky) {
        offsets[col.key as string] = acc
        acc += parseInt(col.minWidth ?? "120", 10)
      }
    })
    return offsets
  }, [])

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      for (const id of selectedIds) {
        await removeCorporation(id)
      }
      setSelectedIds(new Set())
      setBulkMode(false)
      setBulkConfirm(false)
    } catch (e) {
      // 에러는 무시하고 계속
    } finally {
      setBulkDeleting(false)
    }
  }

  async function handleSubmit(corp: Corporation) {
    await createCorporation(corp)
  }

  async function handleDelete() {
    if (!detail?.id) return
    setSubmitting(true)
    try {
      await removeCorporation(detail.id)
      setDetail(null)
      setDeleteConfirm(false)
      setIsEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "법인 삭제에 실패했습니다.")
      setDeleteConfirm(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSave() {
    if (!editForm?.id || !detail) return
    setSaveError(null)
    setSubmitting(true)
    try {
      const updated = await updateCorporation(editForm.id, editForm)
      setDetail(updated)
      setIsEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "법인 수정에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  function setEdit<K extends keyof Corporation>(key: K, value: Corporation[K]) {
    setEditForm((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function shareholdersText(row: Corporation) {
    return (row.shareholders || [])
      .filter((s) => s.name)
      .map((s) => (s.equity ? `${s.name}(${s.equity})` : s.name))
      .join(", ")
  }

  const activeRows = useMemo(() => rows.filter((r) => r.status !== "폐업"), [rows])

  const filteredRows = useMemo(() => {
    const categoryOrder = ["운영 법인", "계약법인(영세)", "하위 법인", "상품권 법인"]
    const statusOrder = ["활성", "진행중", "대기중", "중지"]
    const orderIndex = (list: string[], value: string) => {
      const i = list.indexOf(value)
      return i === -1 ? list.length : i
    }

    return activeRows
      .filter((row) =>
        columns.every((col) => {
          const term = filters[col.key]?.trim()
          if (!term) return true
          if (col.filterOptions) {
            return String(row[col.key] ?? "") === term
          }
          const cellText = col.key === "shareholders"
            ? shareholdersText(row)
            : String(row[col.key] ?? "")
          return cellText.toLowerCase().includes(term.toLowerCase())
        }),
      )
      .sort((a, b) => {
        const catDiff = orderIndex(categoryOrder, a.category) - orderIndex(categoryOrder, b.category)
        if (catDiff !== 0) return catDiff
        const stDiff = orderIndex(statusOrder, a.status) - orderIndex(statusOrder, b.status)
        if (stDiff !== 0) return stDiff
        return (b.registeredAt ?? "").localeCompare(a.registeredAt ?? "")
      })
  }, [activeRows, filters])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="mobile-hidden text-xl font-semibold tracking-tight text-foreground">법인 관리</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "불러오는 중..." : `전체 ${activeRows.length}개 법인 · 현재 ${filteredRows.length}개 표시`}
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
          <ExcelUploadButton
            templateName="법인"
            columns={[
              { key: "category", label: "구분", required: true, example: "운영 법인" },
              { key: "intro", label: "소개", example: "주요 사업 내용" },
              { key: "name", label: "법인명", required: true, example: "한빛컴퍼니" },
              { key: "region", label: "지역", example: "서울" },
              { key: "openDate", label: "개업연월일", example: "2020-01-01" },
              { key: "startDate", label: "개시일", example: "2020-03-01" },
              { key: "bizNo", label: "사업자번호", example: "123-81-45678" },
              { key: "corpNo", label: "법인번호", example: "110111-1234567" },
              { key: "ceo", label: "법인대표", example: "홍길동" },
              { key: "auditorDirector", label: "감사/사내이사", example: "김감사" },
              { key: "birthDate", label: "생년월일", example: "1990-01-01" },
              { key: "phone", label: "휴대폰번호", example: "010-1234-5678" },
              { key: "phonePlan", label: "요금제", example: "LTE 데이터 무제한" },
              { key: "bizAddress", label: "사업 소재지", example: "서울시 강남구 테헤란로 1" },
              { key: "bizEmail", label: "사업자 메일주소", example: "corp@email.com" },
            ] satisfies ExcelColumn[]}
            onRows={async (rows) => {
              let success = 0
              const failed: Array<{ row: number; reason: string }> = []
              for (let i = 0; i < rows.length; i++) {
                const r = rows[i]
                try {
                  await api.post("/api/corporations", {
                    category: parseCategory(r.category),
                    intro: r.intro || "",
                    name: r.name,
                    bizNo: r.bizNo || "",
                    corpNo: r.corpNo || "",
                    ceo: r.ceo || "",
                    region: r.region || "",
                    openDate: parseDate(r.openDate),
                    startDate: parseDate(r.startDate),
                    auditorDirector: r.auditorDirector || "",
                    birthDate: r.birthDate || "",
                    phone: (r.phone?.match(/[\d]{2,4}[-\s]?\d{3,4}[-\s]?\d{4}/) ?? [""])[0].replace(/\s/g, "-"),
                    phonePlan: r.phonePlan || "",
                    bizAddress: r.bizAddress || "",
                    bizEmail: (r.bizEmail?.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/) ?? [""])[0],
                    status: "활성",
                    account: "", certCorp: "", iros: "", hometaxId: "", note: "",
                    shareholder: "",
                    progressMemo: "", certPersonal: "",
                    certExpiry: null, irosPw: "", irosUserNo: "", hometaxPw: "",
                  })
                  success++
                } catch (e) { failed.push({ row: i + 2, reason: e instanceof ApiError ? e.message : "오류" }) }
              }
              await refresh()
              return { success, failed }
            }}
          />
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5" disabled={submitting}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            법인 등록
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="min-h-80 max-h-[calc(100svh-14rem)] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-muted">
                <tr className="text-left text-muted-foreground">
                  {bulkMode && (
                    <th className="w-10 px-3 py-2.5 border-b border-border bg-muted">
                      <input type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={selectedIds.size === filteredRows.length && filteredRows.length > 0}
                        onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredRows.map((r) => r.id!)) : new Set())}
                      />
                    </th>
                  )}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "border-b border-border bg-muted px-3 py-2.5 align-middle font-medium",
                        col.sticky && "sm:sticky sm:z-10",
                      )}
                      style={{
                        minWidth: col.minWidth,
                        left: col.sticky ? stickyOffsets[col.key as string] : undefined,
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
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
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
                    <td colSpan={columns.length} className="h-64 px-4 py-10 text-center text-muted-foreground">
                      조건에 맞는 법인이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id ?? row.corpNo}
                      className="group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-accent/50"
                      onClick={() => setDetail(row)}
                    >
                      {bulkMode && (
                        <td className="w-10 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox"
                            className="h-4 w-4 rounded border-border"
                            checked={selectedIds.has(row.id!)}
                            onChange={(e) => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev)
                                if (e.target.checked) { next.add(row.id!) } else { next.delete(row.id!) }
                                return next
                              })
                            }}
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            "whitespace-nowrap px-3 py-2.5 text-foreground",
                            col.sticky && "sm:sticky sm:z-10 bg-card group-hover:bg-accent",
                          )}
                          style={{ left: col.sticky ? stickyOffsets[col.key as string] : undefined }}
                        >
                          {col.key === "status" ? (
                            <div className="flex items-center gap-1.5">
                              <StatusBadge status={row.status} />
                              {row.status === "진행중" && row.progressMemo && (
                                <button
                                  type="button"
                                  className="text-yellow-600 hover:text-yellow-800 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); setMemoPopup(row.progressMemo) }}
                                  onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMemoTooltip({ text: row.progressMemo, x: r.left + r.width / 2, y: r.top }) }}
                                  onMouseLeave={() => setMemoTooltip(null)}
                                >
                                  <MessageSquareText className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ) : col.key === "category" ? (
                            <CategoryBadge category={row.category} />
                          ) : col.key === "name" ? (
                            <span className="font-medium text-foreground">{row.name}</span>
                          ) : col.key === "shareholders" ? (
                            <span>{shareholdersText(row) || "-"}</span>
                          ) : (
                            <span className={col.key.startsWith("note") ? "text-muted-foreground" : undefined}>
                              {String(row[col.key] ?? "") || "-"}
                            </span>
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

      <CorporationFormDialog open={open} onOpenChange={setOpen} onSubmit={handleSubmit} />

      {/* 일괄 삭제 확인 다이얼로그 */}
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

      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>법인 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{detail?.name}</span> 법인을 삭제합니다.<br />
            삭제된 데이터는 복구할 수 없습니다.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={submitting} onClick={() => setDeleteConfirm(false)}>취소</Button>
            <Button variant="destructive" disabled={submitting} onClick={handleDelete}>
              {submitting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!memoPopup} onOpenChange={(o) => { if (!o) setMemoPopup(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">진행 메모</DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm text-foreground">{memoPopup}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemoPopup(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setIsEditing(false); setDeleteConfirm(false); setSaveError(null) } }}>
        <DialogContent className="sm:max-h-[90svh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-base font-semibold">법인 상세 정보</DialogTitle>
          </DialogHeader>

          {detail && (
            <>
              <div className="flex max-h-[calc(75dvh-9rem)] sm:max-h-[calc(90svh-9rem)] flex-col overflow-y-auto px-6 py-5">
                <div className="flex flex-col gap-4">

                  {/* 기본 정보 – 수정/저장/취소 버튼 위치 */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
                      <div className="flex gap-2">
                        {isEditing && editForm ? (
                          <>
                            <Button variant="outline" size="sm" className="h-8 px-3" disabled={submitting} onClick={() => setIsEditing(false)}>취소</Button>
                            <Button size="sm" className="h-8 px-3" disabled={submitting} onClick={handleSave}>{submitting ? "저장 중..." : "저장"}</Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => { setEditForm({ ...detail }); setIsEditing(true) }}>수정</Button>
                        )}
                      </div>
                    </div>
                    {isEditing && editForm ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">구분</Label>
                          <Select value={editForm.category} onValueChange={(v) => setEdit("category", v ?? "")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{CATEGORY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <EF label="법인명" value={editForm.name} onChange={(v) => setEdit("name", v)} />
                        <EF label="소개" value={editForm.intro} onChange={(v) => setEdit("intro", v)} />
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">상태</Label>
                          <Select value={editForm.status} onValueChange={(v) => setEdit("status", v ?? "")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        {editForm.status === "진행중" && (
                          <EF label="진행 메모" value={editForm.progressMemo} onChange={(v) => setEdit("progressMemo", v)} multiline className="col-span-full" />
                        )}
                        {editForm.status === "폐업" && (
                          <EF label="폐업일" type="date" value={editForm.closeDate} onChange={(v) => setEdit("closeDate", v)} />
                        )}
                        <EF label="지역" value={editForm.region} onChange={(v) => setEdit("region", v)} />
                        <EF label="개업일" type="date" value={editForm.openDate} onChange={(v) => setEdit("openDate", v)} />
                        <EF label="개시일" type="date" value={editForm.startDate} onChange={(v) => setEdit("startDate", v)} />
                        <EF label="사업자 번호" value={editForm.bizNo} onChange={(v) => setEdit("bizNo", v)} />
                        <EF label="법인 번호" value={editForm.corpNo} onChange={(v) => setEdit("corpNo", v)} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                        <DetailField label="구분"><CategoryBadge category={detail.category} /></DetailField>
                        <DetailField label="법인명" value={detail.name} />
                        <DetailField label="소개" value={detail.intro} />
                        <DetailField label="상태">
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={detail.status} />
                            {detail.status === "진행중" && detail.progressMemo && (
                              <button
                                type="button"
                                className="text-yellow-600 hover:text-yellow-800 transition-colors"
                                onClick={() => setMemoPopup(detail.progressMemo)}
                                onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMemoTooltip({ text: detail.progressMemo, x: r.left + r.width / 2, y: r.top }) }}
                                onMouseLeave={() => setMemoTooltip(null)}
                              >
                                <MessageSquareText className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </DetailField>
                        {detail.status === "폐업" && (
                          <DetailField label="폐업일" value={detail.closeDate} />
                        )}
                        <DetailField label="지역" value={detail.region} />
                        <DetailField label="개업일" value={detail.openDate} />
                        <DetailField label="개시일" value={detail.startDate} />
                        <DetailField label="사업자 번호" value={detail.bizNo} />
                        <DetailField label="법인 번호" value={detail.corpNo} />
                      </div>
                    )}
                  </div>

                  <EditSection title="대표 / 임원 정보">
                    {isEditing && editForm ? (
                      <>
                        <EF label="법인 대표" value={editForm.ceo} onChange={(v) => setEdit("ceo", v)} />
                        <EF label="감사/사내이사" value={editForm.auditorDirector} onChange={(v) => setEdit("auditorDirector", v)} />
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">주민번호</Label>
                          <Input
                            value={editForm.residentNo}
                            onChange={(e) => setEdit("residentNo", formatResidentNo(e.target.value))}
                            placeholder="000000-0000000"
                            maxLength={14}
                          />
                        </div>
                        <EF label="휴대폰 번호" value={editForm.phone} onChange={(v) => setEdit("phone", v)} />
                        <EF label="휴대폰 요금제" value={editForm.phonePlan} onChange={(v) => setEdit("phonePlan", v)} multiline className="col-span-full" />
                        <ShareholdersEditor
                          shareholders={editForm.shareholders}
                          onChange={(s) => setEdit("shareholders", s)}
                        />
                      </>
                    ) : (
                      <>
                        <DetailField label="법인 대표" value={detail.ceo} />
                        <DetailField label="감사/사내이사" value={detail.auditorDirector} />
                        <DetailField label="주민번호" value={detail.residentNo} />
                        <DetailField label="휴대폰 번호" value={detail.phone} />
                        <div className="col-span-full flex flex-col gap-0.5">
                          <span className="text-[11px] text-muted-foreground">휴대폰 요금제</span>
                          <span className="whitespace-pre-wrap text-sm font-medium text-foreground">{detail.phonePlan || "-"}</span>
                        </div>
                        <div className="col-span-full flex flex-col gap-1.5">
                          <span className="text-[11px] text-muted-foreground">주주</span>
                          {(detail.shareholders || []).filter((s) => s.name).length === 0 ? (
                            <span className="text-sm font-medium text-foreground">-</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {detail.shareholders.filter((s) => s.name).map((s, i) => (
                                <span key={i} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-sm">
                                  <span className="font-medium">{s.name}</span>
                                  {s.equity && <span className="text-muted-foreground">{s.equity}</span>}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </EditSection>

                  <EditSection title="사업장 정보">
                    {isEditing && editForm ? (
                      <>
                        <EF label="사업 소재지" value={editForm.bizAddress} onChange={(v) => setEdit("bizAddress", v)} className="col-span-2" />
                        <EF label="사업자 메일" value={editForm.bizEmail} onChange={(v) => setEdit("bizEmail", v)} />
                      </>
                    ) : (
                      <>
                        <DetailField label="사업 소재지" value={detail.bizAddress} className="col-span-2" />
                        <DetailField label="사업자 메일" value={detail.bizEmail} />
                      </>
                    )}
                  </EditSection>

                  <EditSection title="법인 계좌">
                    {isEditing && editForm ? (
                      <>
                        <EF label="은행" value={editForm.corpBankName} onChange={(v) => setEdit("corpBankName", v)} />
                        <EF label="계좌번호" value={editForm.corpAccountNo} onChange={(v) => setEdit("corpAccountNo", v)} />
                        <EF label="계좌 비밀번호" value={editForm.corpAccountPw} onChange={(v) => setEdit("corpAccountPw", v)} />
                      </>
                    ) : (
                      <>
                        <DetailField label="은행" value={detail.corpBankName} />
                        <DetailField label="계좌번호" value={detail.corpAccountNo} />
                        <DetailField label="계좌 비밀번호" value={detail.corpAccountPw} />
                      </>
                    )}
                  </EditSection>

                  <EditSection title="개인 계좌">
                    {isEditing && editForm ? (
                      <>
                        <EF label="은행" value={editForm.personalBankName} onChange={(v) => setEdit("personalBankName", v)} />
                        <EF label="계좌번호" value={editForm.personalAccountNo} onChange={(v) => setEdit("personalAccountNo", v)} />
                        <EF label="계좌 비밀번호" value={editForm.personalAccountPw} onChange={(v) => setEdit("personalAccountPw", v)} />
                      </>
                    ) : (
                      <>
                        <DetailField label="은행" value={detail.personalBankName} />
                        <DetailField label="계좌번호" value={detail.personalAccountNo} />
                        <DetailField label="계좌 비밀번호" value={detail.personalAccountPw} />
                      </>
                    )}
                  </EditSection>

                  <EditSection title="인증서">
                    {isEditing && editForm ? (
                      <>
                        <EF label="법인 인증서" value={editForm.certCorp} onChange={(v) => setEdit("certCorp", v)} />
                        <EF label="개인 인증서" value={editForm.certPersonal} onChange={(v) => setEdit("certPersonal", v)} />
                        <EF label="인증서 만료일" type="date" value={editForm.certExpiry} onChange={(v) => setEdit("certExpiry", v)} />
                      </>
                    ) : (
                      <>
                        <DetailField label="법인 인증서" value={detail.certCorp} />
                        <DetailField label="개인 인증서" value={detail.certPersonal} />
                        <DetailField label="인증서 만료일" value={detail.certExpiry} />
                      </>
                    )}
                  </EditSection>

                  <EditSection title="인터넷 등기소">
                    {isEditing && editForm ? (
                      <>
                        <EF label="아이디" value={editForm.iros} onChange={(v) => setEdit("iros", v)} />
                        <EF label="비밀번호" value={editForm.irosPw} onChange={(v) => setEdit("irosPw", v)} />
                        <EF label="사용자 등록번호" value={editForm.irosUserNo} onChange={(v) => setEdit("irosUserNo", v)} />
                      </>
                    ) : (
                      <>
                        <DetailField label="아이디" value={detail.iros} />
                        <DetailField label="비밀번호" value={detail.irosPw} />
                        <DetailField label="사용자 등록번호" value={detail.irosUserNo} />
                      </>
                    )}
                  </EditSection>

                  <EditSection title="홈택스 계정">
                    {isEditing && editForm ? (
                      <>
                        <EF label="홈택스 아이디" value={editForm.hometaxId} onChange={(v) => setEdit("hometaxId", v)} />
                        <EF label="홈택스 비밀번호" value={editForm.hometaxPw} onChange={(v) => setEdit("hometaxPw", v)} />
                      </>
                    ) : (
                      <>
                        <DetailField label="홈택스 아이디" value={detail.hometaxId} />
                        <DetailField label="홈택스 비밀번호" value={detail.hometaxPw} />
                      </>
                    )}
                  </EditSection>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">비고</Label>
                    {isEditing && editForm ? (
                      <Textarea value={editForm.note} onChange={(e) => setEdit("note", e.target.value)} rows={3} />
                    ) : (
                      <span className="text-sm text-foreground">{detail.note || "-"}</span>
                    )}
                  </div>

                  {detail.registeredAt && !isEditing && (
                    <p className="text-xs text-muted-foreground">등록일: {detail.registeredAt}</p>
                  )}
                </div>
              </div>
              {saveError && (
                <div className="border-t border-destructive/20 bg-destructive/5 px-6 py-3">
                  <p className="text-sm text-destructive">{saveError}</p>
                </div>
              )}
              <DialogFooter className="border-t border-border px-6 py-5">
                <div className="flex w-full items-center gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                    disabled={isEditing || submitting}
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => { setDetail(null); setIsEditing(false) }}>닫기</Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {memoTooltip && (
        <div
          className="pointer-events-none fixed z-[100] whitespace-pre-wrap rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg"
          style={{ top: memoTooltip.y - 8, left: memoTooltip.x, transform: "translate(-50%, -100%)", minWidth: 160, maxWidth: 320 }}
        >
          {memoTooltip.text}
        </div>
      )}
    </div>
  )
}

function DetailField({
  label,
  value,
  children,
  className,
}: {
  label: string
  value?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {children ?? <span className="text-sm font-medium text-foreground">{value || "-"}</span>}
    </div>
  )
}

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-border p-4">
      <legend className="px-2 text-sm font-semibold text-foreground">{title}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  )
}

function EF({
  label,
  value,
  onChange,
  type = "text",
  className,
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  className?: string
  multiline?: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}
