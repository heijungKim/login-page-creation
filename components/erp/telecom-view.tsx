"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarClock, Check, CheckCheck, ChevronLeft, ChevronRight, ExternalLink, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react"
import { ExcelUploadButton, type ExcelColumn } from "@/components/erp/excel-upload-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { cn, toCommaNumber } from "@/lib/utils"
import { ApiError, api } from "@/lib/api"
import { ChangeHistory } from "@/components/erp/change-history"
import { CopyText } from "@/components/erp/copy-text"
import { useCorporations } from "@/components/erp/corporations-context"

type Telecom = {
  id: number
  corporationId: number | null
  owner: string
  phone: string
  carrier: string
  cost: number
  useStatus?: string
  balance: number
  siteUrl?: string
  // 명의자와 대표가 같은 법인명 (화면에서 계산, 쉼표 구분)
  corpNames?: string
  loginId?: string
  loginPw?: string
  paymentDay: string
  yearMonth?: string
  paidThisMonth?: boolean
  paidDateThisMonth?: string | null
  bankName: string
  accountNo: string
  memo: string
  registeredAt: string
}

type TelecomPayment = {
  id: number
  telecomId: number
  paidDate: string
  paidAmount: number
  memo: string
  createdAt: string
}

type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

const CARRIER_OPTIONS = ["SKT", "KT", "LG U+", "알뜰폰(SKT)", "알뜰폰(KT)", "알뜰폰(LG)", "기타"]

const carrierStyles: Record<string, string> = {
  "SKT": "bg-red-100 text-red-700",
  "KT": "bg-sky-100 text-sky-700",
  "LG U+": "bg-violet-100 text-violet-700",
  "알뜰폰(SKT)": "bg-rose-100 text-rose-600",
  "알뜰폰(KT)": "bg-cyan-100 text-cyan-700",
  "알뜰폰(LG)": "bg-purple-100 text-purple-600",
  "기타": "bg-slate-200 text-slate-600",
}

type Column = {
  key: keyof Telecom
  label: string
  minWidth?: string
  filterOptions?: string[]
}

const USE_STATUS_OPTIONS = ["사용", "미사용"]

// 법인 열은 고정 너비(줄바꿈), 앞의 두 열(법인·명의자)은 가로 스크롤 시 고정
const CORP_COL_WIDTH = 200
const columns: Column[] = [
  { key: "corpNames", label: "법인", minWidth: `${CORP_COL_WIDTH}px` },
  { key: "owner", label: "명의자", minWidth: "110px" },
  { key: "useStatus", label: "상태", minWidth: "100px", filterOptions: USE_STATUS_OPTIONS },
  { key: "phone", label: "연락처", minWidth: "140px" },
  { key: "carrier", label: "통신사", minWidth: "130px", filterOptions: CARRIER_OPTIONS },
  { key: "loginId", label: "아이디", minWidth: "120px" },
  { key: "loginPw", label: "비밀번호", minWidth: "100px" },
  { key: "cost", label: "통신비용", minWidth: "120px" },
  { key: "balance", label: "잔액", minWidth: "120px" },
  { key: "paymentDay", label: "납부일", minWidth: "100px" },
  { key: "bankName", label: "은행명", minWidth: "100px" },
  { key: "accountNo", label: "계좌번호", minWidth: "170px" },
  { key: "memo", label: "비고", minWidth: "160px" },
  { key: "registeredAt", label: "등록일", minWidth: "110px" },
]

const STICKY_COLS = 2
const stickyOffsets = [0, CORP_COL_WIDTH]

function CarrierBadge({ carrier }: { carrier: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        carrierStyles[carrier] ?? "bg-muted text-muted-foreground",
      )}
    >
      {carrier}
    </span>
  )
}

function Field({
  id, label, value, onChange, placeholder,
}: {
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

type FormData = {
  owner: string
  phone: string
  carrier: string
  cost: string
  paymentDay: string
  bankName: string
  accountNo: string
  memo: string
  siteUrl: string
  loginId: string
  loginPw: string
  useStatus: string
}

const isUnused = (r: { useStatus?: string }) => r.useStatus === "미사용"

function UseStatusBadge({ status }: { status?: string }) {
  const unused = status === "미사용"
  return (
    <span className={cn(
      "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
      unused ? "bg-zinc-200 text-zinc-600" : "bg-emerald-100 text-emerald-700",
    )}>
      {unused ? "미사용" : "사용"}
    </span>
  )
}

const emptyForm: FormData = {
  owner: "", phone: "", carrier: "SKT", cost: "",
  paymentDay: "매월 1일", bankName: "", accountNo: "", memo: "",
  siteUrl: "", loginId: "", loginPw: "", useStatus: "사용",
}

/** 스킴이 없으면 https:// 를 붙인다 */
function normalizeUrl(url: string): string {
  const u = url.trim()
  if (!u) return ""
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(u) ? u : `https://${u}`
}

/** 사이트 로그인 정보 입력칸 (등록/수정 공용) */
function SiteLoginFields({
  idPrefix, form, set,
}: {
  idPrefix: string
  form: Pick<FormData, "siteUrl" | "loginId" | "loginPw">
  set: (k: "siteUrl" | "loginId" | "loginPw", v: string) => void
}) {
  const [showPw, setShowPw] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">통신사 사이트 / 로그인 정보</p>
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-3">
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-site-url`} className="text-xs text-muted-foreground">사이트 URL</Label>
          <Input id={`${idPrefix}-site-url`} value={form.siteUrl} onChange={(e) => set("siteUrl", e.target.value)} placeholder="예: https://www.sktelecom.com" inputMode="url" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-login-id`} className="text-xs text-muted-foreground">아이디</Label>
          <Input id={`${idPrefix}-login-id`} value={form.loginId} onChange={(e) => set("loginId", e.target.value)} placeholder="로그인 아이디" autoComplete="off" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-login-pw`} className="text-xs text-muted-foreground">비밀번호</Label>
          <div className="relative">
            <Input id={`${idPrefix}-login-pw`} type={showPw ? "text" : "password"} value={form.loginPw} onChange={(e) => set("loginPw", e.target.value)} placeholder="로그인 비밀번호" autoComplete="new-password" className="pr-9" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}>
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 통신사 배지: 사이트 URL 이 있으면 새 탭으로 열고 아이디를 클립보드에 복사한다. */
function CarrierLink({ row }: { row: Pick<Telecom, "carrier" | "siteUrl" | "loginId"> }) {
  const [copied, setCopied] = useState(false)
  const url = normalizeUrl(row.siteUrl ?? "")
  if (!url) return <CarrierBadge carrier={row.carrier} />
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={row.loginId ? `${url} 열기 (아이디 복사됨)` : `${url} 열기`}
      onClick={(e) => {
        e.stopPropagation()
        const id = (row.loginId ?? "").trim()
        if (id && navigator.clipboard && window.isSecureContext) {
          void navigator.clipboard.writeText(id).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) }).catch(() => {})
        }
      }}
      className="relative inline-flex items-center gap-1 rounded-full hover:opacity-80"
    >
      <CarrierBadge carrier={row.carrier} />
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      {copied && (
        <span role="status" className="pointer-events-none absolute -top-7 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white shadow">
          아이디 복사됨
        </span>
      )}
    </a>
  )
}

function TelecomDialog({
  open, onOpenChange, onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (data: FormData) => Promise<void> | void
}) {
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const set = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(form)
      setForm(emptyForm)
      onOpenChange(false)
    } catch {
      // 부모에서 에러 노출
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>통신비 등록</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Field id="tc-owner" label="명의자" value={form.owner}
              onChange={(v) => set("owner", v)} placeholder="예: 김대표" />
            <Field id="tc-phone" label="연락처" value={form.phone}
              onChange={(v) => set("phone", v)} placeholder="010-0000-0000" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tc-carrier" className="text-xs text-muted-foreground">통신사</Label>
              <Select value={form.carrier} onValueChange={(v) => set("carrier", v)}>
                <SelectTrigger id="tc-carrier">
                  <span>{form.carrier}</span>
                </SelectTrigger>
                <SelectContent>
                  {CARRIER_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tc-use-status" className="text-xs text-muted-foreground">상태</Label>
              <Select value={form.useStatus} onValueChange={(v) => set("useStatus", v ?? "사용")}>
                <SelectTrigger id="tc-use-status"><span>{form.useStatus}</span></SelectTrigger>
                <SelectContent>
                  {USE_STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field id="tc-cost" label="통신비용 (원)" value={form.cost}
              onChange={(v) => set("cost", toCommaNumber(v))} placeholder="예: 89,000" />
            <Field id="tc-payment-day" label="납부일" value={form.paymentDay}
              onChange={(v) => set("paymentDay", v)} placeholder="예: 매월 25일" />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">지급 계좌</p>
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-3">
              <Field id="tc-bank" label="은행명" value={form.bankName}
                onChange={(v) => set("bankName", v)} placeholder="예: 국민" />
              <Field id="tc-account" label="계좌번호" value={form.accountNo}
                onChange={(v) => set("accountNo", v)} placeholder="예: 123-456-789012" />
            </div>
          </div>

          <SiteLoginFields idPrefix="tc" form={form} set={(k, v) => set(k, v)} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tc-memo" className="text-xs text-muted-foreground">비고</Label>
            <Textarea id="tc-memo" value={form.memo}
              onChange={(e) => set("memo", e.target.value)}
              placeholder="추가 메모를 입력하세요" rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "등록 중..." : "등록"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TelecomView() {
  const [rows, setRows] = useState<Telecom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [detail, setDetail] = useState<Telecom | null>(null)
  const [payments, setPayments] = useState<TelecomPayment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [payForm, setPayForm] = useState({ paidDate: "", paidAmount: "", memo: "" })
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<FormData>(emptyForm)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const setFilter = (k: string, v: string) => setFilters((p) => ({ ...p, [k]: v }))
  // 일괄 선택 모드: 삭제 / 납입 완료
  const [bulkMode, setBulkMode] = useState<false | "delete" | "complete">(false)
  const [bulkCompleteConfirm, setBulkCompleteConfirm] = useState(false)
  const [bulkCompleting, setBulkCompleting] = useState(false)
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [completeTarget, setCompleteTarget] = useState<Telecom | null>(null)
  const [balanceEdit, setBalanceEdit] = useState<string | null>(null)
  const [balanceSaving, setBalanceSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // 조회 월 (매달 별도로 관리, 항목은 다음 달로 이어짐)
  const nowDate = new Date()
  const [viewYear, setViewYear] = useState(nowDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(nowDate.getMonth() + 1)
  const ym = `${viewYear}-${String(viewMonth).padStart(2, "0")}`
  const isCurrentMonth = viewYear === nowDate.getFullYear() && viewMonth === nowDate.getMonth() + 1
  function prevMonth() { if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12) } else setViewMonth((m) => m - 1) }
  function nextMonth() { if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1) } else setViewMonth((m) => m + 1) }

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setRows(await api.get<Telecom[]>(`/api/telecoms/monthly?yearMonth=${ym}`))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "통신비 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setSelectedIds(new Set())
    setDetail(null)
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym])

  // 법인 관리의 대표자명과 명의자가 같은 법인 (폐업 제외, 공백 무시)
  const { rows: corporations } = useCorporations()
  const corpNamesByCeo = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const c of corporations) {
      if (c.status === "폐업") continue
      const key = (c.ceo ?? "").replace(/s/g, "")
      if (!key) continue
      const name = (c.name ?? "").replace(/s+/g, " ").trim()
      if (!name) continue
      const list = map.get(key) ?? []
      if (!list.includes(name)) list.push(name)
      map.set(key, list)
    }
    return map
  }, [corporations])
  const corpNamesFor = (owner: string) => (corpNamesByCeo.get((owner ?? "").replace(/s/g, "")) ?? []).join(", ")

  const filteredRows = useMemo(() => {
    return rows
      .map((row) => ({ ...row, corpNames: corpNamesFor(row.owner) }))
      .filter((row) =>
        columns.every((col) => {
          const term = filters[col.key]?.trim()
          if (!term) return true
          if (col.filterOptions) return String(row[col.key]) === term
          if (col.key === "cost" || col.key === "balance") return String(Math.round(Number(row[col.key]) || 0)).includes(term.replace(/,/g, ""))
          return String(row[col.key] ?? "").toLowerCase().includes(term.toLowerCase())
        }),
      )
      .sort((a, b) => (b.registeredAt ?? "").localeCompare(a.registeredAt ?? ""))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filters, corpNamesByCeo])

  // 통신 비용 합계 (전체 / 필터 적용 시 표시 중인 항목)
  // 합계·미납 건수는 미사용 항목 제외
  const totalCost = useMemo(() => rows.filter((r) => !isUnused(r)).reduce((sum, r) => sum + (Number(r.cost) || 0), 0), [rows])
  const filteredCost = useMemo(() => filteredRows.filter((r) => !isUnused(r)).reduce((sum, r) => sum + (Number(r.cost) || 0), 0), [filteredRows])
  const unusedCount = rows.filter(isUnused).length
  const isFiltered = filteredRows.length !== rows.length

  // 입금 기한: 매월 말일
  const deposit = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lastDay = new Date(viewYear, viewMonth, 0)
    const daysLeft = Math.round((lastDay.getTime() - today.getTime()) / 86_400_000)
    return { month: lastDay.getMonth() + 1, day: lastDay.getDate(), daysLeft }
  }, [viewYear, viewMonth])
  const unpaidCount = rows.filter((r) => !r.paidThisMonth && !isUnused(r)).length

  const loadPayments = useCallback(async (id: number) => {
    setPaymentsLoading(true)
    try {
      const list = await api.get<TelecomPayment[]>(`/api/telecoms/${id}/payments`)
      setPayments(list)
    } catch {
      setPayments([])
    } finally {
      setPaymentsLoading(false)
    }
  }, [])

  function openDetail(row: Telecom) {
    setDetail(row)
    setBalanceEdit(null)
    setEditMode(false)
    setEditError(null)
    setPayForm({ paidDate: "", paidAmount: toCommaNumber(String(Math.round(row.cost))), memo: "" })
    void loadPayments(row.id)
  }

  function startEdit() {
    if (!detail) return
    setEditForm({
      owner: detail.owner,
      phone: detail.phone,
      carrier: detail.carrier,
      useStatus: detail.useStatus ?? "사용",
      cost: toCommaNumber(String(Math.round(detail.cost))),
      paymentDay: detail.paymentDay,
      bankName: detail.bankName,
      accountNo: detail.accountNo,
      memo: detail.memo,
      siteUrl: detail.siteUrl ?? "",
      loginId: detail.loginId ?? "",
      loginPw: detail.loginPw ?? "",
    })
    setEditError(null)
    setEditMode(true)
  }

  // 수정 폼이 원래 값과 달라졌는지
  const editDirty = !!detail && (
    editForm.owner !== detail.owner ||
    editForm.phone !== detail.phone ||
    editForm.carrier !== detail.carrier ||
    editForm.useStatus !== (detail.useStatus ?? "사용") ||
    (Number(editForm.cost.replace(/,/g, "")) || 0) !== Math.round(Number(detail.cost) || 0) ||
    editForm.paymentDay !== detail.paymentDay ||
    editForm.bankName !== detail.bankName ||
    editForm.accountNo !== detail.accountNo ||
    editForm.memo !== detail.memo ||
    editForm.siteUrl !== (detail.siteUrl ?? "") ||
    editForm.loginId !== (detail.loginId ?? "") ||
    editForm.loginPw !== (detail.loginPw ?? "")
  )

  async function handleEdit() {
    if (!detail) return
    setEditSubmitting(true)
    setEditError(null)
    try {
      const updated = await api.put<Telecom>(`/api/telecoms/${detail.id}/monthly?yearMonth=${ym}`, {
        owner: editForm.owner,
        phone: editForm.phone,
        carrier: editForm.carrier,
        useStatus: editForm.useStatus || "사용",
        cost: Number(editForm.cost.replace(/,/g, "")) || 0,
        paymentDay: editForm.paymentDay,
        bankName: editForm.bankName,
        accountNo: editForm.accountNo,
        memo: editForm.memo,
        siteUrl: normalizeUrl(editForm.siteUrl),
        loginId: editForm.loginId,
        loginPw: editForm.loginPw,
      })
      setDetail(updated)
      setEditMode(false)
      await refresh()
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "수정에 실패했습니다.")
    } finally {
      setEditSubmitting(false)
    }
  }

  async function addPayment() {
    if (!detail || !payForm.paidDate || !payForm.paidAmount) return
    setPaySubmitting(true)
    try {
      await api.post(`/api/telecoms/${detail.id}/payments`, {
        paidDate: payForm.paidDate,
        paidAmount: Number(payForm.paidAmount.replace(/,/g, "")) || 0,
        memo: payForm.memo,
      })
      setPayForm({ paidDate: "", paidAmount: toCommaNumber(String(Math.round(detail.cost))), memo: "" })
      await loadPayments(detail.id)
    } catch {
      // ignore
    } finally {
      setPaySubmitting(false)
    }
  }

  async function deletePayment(paymentId: number) {
    if (!detail) return
    try {
      await api.delete(`/api/telecoms/${detail.id}/payments/${paymentId}`)
      await loadPayments(detail.id)
    } catch {
      // ignore
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      for (const id of selectedIds) {
        await api.delete(`/api/telecoms/${id}/monthly?yearMonth=${ym}`)
      }
      await refresh()
      setSelectedIds(new Set())
      setBulkMode(false)
      setBulkConfirm(false)
    } catch (e) {
      // 에러는 무시하고 refresh
    } finally {
      setBulkDeleting(false)
    }
  }

  function flash(msg: string) {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 3000)
  }

  // 납입 완료 (단건): 오늘 날짜로 통신 비용만큼 납입 기록 + 잔액 증가
  async function handleCompletePayment(row: Telecom) {
    setCompletingId(row.id)
    setSubmitError(null)
    try {
      const updated = await api.post<Telecom>(`/api/telecoms/${row.id}/complete-payment?yearMonth=${ym}`)
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      if (detail?.id === updated.id) { setDetail(updated); void loadPayments(updated.id) }
      flash(`${updated.owner} ${viewMonth}월 납입 완료 · 잔액 ₩${Math.round(updated.balance).toLocaleString("ko-KR")}`)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "납입 완료 처리에 실패했습니다.")
    } finally {
      setCompletingId(null)
      setCompleteTarget(null)
    }
  }

  // 일괄 납입 완료
  async function handleBulkComplete() {
    setBulkCompleting(true)
    setSubmitError(null)
    try {
      const updated = await api.post<Telecom[]>("/api/telecoms/complete-payments", { ids: [...selectedIds], yearMonth: ym })
      const byId = new Map(updated.map((u) => [u.id, u]))
      setRows((prev) => prev.map((r) => byId.get(r.id) ?? r))
      flash(`${viewMonth}월 ${updated.length}건 납입 완료 처리했습니다.` + (updated.length < selectedIds.size ? ` (이미 완료된 ${selectedIds.size - updated.length}건 제외)` : ""))
      setSelectedIds(new Set())
      setBulkMode(false)
      setBulkCompleteConfirm(false)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "일괄 납입 완료 처리에 실패했습니다.")
      setBulkCompleteConfirm(false)
    } finally {
      setBulkCompleting(false)
    }
  }

  // 잔액 수동 변경
  async function handleSaveBalance() {
    if (!detail || balanceEdit === null) return
    setBalanceSaving(true)
    try {
      const updated = await api.put<Telecom>(`/api/telecoms/${detail.id}/balance`, { balance: Number(balanceEdit.replace(/[^\d-]/g, "")) || 0 })
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setDetail(updated)
      setBalanceEdit(null)
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "잔액 변경에 실패했습니다.")
    } finally {
      setBalanceSaving(false)
    }
  }

  async function handleSubmit(data: FormData) {
    setSubmitError(null)
    try {
      await api.post<Telecom>(`/api/telecoms/monthly?yearMonth=${ym}`, {
        owner: data.owner,
        phone: data.phone,
        carrier: data.carrier,
        cost: Number(data.cost.replace(/,/g, "")) || 0,
        useStatus: data.useStatus || "사용",
        paymentDay: data.paymentDay,
        bankName: data.bankName,
        accountNo: data.accountNo,
        memo: data.memo,
        siteUrl: normalizeUrl(data.siteUrl),
        loginId: data.loginId,
        loginPw: data.loginPw,
      })
      await refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "통신비 등록에 실패했습니다."
      setSubmitError(message)
      throw err
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="mobile-hidden text-xl font-semibold tracking-tight text-foreground">통신비</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "불러오는 중..." : `전체 ${rows.length}건 · 현재 ${filteredRows.length}건 표시`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bulkMode ? (
            <>
              {bulkMode === "delete" && selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setBulkConfirm(true)}>
                  삭제 ({selectedIds.size}건)
                </Button>
              )}
              {bulkMode === "complete" && (
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" disabled={selectedIds.size === 0} onClick={() => setBulkCompleteConfirm(true)}>
                  <CheckCheck className="h-4 w-4" aria-hidden="true" />
                  납입 완료 ({selectedIds.size}건)
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => { setBulkMode(false); setSelectedIds(new Set()) }}>취소</Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setBulkMode("complete")}>
                <CheckCheck className="h-4 w-4" aria-hidden="true" />일괄 납입 완료
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkMode("delete")}>일괄 삭제</Button>
            </>
          )}
          <ExcelUploadButton
            templateName="통신비"
            columns={[
              { key: "owner", label: "명의자", required: true, example: "홍길동" },
              { key: "phone", label: "연락처", example: "010-1234-5678" },
              { key: "carrier", label: "통신사", required: true, example: "SKT" },
              { key: "cost", label: "통신비용", required: true, example: "55000" },
              { key: "paymentDay", label: "납부일", example: "15" },
              { key: "bankName", label: "은행명", example: "국민은행" },
              { key: "accountNo", label: "계좌번호", example: "123-456-789012" },
              { key: "memo", label: "비고", example: "" },
            ] satisfies ExcelColumn[]}
            onRows={async (rows) => {
              let success = 0
              const failed: Array<{ row: number; reason: string }> = []
              for (let i = 0; i < rows.length; i++) {
                const r = rows[i]
                try {
                  await api.post(`/api/telecoms/monthly?yearMonth=${ym}`, {
                    owner: r.owner, phone: r.phone || "", carrier: r.carrier,
                    cost: Number(r.cost.replace(/,/g, "")) || 0,
                    paymentDay: r.paymentDay || "",
                    bankName: r.bankName || "", accountNo: r.accountNo || "",
                    memo: r.memo || "",
                  })
                  success++
                } catch (e) { failed.push({ row: i + 2, reason: e instanceof ApiError ? e.message : "오류" }) }
              }
              await refresh()
              return { success, failed }
            }}
          />
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden="true" />
            통신비 등록
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      ) : null}
      {submitError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{submitError}</div>
      ) : null}
      {notice ? (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</div>
      ) : null}
      {bulkMode === "complete" ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-4 py-2 text-sm text-emerald-800">
          {viewMonth}월 납입 완료할 항목을 선택하세요. 선택한 항목마다 통신 비용만큼 납입 내역이 기록되고 잔액에 더해집니다.
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth} aria-label="이전 달">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{viewYear}년 {viewMonth}월</span>
          {!isCurrentMonth && (
            <button type="button" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={() => { setViewYear(nowDate.getFullYear()); setViewMonth(nowDate.getMonth() + 1) }}>
              이번 달
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth} aria-label="다음 달">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">{viewMonth}월 통신 비용 합계 · 미납 {unpaidCount}건</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            ₩{Math.round(totalCost).toLocaleString("ko-KR")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {loading
              ? "불러오는 중..."
              : isFiltered
                ? `필터 적용 ${filteredRows.length}건 합계 ₩${Math.round(filteredCost).toLocaleString("ko-KR")}`
                : `전체 ${rows.length}건 기준${unusedCount ? ` (미사용 ${unusedCount}건 제외)` : ""}`}
            {" · 잔액 합계 "}₩{Math.round(rows.reduce((s, r) => s + (Number(r.balance) || 0), 0)).toLocaleString("ko-KR")}
          </p>
        </div>
        <div
          className={cn(
            "flex items-start gap-3 rounded-lg border px-4 py-3 shadow-sm",
            isCurrentMonth && deposit.daysLeft <= 3 ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50",
          )}
        >
          <CalendarClock
            className={cn("mt-0.5 h-5 w-5 shrink-0", deposit.daysLeft <= 3 ? "text-red-600" : "text-amber-600")}
            aria-hidden="true"
          />
          <div className="flex flex-col">
            <p className={cn("text-xs font-medium", deposit.daysLeft <= 3 ? "text-red-700" : "text-amber-700")}>입금 안내</p>
            <p className="mt-1 text-base font-semibold text-foreground">통신비는 매월 말일에 입금해야 합니다.</p>
            <p className={cn("mt-0.5 text-xs font-medium", deposit.daysLeft <= 3 ? "text-red-700" : "text-amber-700")}>
              {deposit.month}월 입금일 {deposit.month}월 {deposit.day}일{isCurrentMonth ? ` · ${deposit.daysLeft === 0 ? "오늘 입금일" : `D-${deposit.daysLeft}`}` : ""}
            </p>
          </div>
        </div>
      </div>

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
                        onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredRows.map((r) => r.id)) : new Set())}
                      />
                    </th>
                  )}
                  {columns.map((col, colIdx) => (
                    <th
                      key={col.key}
                      className={cn(
                        "border-b border-border bg-muted px-3 py-2.5 align-middle font-medium",
                        colIdx < STICKY_COLS && "sm:sticky sm:z-10",
                      )}
                      style={{
                        minWidth: col.minWidth,
                        ...(col.key === "corpNames" ? { width: CORP_COL_WIDTH, maxWidth: CORP_COL_WIDTH } : {}),
                        left: colIdx < STICKY_COLS ? stickyOffsets[colIdx] : undefined,
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
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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
                  <th className="sticky right-0 z-10 border-b border-l border-border bg-muted px-3 py-2.5 text-center font-medium whitespace-nowrap">납입</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1 + (bulkMode ? 1 : 0)} className="h-64 text-center text-muted-foreground">
                      조건에 맞는 항목이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className={cn("group cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent/50", isUnused(row) && "bg-muted/40 text-muted-foreground opacity-60")} onClick={() => openDetail(row)}>
                      {bulkMode && (
                        <td className="w-10 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox"
                            className="h-4 w-4 rounded border-border"
                            checked={selectedIds.has(row.id)}
                            onChange={(e) => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev)
                                if (e.target.checked) { next.add(row.id) } else { next.delete(row.id) }
                                return next
                              })
                            }}
                          />
                        </td>
                      )}
                      {columns.map((col, colIdx) => (
                        <td
                          key={col.key}
                          className={cn(
                            "px-3 py-2.5 text-foreground",
                            col.key === "corpNames" ? "whitespace-normal break-keep text-xs leading-snug" : "whitespace-nowrap",
                            colIdx < STICKY_COLS && "sm:sticky sm:z-10 bg-card group-hover:bg-accent",
                          )}
                          style={{
                            left: colIdx < STICKY_COLS ? stickyOffsets[colIdx] : undefined,
                            ...(col.key === "corpNames" ? { width: CORP_COL_WIDTH, minWidth: CORP_COL_WIDTH, maxWidth: CORP_COL_WIDTH } : {}),
                          }}
                        >
                          {col.key === "useStatus" ? (
                            <UseStatusBadge status={row.useStatus} />
                          ) : col.key === "corpNames" ? (
                            <span className={row.corpNames ? "text-foreground" : "text-muted-foreground"}>{row.corpNames || "-"}</span>
                          ) : col.key === "owner" ? (
                            <CopyText value={(row.owner ?? "").trim()} label="이름" className="font-medium" />
                          ) : col.key === "carrier" ? (
                            <CarrierLink row={row} />
                          ) : col.key === "loginId" ? (
                            <CopyText value={(row.loginId ?? "").trim()} label="아이디" />
                          ) : col.key === "loginPw" ? (
                            <CopyText value={row.loginPw ?? ""} label="비밀번호">{row.loginPw ? "●●●●" : "-"}</CopyText>
                          ) : col.key === "cost" ? (
                            <CopyText value={String(Math.round(row.cost))} label="통신비용" className="font-medium tabular-nums">
                              ₩{Math.round(row.cost).toLocaleString("ko-KR")}
                            </CopyText>
                          ) : col.key === "balance" ? (
                            <span className={cn("font-medium tabular-nums", Number(row.balance) > 0 ? "text-emerald-700" : "text-muted-foreground")}>
                              ₩{Math.round(Number(row.balance) || 0).toLocaleString("ko-KR")}
                            </span>
                          ) : col.key === "accountNo" ? (
                            <CopyText value={(row.accountNo ?? "").trim()} label="계좌번호" className="tabular-nums" />
                          ) : col.key === "memo" ? (
                            <span className="text-muted-foreground">{row.memo || "-"}</span>
                          ) : (
                            String(row[col.key] ?? "") || "-"
                          )}
                        </td>
                      ))}
                      <td className="sticky right-0 z-10 border-l border-border bg-card px-2 py-1.5 text-center group-hover:bg-accent" onClick={(e) => e.stopPropagation()}>
                        {isUnused(row) ? (
                          <span className="text-xs text-muted-foreground">미사용</span>
                        ) : row.paidThisMonth ? (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <Check className="h-3 w-3" aria-hidden="true" />
                            완료{row.paidDateThisMonth ? ` ${row.paidDateThisMonth.slice(5).replace("-", "/")}` : ""}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 border-emerald-300 px-2 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                            disabled={completingId === row.id}
                            onClick={() => setCompleteTarget(row)}
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            {completingId === row.id ? "처리 중" : "납입 완료"}
                          </Button>
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

      <TelecomDialog open={open} onOpenChange={setOpen} onSubmit={handleSubmit} />

      {/* 납입 완료 확인 (단건) */}
      <Dialog open={!!completeTarget} onOpenChange={(o) => { if (!o) setCompleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>납입 완료</DialogTitle></DialogHeader>
          {completeTarget && (
            <p className="py-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{completeTarget.owner}</span>님 통신비
              <span className="font-semibold text-foreground"> ₩{Math.round(completeTarget.cost).toLocaleString("ko-KR")}</span>을 {viewMonth}월분으로 납입 완료 처리합니다.<br />
              잔액이 ₩{Math.round(Number(completeTarget.balance) || 0).toLocaleString("ko-KR")}에서
              <span className="font-semibold text-emerald-700"> ₩{Math.round((Number(completeTarget.balance) || 0) + completeTarget.cost).toLocaleString("ko-KR")}</span>으로 바뀝니다.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteTarget(null)}>취소</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={completingId !== null} onClick={() => completeTarget && void handleCompletePayment(completeTarget)}>
              {completingId !== null ? "처리 중..." : "납입 완료"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄 납입 완료 확인 */}
      <Dialog open={bulkCompleteConfirm} onOpenChange={(o) => { if (!o) setBulkCompleteConfirm(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>일괄 납입 완료</DialogTitle></DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            선택한 항목 중 {viewMonth}월 미납 <span className="font-semibold text-foreground">{rows.filter((r) => selectedIds.has(r.id) && !r.paidThisMonth && !isUnused(r)).length}건</span>을 납입 완료 처리합니다.<br />
            합계 <span className="font-semibold text-foreground">₩{Math.round(rows.filter((r) => selectedIds.has(r.id) && !r.paidThisMonth && !isUnused(r)).reduce((s, r) => s + r.cost, 0)).toLocaleString("ko-KR")}</span>이 각 잔액에 더해집니다. 이미 완료됐거나 미사용인 항목은 건너뜁니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkCompleteConfirm(false)}>취소</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={bulkCompleting} onClick={() => void handleBulkComplete()}>
              {bulkCompleting ? "처리 중..." : "납입 완료"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄 삭제 확인 다이얼로그 */}
      <Dialog open={bulkConfirm} onOpenChange={(o) => { if (!o) setBulkConfirm(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>일괄 삭제</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            선택한 <span className="font-semibold text-foreground">{selectedIds.size}건</span>을 {viewYear}년 {viewMonth}월부터 삭제하시겠습니까?<br />
            이전 달 기록은 그대로 남습니다. (이번 달에 새로 등록한 항목은 완전히 삭제됩니다)
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirm(false)}>취소</Button>
            <Button variant="destructive" disabled={bulkDeleting} onClick={handleBulkDelete}>
              {bulkDeleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent className="sm:max-h-[90svh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-base font-semibold">통신비 상세</DialogTitle>
          </DialogHeader>

          {detail && (
            <>
              <div className="flex max-h-[calc(75dvh-9rem)] sm:max-h-[calc(90svh-9rem)] flex-col overflow-y-auto px-6 py-5">
                <div className="flex flex-col gap-5">
                  {editMode ? (
                    <div className="flex flex-col gap-4">
                      {editError && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{editError}</div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <Field id="edit-owner" label="명의자" value={editForm.owner} onChange={(v) => setEditForm((p) => ({ ...p, owner: v }))} placeholder="예: 김대표" />
                        <Field id="edit-phone" label="연락처" value={editForm.phone} onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))} placeholder="010-0000-0000" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="edit-carrier" className="text-xs text-muted-foreground">통신사</Label>
                          <Select value={editForm.carrier} onValueChange={(v) => setEditForm((p) => ({ ...p, carrier: v }))}>
                            <SelectTrigger id="edit-carrier"><span>{editForm.carrier}</span></SelectTrigger>
                            <SelectContent>
                              {CARRIER_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="edit-use-status" className="text-xs text-muted-foreground">상태 ({viewMonth}월부터 적용)</Label>
                          <Select value={editForm.useStatus} onValueChange={(v) => setEditForm((p) => ({ ...p, useStatus: v ?? "사용" }))}>
                            <SelectTrigger id="edit-use-status"><span>{editForm.useStatus}</span></SelectTrigger>
                            <SelectContent>
                              {USE_STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field id="edit-cost" label="통신비용 (원)" value={editForm.cost} onChange={(v) => setEditForm((p) => ({ ...p, cost: toCommaNumber(v) }))} placeholder="예: 89,000" />
                        <Field id="edit-payment-day" label="납부일" value={editForm.paymentDay} onChange={(v) => setEditForm((p) => ({ ...p, paymentDay: v }))} placeholder="예: 매월 25일" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground">지급 계좌</p>
                        <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-3">
                          <Field id="edit-bank" label="은행명" value={editForm.bankName} onChange={(v) => setEditForm((p) => ({ ...p, bankName: v }))} placeholder="예: 국민" />
                          <Field id="edit-account" label="계좌번호" value={editForm.accountNo} onChange={(v) => setEditForm((p) => ({ ...p, accountNo: v }))} placeholder="예: 123-456-789012" />
                        </div>
                      </div>
                      <SiteLoginFields idPrefix="edit" form={editForm} set={(k, v) => setEditForm((p) => ({ ...p, [k]: v }))} />
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-memo" className="text-xs text-muted-foreground">비고</Label>
                        <Textarea id="edit-memo" value={editForm.memo} onChange={(e) => setEditForm((p) => ({ ...p, memo: e.target.value }))} placeholder="추가 메모를 입력하세요" rows={3} />
                      </div>
                    </div>
                  ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">명의자</span>
                      <CopyText value={(detail.owner ?? "").trim()} label="이름" className="font-medium" />
                    </div>
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">대표 법인</span>
                      <span>{corpNamesFor(detail.owner) || "-"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">연락처</span>
                      <span>{detail.phone || "-"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">통신사</span>
                      <span className="flex items-center gap-1.5"><CarrierLink row={detail} /><UseStatusBadge status={detail.useStatus} /></span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">통신비용</span>
                      <CopyText value={String(Math.round(detail.cost))} label="통신비용" className="font-medium tabular-nums">
                        ₩{Math.round(detail.cost).toLocaleString("ko-KR")}
                      </CopyText>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">납부일</span>
                      <span>{detail.paymentDay || "-"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">잔액</span>
                      {balanceEdit === null ? (
                        <span className="flex items-center gap-1.5">
                          <span className="font-semibold tabular-nums text-emerald-700">₩{Math.round(Number(detail.balance) || 0).toLocaleString("ko-KR")}</span>
                          <button
                            type="button"
                            className="text-muted-foreground transition-colors hover:text-foreground"
                            title="잔액 변경"
                            aria-label="잔액 변경"
                            onClick={() => setBalanceEdit(toCommaNumber(String(Math.round(Number(detail.balance) || 0))) || "0")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Input
                            aria-label="잔액"
                            value={balanceEdit}
                            onChange={(e) => setBalanceEdit(toCommaNumber(e.target.value))}
                            onKeyDown={(e) => { if (e.key === "Enter") void handleSaveBalance(); if (e.key === "Escape") setBalanceEdit(null) }}
                            className="h-8 w-28 text-right text-sm tabular-nums"
                            autoFocus
                          />
                          <Button size="sm" className="h-8 px-2 text-xs" disabled={balanceSaving} onClick={() => void handleSaveBalance()}>저장</Button>
                          <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setBalanceEdit(null)}>취소</Button>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">아이디</span>
                      <CopyText value={(detail.loginId ?? "").trim()} label="아이디" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">비밀번호</span>
                      <CopyText value={detail.loginPw ?? ""} label="비밀번호">{detail.loginPw ? "●●●●" : "-"}</CopyText>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">지급계좌</span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {detail.bankName && <span>{detail.bankName}</span>}
                        {detail.accountNo ? <CopyText value={detail.accountNo.trim()} label="계좌번호" className="tabular-nums" /> : !detail.bankName && "-"}
                      </span>
                    </div>
                    {detail.memo && (
                      <div className="col-span-2 flex flex-col gap-0.5 sm:col-span-3">
                        <span className="text-[11px] text-muted-foreground">비고</span>
                        <span className="whitespace-pre-wrap text-muted-foreground">{detail.memo}</span>
                      </div>
                    )}
                  </div>
                  )}

                  {!editMode && (
                  <div className="rounded-lg border border-border p-4">
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        납입 내역 ({payments.length}건)
                      </p>
                    </div>

                    <div className="mb-4 flex items-end gap-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">납입일 (납입 기록용)</Label>
                        <Input type="date" value={payForm.paidDate} onChange={(e) => setPayForm((p) => ({ ...p, paidDate: e.target.value }))} className="h-9 w-36 text-sm" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">납입 금액</Label>
                        <Input value={payForm.paidAmount} onChange={(e) => setPayForm((p) => ({ ...p, paidAmount: toCommaNumber(e.target.value) }))} placeholder="납입 금액" className="h-9 w-32 text-sm" />
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">메모</Label>
                        <Input value={payForm.memo} onChange={(e) => setPayForm((p) => ({ ...p, memo: e.target.value }))} placeholder="메모 (선택)" className="h-9 text-sm" />
                      </div>
                      <Button size="sm" className="h-9 gap-1 px-3" disabled={paySubmitting || !payForm.paidDate || !payForm.paidAmount} onClick={addPayment}>
                        <Plus className="h-3.5 w-3.5" />추가
                      </Button>
                    </div>

                    {paymentsLoading ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">불러오는 중...</p>
                    ) : payments.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">납입 내역이 없습니다.</p>
                    ) : (
                      <div className="max-h-60 overflow-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-border text-left text-xs text-muted-foreground">
                              <th className="px-2 py-2 font-medium">납입일</th>
                              <th className="px-2 py-2 font-medium text-right">금액</th>
                              <th className="px-2 py-2 font-medium">메모</th>
                              <th className="w-10 px-2 py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map((p) => (
                              <tr key={p.id} className="border-b border-border/50 last:border-0">
                                <td className="px-2 py-2">{p.paidDate}</td>
                                <td className="px-2 py-2 text-right font-medium tabular-nums">₩{Math.round(p.paidAmount).toLocaleString("ko-KR")}</td>
                                <td className="px-2 py-2 text-muted-foreground">{p.memo || "-"}</td>
                                <td className="px-2 py-2">
                                  <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => deletePayment(p.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  )}
                  <ChangeHistory entityType="Telecom" entityId={detail.id} refreshKey={`${JSON.stringify(detail)}|${payments.map((p) => p.id).join(",")}`} />
                </div>
              </div>
              <DialogFooter className="border-t border-border px-6 py-5">
                {editMode ? (
                  <>
                    <Button variant="outline" disabled={editSubmitting} onClick={() => { setEditMode(false); setEditError(null) }}>취소</Button>
                    {!editDirty && <span className="mr-auto self-center text-xs text-muted-foreground">변경된 내용이 없습니다.</span>}
                    <Button disabled={editSubmitting || !editDirty} onClick={handleEdit}>
                      {editSubmitting ? "저장 중..." : "저장"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      className="mr-auto gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      disabled={completingId === detail.id || !!detail.paidThisMonth || isUnused(detail)}
                      onClick={() => setCompleteTarget(detail)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {detail.paidThisMonth ? `${viewMonth}월 납입 완료됨` : completingId === detail.id ? "처리 중..." : `${viewMonth}월 납입 완료`}
                    </Button>
                    <Button variant="outline" className="gap-1.5" onClick={startEdit}>
                      <Pencil className="h-3.5 w-3.5" />수정
                    </Button>
                    <Button variant="outline" onClick={() => setDetail(null)}>닫기</Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


