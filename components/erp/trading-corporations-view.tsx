"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Download, Loader2, Paperclip, Plus, Trash2, Upload, X } from "lucide-react"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx-js-style")
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ApiError, api } from "@/lib/api"
import { useCorporations } from "@/components/erp/corporations-context"
import { OcrPreviewDialog, type OcrData, SIDO_LIST, SIGUNGU_MAP, deriveRegion } from "@/components/erp/corporation-form-dialog"

type LinkedCorp = { id: number; name: string }
type PgEntry = { id: number; pgCompanyName: string }
type PgCompany = { id: number; name: string }

type TradingCorp = {
  id: number
  name: string
  bizNo: string
  corpNo: string
  ceo: string
  contact: string
  email: string
  address: string
  account: string
  tradingType: string
  businessType: string
  businessItem: string
  note: string
  openDate: string | null
  registeredAt: string
  subsidiaries: LinkedCorp[]
  giftCorps: LinkedCorp[]
  pgs: PgEntry[]
  bizLicenseFileUrl?: string | null
}

const TRADING_TYPE_OPTIONS = ["매입", "매출", "매입/매출", "기타"]

const REGION_NORMALIZE: Record<string, string> = {
  "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구",
  "인천광역시": "인천", "광주광역시": "광주", "대전광역시": "대전",
  "울산광역시": "울산", "세종특별자치시": "세종",
  "경기도": "경기", "강원도": "강원", "강원특별자치도": "강원",
  "충청북도": "충북", "충청남도": "충남",
  "전라북도": "전북", "전라남도": "전남", "전북특별자치도": "전북",
  "경상북도": "경북", "경상남도": "경남",
  "제주특별자치도": "제주",
}

// 시군구 → 시도 역방향 맵 (중복 이름 제외)
const SIGUNGU_TO_SIDO: Record<string, string> = (() => {
  const map: Record<string, Set<string>> = {}
  for (const [sido, list] of Object.entries(SIGUNGU_MAP)) {
    for (const sg of list) {
      if (!map[sg]) map[sg] = new Set()
      map[sg].add(sido)
    }
  }
  const result: Record<string, string> = {}
  for (const [sg, sidos] of Object.entries(map)) {
    if (sidos.size === 1) result[sg] = [...sidos][0]
  }
  return result
})()

// 축약키 → 전체 시도명 (표시용)
const SIDO_KEY_TO_FULL: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  for (const [full, abbr] of Object.entries(REGION_NORMALIZE)) {
    if (!m[abbr]) m[abbr] = full
  }
  return m
})()

function getSidoKey(address: string): string {
  if (!address.trim()) return ""
  const derived = deriveRegion(address)
  if (derived) {
    const sido = SIDO_LIST.find(s => derived.startsWith(s)) ?? ""
    return REGION_NORMALIZE[sido] ?? sido
  }
  const firstWord = address.trim().split(/\s+/)[0] ?? ""
  if (REGION_NORMALIZE[firstWord]) return REGION_NORMALIZE[firstWord]
  if (SIGUNGU_TO_SIDO[firstWord]) {
    const sido = SIGUNGU_TO_SIDO[firstWord]
    return REGION_NORMALIZE[sido] ?? sido
  }
  return firstWord
}

// 표시용 전체 지역명 반환 (예: "충청남도 천안시")
function getSidoLabel(address: string): string {
  if (!address.trim()) return ""
  const derived = deriveRegion(address)
  if (derived) return derived
  const key = getSidoKey(address)
  return SIDO_KEY_TO_FULL[key] ?? key
}

const columns = [
  { key: "name",         label: "법인명",      minWidth: "150px" },
  { key: "tradingType",  label: "거래 유형",   minWidth: "110px" },
  { key: "bizNo",        label: "사업자번호",  minWidth: "140px" },
  { key: "ceo",          label: "대표자",      minWidth: "110px" },
  { key: "contact",      label: "연락처",      minWidth: "140px" },
  { key: "email",        label: "이메일",      minWidth: "200px" },
  { key: "address",      label: "주소",        minWidth: "220px" },
  { key: "account",      label: "계좌번호",    minWidth: "200px" },
  { key: "note",         label: "비고",        minWidth: "160px" },
  { key: "registeredAt", label: "등록일",      minWidth: "120px" },
] as const

type ColKey = (typeof columns)[number]["key"]

const tradingTypeStyle: Record<string, string> = {
  "매입": "bg-blue-100 text-blue-700",
  "매출": "bg-emerald-100 text-emerald-700",
  "매입/매출": "bg-indigo-100 text-indigo-700",
  "기타": "bg-gray-200 text-gray-700",
}

type FormData = {
  name: string; bizNo: string; corpNo: string; ceo: string; contact: string
  email: string; address: string; account: string; tradingType: string
  businessType: string; businessItem: string; note: string; openDate: string
  bizLicenseFileUrl?: string
}

const emptyForm = (): FormData => ({
  name: "", bizNo: "", corpNo: "", ceo: "", contact: "",
  email: "", address: "", account: "", tradingType: "매입/매출",
  businessType: "", businessItem: "", note: "", openDate: "",
  bizLicenseFileUrl: "",
})

function Field({ id, label, value, onChange, placeholder }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

// PG 섹션 컴포넌트
function PgSection({
  pgs,
  pgCompanies,
  onAdd,
  onRemove,
  onAddCompany,
}: {
  pgs: PgEntry[]
  pgCompanies: PgCompany[]
  onAdd: (name: string) => void
  onRemove: (id: number) => void
  onAddCompany: (name: string) => Promise<void>
}) {
  const [newCompanyOpen, setNewCompanyOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [adding, setAdding] = useState(false)

  async function handleAddCompany() {
    const trimmed = newCompanyName.trim()
    if (!trimmed) return
    setAdding(true)
    await onAddCompany(trimmed)
    onAdd(trimmed)
    setNewCompanyName("")
    setNewCompanyOpen(false)
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PG</span>
      {/* 현재 PG 목록 */}
      {pgs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pgs.map((pg) => (
            <span key={pg.id} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
              {pg.pgCompanyName}
              <button type="button" onClick={() => onRemove(pg.id)} className="hover:text-violet-900 ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* PG 추가 */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          defaultValue=""
          onChange={(e) => { if (e.target.value) { onAdd(e.target.value); e.target.value = "" } }}
        >
          <option value="" disabled>PG사 선택</option>
          {pgCompanies
            .filter((c) => !pgs.some((p) => p.pgCompanyName === c.name))
            .map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setNewCompanyOpen(true)}>
          <Plus className="h-3 w-3" />
          PG사 추가
        </Button>
      </div>
      {/* 새 PG사 입력 인라인 */}
      {newCompanyOpen && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
          <Input
            className="h-8 flex-1 text-sm"
            placeholder="새 PG사 이름 입력"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddCompany() }}
            autoFocus
          />
          <Button size="sm" className="h-8 text-xs" disabled={adding || !newCompanyName.trim()} onClick={handleAddCompany}>
            {adding ? "저장 중..." : "저장"}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setNewCompanyOpen(false); setNewCompanyName("") }}>취소</Button>
        </div>
      )}
    </div>
  )
}

// 등록 폼용 PG 섹션 (ID 없이 이름만 관리)
function PgSectionForm({
  pgNames,
  pgCompanies,
  onChange,
  onAddCompany,
}: {
  pgNames: string[]
  pgCompanies: PgCompany[]
  onChange: (names: string[]) => void
  onAddCompany: (name: string) => Promise<void>
}) {
  const [newCompanyOpen, setNewCompanyOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [adding, setAdding] = useState(false)

  async function handleAddCompany() {
    const trimmed = newCompanyName.trim()
    if (!trimmed) return
    setAdding(true)
    await onAddCompany(trimmed)
    if (!pgNames.includes(trimmed)) onChange([...pgNames, trimmed])
    setNewCompanyName("")
    setNewCompanyOpen(false)
    setAdding(false)
  }

  return (
    <div className="col-span-1 sm:col-span-2 flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PG</span>
      {pgNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pgNames.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
              {name}
              <button type="button" onClick={() => onChange(pgNames.filter((n) => n !== name))} className="hover:text-violet-900 ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value && !pgNames.includes(e.target.value)) {
              onChange([...pgNames, e.target.value])
            }
            e.target.value = ""
          }}
        >
          <option value="" disabled>PG사 선택</option>
          {pgCompanies.filter((c) => !pgNames.includes(c.name)).map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setNewCompanyOpen(true)}>
          <Plus className="h-3 w-3" />
          PG사 추가
        </Button>
      </div>
      {newCompanyOpen && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
          <Input
            className="h-8 flex-1 text-sm"
            placeholder="새 PG사 이름 입력"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddCompany() }}
            autoFocus
          />
          <Button size="sm" className="h-8 text-xs" disabled={adding || !newCompanyName.trim()} onClick={handleAddCompany}>
            {adding ? "저장 중..." : "저장"}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setNewCompanyOpen(false); setNewCompanyName("") }}>취소</Button>
        </div>
      )}
    </div>
  )
}

export function TradingCorporationsView() {
  const { rows: allCorps } = useCorporations()

  const subsidiaryOptions = useMemo(
    () => allCorps.filter((c) => c.category === "하위 법인" && c.id),
    [allCorps]
  )
  const giftCorpOptions = useMemo(
    () => allCorps.filter((c) => c.category === "상품권 법인" && c.id),
    [allCorps]
  )

  const [rows, setRows] = useState<TradingCorp[]>([])
  const [pgCompanies, setPgCompanies] = useState<PgCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Partial<Record<ColKey, string>>>({})
  const [subFilter, setSubFilter] = useState("")
  const [giftFilter, setGiftFilter] = useState("")

  const [detail, setDetail] = useState<TradingCorp | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<FormData>(emptyForm())
  // 상세 팝업의 PG 로컬 상태 (저장 즉시 반영)
  const [detailPgs, setDetailPgs] = useState<PgEntry[]>([])

  const [linkedSubs, setLinkedSubs] = useState<LinkedCorp[]>([])
  const [linkedGifts, setLinkedGifts] = useState<LinkedCorp[]>([])
  const [linkSaving, setLinkSaving] = useState(false)
  const [pendingLink, setPendingLink] = useState<{ type: "sub" | "gift"; corp: LinkedCorp; region: string } | null>(null)

  const [showClosedSubs, setShowClosedSubs] = useState(false)
  const [showClosedGifts, setShowClosedGifts] = useState(false)
  const [linkSubSearch, setLinkSubSearch] = useState("")
  const [linkGiftSearch, setLinkGiftSearch] = useState("")

  const filteredSubOptions = useMemo(
    () => subsidiaryOptions
      .filter((c) => showClosedSubs || c.status !== "폐업")
      .filter((c) => !linkSubSearch || c.name.toLowerCase().includes(linkSubSearch.toLowerCase())),
    [subsidiaryOptions, showClosedSubs, linkSubSearch]
  )
  const filteredGiftOptions = useMemo(
    () => giftCorpOptions
      .filter((c) => showClosedGifts || c.status !== "폐업")
      .filter((c) => !linkGiftSearch || c.name.toLowerCase().includes(linkGiftSearch.toLowerCase())),
    [giftCorpOptions, showClosedGifts, linkGiftSearch]
  )

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<FormData>(emptyForm())
  const [addPgNames, setAddPgNames] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const [excelOpen, setExcelOpen] = useState(false)
  const [excelCorpId, setExcelCorpId] = useState<number | "">("")
  const [excelQuarter, setExcelQuarter] = useState("1")
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrMsg, setOcrMsg] = useState("")
  const [ocrPreview, setOcrPreview] = useState<{ imageUrl: string; data: OcrData; setter: (f: FormData) => void; form: FormData } | null>(null)
  const [addAttachedFileName, setAddAttachedFileName] = useState("")
  const [editAttachedFileName, setEditAttachedFileName] = useState("")
  const [editFileUploading, setEditFileUploading] = useState(false)
  const addFileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)

  async function handleOcr(e: React.ChangeEvent<HTMLInputElement>, setter: (f: FormData) => void, form: FormData) {
    const file = e.target.files?.[0]
    if (!file) return
    const imageUrl = URL.createObjectURL(file)
    setOcrLoading(true)
    setOcrMsg("")
    try {
      const [ocrRes, uploadRes] = await Promise.all([
        (async () => {
          const fd = new FormData()
          fd.append("image", file)
          const res = await fetch("/api/ocr/business-license", { method: "POST", body: fd })
          return res.json()
        })(),
        (async () => {
          const fd = new FormData()
          fd.append("file", file)
          const res = await fetch("/upload", { method: "POST", body: fd })
          return res.json()
        })(),
      ])
      if (ocrRes.error) throw new Error(ocrRes.error)
      if (uploadRes.url) {
        setter({ ...form, bizLicenseFileUrl: uploadRes.url })
        setAddAttachedFileName(file.name)
      }
      setOcrPreview({ imageUrl, data: ocrRes, setter, form: { ...form, bizLicenseFileUrl: uploadRes.url ?? form.bizLicenseFileUrl } })
    } catch {
      setOcrMsg("OCR 처리에 실패했습니다.")
      URL.revokeObjectURL(imageUrl)
    } finally {
      setOcrLoading(false)
      e.target.value = ""
    }
  }

  async function handleEditFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEditFileUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.url) {
        setEditForm((f) => ({ ...f, bizLicenseFileUrl: data.url }))
        setEditAttachedFileName(file.name)
      }
    } catch {
      // 업로드 실패 무시
    } finally {
      setEditFileUploading(false)
      e.target.value = ""
    }
  }

  function handleOcrApply(selected: Partial<OcrData>) {
    if (!ocrPreview) return
    const next = { ...ocrPreview.form }
    if (selected.name)         next.name         = selected.name
    if (selected.bizNo)        next.bizNo        = selected.bizNo
    if (selected.corpNo)       next.corpNo       = selected.corpNo
    if (selected.ceo)          next.ceo          = selected.ceo
    if (selected.bizAddress)   next.address      = selected.bizAddress
    if (selected.openDate)     next.openDate     = selected.openDate
    if (selected.businessType) next.businessType = selected.businessType
    if (selected.businessItem) next.businessItem = selected.businessItem
    ocrPreview.setter(next)
    const LABEL: Record<string, string> = {
      name: "법인명", bizNo: "사업자번호", corpNo: "법인번호", ceo: "대표자명",
      bizAddress: "주소", openDate: "개업일", businessType: "업태", businessItem: "종목",
    }
    const filled = Object.keys(selected).map((k) => LABEL[k]).filter(Boolean)
    setOcrMsg(filled.length ? filled.join(" · ") + " 자동입력 완료" : "")
    URL.revokeObjectURL(ocrPreview.imageUrl)
    setOcrPreview(null)
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [data, companies] = await Promise.all([
        api.get<TradingCorp[]>("/api/trading-corporations"),
        api.get<PgCompany[]>("/api/pg-companies"),
      ])
      setRows(Array.isArray(data) ? data.map((r) => ({
        ...r,
        subsidiaries: r.subsidiaries ?? [],
        giftCorps: r.giftCorps ?? [],
        pgs: r.pgs ?? [],
      })) : [])
      setPgCompanies(Array.isArray(companies) ? companies : [])
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "불러오기에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const basicMatch = columns.every((col) => {
        const term = filters[col.key]?.trim()
        if (!term) return true
        return String(row[col.key] ?? "").toLowerCase().includes(term.toLowerCase())
      })
      if (!basicMatch) return false
      if (subFilter.trim() && !(row.subsidiaries ?? []).some((c) => c.name.toLowerCase().includes(subFilter.toLowerCase()))) return false
      if (giftFilter.trim() && !(row.giftCorps ?? []).some((c) => c.name.toLowerCase().includes(giftFilter.toLowerCase()))) return false
      return true
    }).sort((a, b) => (b.registeredAt ?? "").localeCompare(a.registeredAt ?? ""))
  }, [rows, filters, subFilter, giftFilter])

  function setFilter(key: ColKey, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function openDetail(row: TradingCorp) {
    setDetail(row)
    setEditMode(false)
    setEditForm({
      name: row.name, bizNo: row.bizNo, corpNo: row.corpNo ?? "", ceo: row.ceo, contact: row.contact,
      email: row.email, address: row.address, account: row.account,
      tradingType: row.tradingType, businessType: row.businessType ?? "",
      businessItem: row.businessItem ?? "", note: row.note, openDate: row.openDate ?? "",
      bizLicenseFileUrl: row.bizLicenseFileUrl ?? "",
    })
    setEditAttachedFileName("")
    setDetailPgs(row.pgs ?? [])
    setLinkedSubs(row.subsidiaries ?? [])
    setLinkedGifts(row.giftCorps ?? [])
    setSubmitError(null)
    setLinkSubSearch("")
    setLinkGiftSearch("")
    setShowClosedSubs(false)
    setShowClosedGifts(false)
  }

  async function handleAddPg(tradingCorpId: number, pgCompanyName: string) {
    try {
      const pg = await api.post<PgEntry>(`/api/trading-corporations/${tradingCorpId}/pgs`, { pgCompanyName })
      const newPg = { id: pg.id, pgCompanyName: pg.pgCompanyName }
      setDetailPgs((prev) => [...prev, newPg])
      setRows((prev) => prev.map((r) => r.id === tradingCorpId ? { ...r, pgs: [...(r.pgs ?? []), newPg] } : r))
      setDetail((d) => d ? { ...d, pgs: [...(d.pgs ?? []), newPg] } : d)
    } catch {
      // 실패 시 무시
    }
  }

  async function handleRemovePg(tradingCorpId: number, pgId: number) {
    try {
      await api.delete(`/api/trading-corporations/${tradingCorpId}/pgs/${pgId}`)
      setDetailPgs((prev) => prev.filter((p) => p.id !== pgId))
      setRows((prev) => prev.map((r) => r.id === tradingCorpId ? { ...r, pgs: (r.pgs ?? []).filter((p) => p.id !== pgId) } : r))
      setDetail((d) => d ? { ...d, pgs: (d.pgs ?? []).filter((p) => p.id !== pgId) } : d)
    } catch {
      // 실패 시 무시
    }
  }

  async function handleAddPgCompany(name: string) {
    try {
      const company = await api.post<PgCompany>("/api/pg-companies", { name })
      setPgCompanies((prev) => prev.some((c) => c.name === name) ? prev : [...prev, company])
    } catch {
      // 실패 시 무시
    }
  }

  async function saveLinks(subs: LinkedCorp[], gifts: LinkedCorp[]) {
    if (!detail) return
    setLinkSaving(true)
    try {
      await api.put(`/api/trading-corporations/${detail.id}/links`, {
        subsidiaryIds: subs.map((c) => c.id),
        giftCorpIds: gifts.map((c) => c.id),
      })
    } catch {
      // 링크 저장 실패 시 로컬 상태는 유지
    } finally {
      setLinkSaving(false)
    }
    const updated = { ...detail, subsidiaries: subs, giftCorps: gifts }
    setDetail(updated)
    setRows((prev) => prev.map((r) => r.id === detail.id ? updated : r))
  }

  function addLinkedSub(corp: LinkedCorp) {
    const next = [corp]
    setLinkedSubs(next)
    saveLinks(next, linkedGifts)
  }

  function removeLinkedSub(id: number) {
    const next = linkedSubs.filter((c) => c.id !== id)
    setLinkedSubs(next)
    saveLinks(next, linkedGifts)
  }

  function addLinkedGift(corp: LinkedCorp) {
    const next = [corp]
    setLinkedGifts(next)
    saveLinks(linkedSubs, next)
  }

  function removeLinkedGift(id: number) {
    const next = linkedGifts.filter((c) => c.id !== id)
    setLinkedGifts(next)
    saveLinks(linkedSubs, next)
  }

  function getLinkedRegionKey(linked: LinkedCorp[]): string {
    for (const c of linked) {
      const fc = allCorps.find((ac) => ac.id === c.id)
      if (!fc) continue
      const k = getSidoKey(fc.region || fc.bizAddress || "")
      if (k) return k
    }
    return ""
  }

  // 하위 법인과 상품권 법인 간 지역 중복만 체크
  // 겹치면 표시용 지역 레이블 반환, 없으면 ""
  function checkSameRegion(corp: { region: string; bizAddress: string }, targetList: LinkedCorp[]): string {
    const corpSrc = corp.region || corp.bizAddress || ""
    const corpKey = getSidoKey(corpSrc)
    if (!corpKey) return ""
    const counterKey = getLinkedRegionKey(targetList)
    if (!counterKey || counterKey !== corpKey) return ""
    return getSidoLabel(corpSrc) || corpKey
  }

  function tryAddLinkedSub(selectedId: string) {
    const corp = filteredSubOptions.find((c) => String(c.id) === selectedId)
    if (!corp || !corp.id) return
    const link: LinkedCorp = { id: corp.id, name: corp.name }
    // 상품권 법인과 지역 비교
    const regionLabel = checkSameRegion(corp, linkedGifts)
    if (regionLabel) {
      setPendingLink({ type: "sub", corp: link, region: regionLabel })
      return
    }
    addLinkedSub(link)
  }

  function tryAddLinkedGift(selectedId: string) {
    const corp = filteredGiftOptions.find((c) => String(c.id) === selectedId)
    if (!corp || !corp.id) return
    const link: LinkedCorp = { id: corp.id, name: corp.name }
    // 하위 법인과 지역 비교
    const regionLabel = checkSameRegion(corp, linkedSubs)
    if (regionLabel) {
      setPendingLink({ type: "gift", corp: link, region: regionLabel })
      return
    }
    addLinkedGift(link)
  }

  function confirmPendingLink() {
    if (!pendingLink) return
    if (pendingLink.type === "sub") addLinkedSub(pendingLink.corp)
    else addLinkedGift(pendingLink.corp)
    setPendingLink(null)
  }

  async function handleAdd() {
    if (!addForm.name.trim()) { setSubmitError("법인명을 입력해주세요."); return }
    setSubmitError(null)
    setSubmitting(true)
    try {
      const created = await api.post<TradingCorp>("/api/trading-corporations", { ...addForm, pgNames: addPgNames })
      setRows((prev) => [{ ...created, subsidiaries: created.subsidiaries ?? [], giftCorps: created.giftCorps ?? [], pgs: created.pgs ?? [] }, ...prev])
      setAddOpen(false)
      setAddForm(emptyForm())
      setAddPgNames([])
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : "등록에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit() {
    if (!detail?.id || !editForm.name.trim()) { setSubmitError("법인명을 입력해주세요."); return }
    setSubmitError(null)
    setSubmitting(true)
    try {
      const updated = await api.put<TradingCorp>(`/api/trading-corporations/${detail.id}`, editForm)
      const withLinks = { ...updated, subsidiaries: linkedSubs, giftCorps: linkedGifts, pgs: detailPgs }
      setRows((prev) => prev.map((r) => r.id === detail.id ? withLinks : r))
      setDetail(withLinks)
      setEditMode(false)
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : "수정에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!detail?.id) return
    setSubmitting(true)
    try {
      await api.delete(`/api/trading-corporations/${detail.id}`)
      setRows((prev) => prev.filter((r) => r.id !== detail.id))
      setDetail(null)
      setDeleteConfirm(false)
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : "삭제에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleExcelDownload() {
    const corp = rows.find((r) => r.id === excelCorpId)
    if (!corp) return
    const cleanBizNo = corp.bizNo.replace(/-/g, "")
    const currentYear = new Date().getFullYear()
    const fileName = `E_${cleanBizNo}_${currentYear}${excelQuarter}_1.xlsx`

    const subCorpId = corp.subsidiaries?.[0]?.id
    const subCorp = subCorpId ? allCorps.find((c) => c.id === subCorpId) : null

    const headerTexts = [
      "레코드\n구분", "결제\n연도", "분기\n구분", "제출자\n사업자번호", "일련\n번호",
      "의뢰업체\n사업자번호", "의뢰업체\n대표자주민번호", "의뢰업체\n관리번호",
      "결재대행\n년월", "결제구분", "결재대행\n건수",
      "봉사료금액\n음수표시", "봉사료금액",
      "봉사료제외금액\n음수표시", "봉사료제외금액",
      "결재대행금액\n음수표시", "결재대행금액",
      "의뢰업체\n아이디", "의뢰업체\n아이디수",
      "의뢰업체\n전화번호", "의뢰업체\n휴대폰번호",
      "의뢰업체\nE-Mail주소", "의뢰업체\n코드/구분",
    ]

    const s = (v: string | undefined | null) => (v ?? "").replace(/[-\s]/g, "")
    const dataRow: string[] = headerTexts.map(() => "")
    dataRow[0]  = "RD"
    dataRow[1]  = String(currentYear)
    dataRow[2]  = excelQuarter
    dataRow[3]  = s(corp.bizNo)
    dataRow[4]  = "1"
    dataRow[5]  = s(subCorp?.bizNo)
    dataRow[6]  = s(subCorp?.residentNo)
    dataRow[17] = s(subCorp?.hometaxId)
    dataRow[18] = s(subCorp?.irosUserNo)
    dataRow[19] = s(subCorp?.phone)
    dataRow[20] = s(subCorp?.phone)
    dataRow[21] = s(subCorp?.bizEmail)
    dataRow[22] = "C"

    const headerStyle = {
      fill: { patternType: "solid", fgColor: { rgb: "FFC000" } },
      font: { name: "맑은 고딕", sz: 10, bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top:    { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left:   { style: "thin", color: { rgb: "000000" } },
        right:  { style: "thin", color: { rgb: "000000" } },
      },
    }

    const dataStyle = {
      font: { name: "맑은 고딕", sz: 10 },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top:    { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left:   { style: "thin", color: { rgb: "CCCCCC" } },
        right:  { style: "thin", color: { rgb: "CCCCCC" } },
      },
    }

    const colWidths = headerTexts.map((h) => ({
      wch: h.includes("대표자주민번호") ? 20
         : h.includes("E-Mail") ? 35
         : h.includes("사업자번호") || h.includes("전화번호") || h.includes("휴대폰번호") ? 20
         : h.includes("봉사료제외금액") || h.includes("결재대행금액") ? 16
         : h.includes("봉사료금액") ? 14
         : 10,
    }))

    const ws: Record<string, unknown> = {
      "!ref": XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 1, c: headerTexts.length - 1 } }),
      "!cols": colWidths,
      "!rows": [{ hpt: 40 }, { hpt: 20 }],
    }

    headerTexts.forEach((text, i) => {
      ws[XLSX.utils.encode_cell({ r: 0, c: i })] = { v: text, t: "s", s: headerStyle }
    })
    dataRow.forEach((val, i) => {
      ws[XLSX.utils.encode_cell({ r: 1, c: i })] = { v: val, t: "s", s: dataStyle }
    })

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
    XLSX.writeFile(wb, fileName)
    setExcelOpen(false)
  }

  const totalCols = columns.length + 2

  return (
    <>
    {ocrPreview && (
      <OcrPreviewDialog
        imageUrl={ocrPreview.imageUrl}
        data={ocrPreview.data}
        onApply={handleOcrApply}
        onClose={() => { URL.revokeObjectURL(ocrPreview.imageUrl); setOcrPreview(null) }}
      />
    )}
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="mobile-hidden text-xl font-semibold tracking-tight text-foreground">거래 법인</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "불러오는 중..." : `전체 ${rows.length}건 · 현재 ${filteredRows.length}건 표시`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { setExcelCorpId(""); setExcelQuarter("1"); setExcelOpen(true) }}>
            <Download className="h-4 w-4 mr-1" />
            엑셀 다운로드
          </Button>
          <Button size="sm" onClick={() => { setAddForm(emptyForm()); setAddPgNames([]); setSubmitError(null); setAddOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" />
            거래 법인 등록
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      )}

      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="min-h-80 max-h-[calc(100svh-14rem)] overflow-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20 bg-muted">
                <tr className="text-left text-muted-foreground">
                  {columns.map((col) => (
                    <th key={col.key} className="border-b border-border bg-muted px-3 py-2.5 align-middle font-medium" style={{ minWidth: col.minWidth }}>
                      <Input value={filters[col.key] ?? ""} onChange={(e) => setFilter(col.key, e.target.value)} placeholder={col.label} className="h-8 bg-background text-xs font-normal" />
                    </th>
                  ))}
                  <th className="border-b border-border bg-muted px-3 py-2.5 align-middle font-medium" style={{ minWidth: "200px" }}>
                    <Input value={subFilter} onChange={(e) => setSubFilter(e.target.value)} placeholder="하위 법인" className="h-8 bg-background text-xs font-normal" />
                  </th>
                  <th className="border-b border-border bg-muted px-3 py-2.5 align-middle font-medium" style={{ minWidth: "200px" }}>
                    <Input value={giftFilter} onChange={(e) => setGiftFilter(e.target.value)} placeholder="상품권 법인" className="h-8 bg-background text-xs font-normal" />
                  </th>
                  <th className="border-b border-border bg-muted px-3 py-2.5 align-middle font-medium" style={{ minWidth: "160px" }}>
                    <div className="h-8 flex items-center px-1 text-xs font-medium text-muted-foreground">PG</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={totalCols + 1} className="h-64 px-4 py-10 text-center text-muted-foreground">
                      {loading ? "불러오는 중..." : "등록된 거래 법인이 없습니다."}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-accent/50" onClick={() => openDetail(row)}>
                      {columns.map((col) => (
                        <td key={col.key} className="whitespace-nowrap px-3 py-2.5 text-foreground" style={{ minWidth: col.minWidth }}>
                          {col.key === "tradingType" ? (
                            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", tradingTypeStyle[row.tradingType] ?? "bg-muted text-muted-foreground")}>{row.tradingType}</span>
                          ) : col.key === "name" ? (
                            <span className="font-medium">{row.name}</span>
                          ) : col.key === "note" ? (
                            <span className="text-muted-foreground">{row[col.key] || "-"}</span>
                          ) : (
                            <span>{String(row[col.key] ?? "") || "-"}</span>
                          )}
                        </td>
                      ))}
                      {/* 하위 법인 */}
                      <td className="px-3 py-2.5" style={{ minWidth: "200px" }}>
                        {(row.subsidiaries ?? []).length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {row.subsidiaries.map((c) => (
                              <span key={c.id} className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">{c.name}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      {/* 상품권 법인 */}
                      <td className="px-3 py-2.5" style={{ minWidth: "200px" }}>
                        {(row.giftCorps ?? []).length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {row.giftCorps.map((c) => (
                              <span key={c.id} className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">{c.name}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      {/* PG */}
                      <td className="px-3 py-2.5" style={{ minWidth: "160px" }}>
                        {(row.pgs ?? []).length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {row.pgs.map((pg) => (
                              <span key={pg.id} className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">{pg.pgCompanyName}</span>
                            ))}
                          </div>
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

      {/* 상세 팝업 */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setEditMode(false) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-base font-semibold">거래 법인 상세</DialogTitle>
          </DialogHeader>
          {detail && (
            <>
              <div className="flex max-h-[calc(75dvh-10rem)] sm:max-h-[calc(85dvh-10rem)] flex-col gap-4 overflow-y-auto px-6 py-5">
                {submitError && <p className="text-xs text-destructive">{submitError}</p>}

                {/* 기본 정보 */}
                {editMode ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field id="e-name" label="법인명 *" value={editForm.name} onChange={(v) => setEditForm((f) => ({ ...f, name: v }))} />
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">거래 유형</Label>
                      <select value={editForm.tradingType} onChange={(e) => setEditForm((f) => ({ ...f, tradingType: e.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                        {TRADING_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <Field id="e-bizNo" label="사업자번호" value={editForm.bizNo} onChange={(v) => setEditForm((f) => ({ ...f, bizNo: v }))} placeholder="000-00-00000" />
                    <Field id="e-corpNo" label="법인번호" value={editForm.corpNo} onChange={(v) => setEditForm((f) => ({ ...f, corpNo: v }))} placeholder="000000-0000000" />
                    <Field id="e-ceo" label="대표자" value={editForm.ceo} onChange={(v) => setEditForm((f) => ({ ...f, ceo: v }))} />
                    <Field id="e-contact" label="연락처" value={editForm.contact} onChange={(v) => setEditForm((f) => ({ ...f, contact: v }))} />
                    <Field id="e-email" label="이메일" value={editForm.email} onChange={(v) => setEditForm((f) => ({ ...f, email: v }))} />
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="e-openDate" className="text-xs text-muted-foreground">개업일</Label>
                      <Input id="e-openDate" type="date" value={editForm.openDate} onChange={(e) => setEditForm((f) => ({ ...f, openDate: e.target.value }))} />
                    </div>
                    <Field id="e-businessType" label="업태" value={editForm.businessType} onChange={(v) => setEditForm((f) => ({ ...f, businessType: v }))} placeholder="예: 서비스업" />
                    <Field id="e-businessItem" label="종목" value={editForm.businessItem} onChange={(v) => setEditForm((f) => ({ ...f, businessItem: v }))} placeholder="예: 소프트웨어 개발" />
                    <div className="col-span-1 sm:col-span-2">
                      <Field id="e-address" label="주소" value={editForm.address} onChange={(v) => setEditForm((f) => ({ ...f, address: v }))} />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <Field id="e-account" label="계좌번호" value={editForm.account} onChange={(v) => setEditForm((f) => ({ ...f, account: v }))} />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <Field id="e-note" label="비고" value={editForm.note} onChange={(v) => setEditForm((f) => ({ ...f, note: v }))} />
                    </div>
                    {/* 사업자등록증 첨부 (편집 모드) */}
                    <div className="col-span-1 sm:col-span-2 flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">사업자등록증 첨부</Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input ref={editFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleEditFileChange} />
                        <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 text-xs" disabled={editFileUploading} onClick={() => editFileRef.current?.click()}>
                          {editFileUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {editFileUploading ? "업로드 중..." : editForm.bizLicenseFileUrl ? "파일 교체" : "파일 첨부"}
                        </Button>
                        {editForm.bizLicenseFileUrl && (
                          <>
                            <a href={editForm.bizLicenseFileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary underline underline-offset-2 max-w-[180px] truncate">
                              <Paperclip className="h-3.5 w-3.5 shrink-0" />
                              {editAttachedFileName || "첨부파일 보기"}
                            </a>
                            <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => { setEditForm((f) => ({ ...f, bizLicenseFileUrl: "" })); setEditAttachedFileName("") }}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DF label="법인명" value={detail.name} />
                    <DF label="거래 유형">
                      <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", tradingTypeStyle[detail.tradingType] ?? "bg-muted text-muted-foreground")}>{detail.tradingType}</span>
                    </DF>
                    <DF label="사업자번호" value={detail.bizNo} />
                    <DF label="법인번호" value={detail.corpNo} />
                    <DF label="대표자" value={detail.ceo} />
                    <DF label="개업일" value={detail.openDate ?? ""} />
                    <DF label="연락처" value={detail.contact} />
                    <DF label="이메일" value={detail.email} />
                    <DF label="업태" value={detail.businessType} />
                    <DF label="종목" value={detail.businessItem} />
                    <DF label="주소" value={detail.address} className="col-span-1 sm:col-span-2" />
                    <DF label="계좌번호" value={detail.account} className="col-span-1 sm:col-span-2" />
                    <DF label="비고" value={detail.note} className="col-span-1 sm:col-span-2" />
                    {detail.registeredAt && <p className="col-span-1 sm:col-span-2 text-xs text-muted-foreground">등록일: {detail.registeredAt}</p>}
                    {detail.bizLicenseFileUrl && (
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">사업자등록증 첨부</p>
                        <a href={detail.bizLicenseFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary underline underline-offset-2">
                          <Paperclip className="h-3.5 w-3.5" />
                          첨부파일 보기
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* PG 섹션 */}
                <div className="border-t border-border pt-4">
                  <PgSection
                    pgs={detailPgs}
                    pgCompanies={pgCompanies}
                    onAdd={(name) => handleAddPg(detail.id, name)}
                    onRemove={(pgId) => handleRemovePg(detail.id, pgId)}
                    onAddCompany={handleAddPgCompany}
                  />
                </div>

                {/* 연결 법인 */}
                {!editMode && (
                  <div className="border-t border-border pt-4 flex flex-col gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">연결 법인</p>

                    {/* 하위 법인 */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-muted-foreground">하위 법인</span>
                      {linkedSubs.length === 0 ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <Input
                              value={linkSubSearch}
                              onChange={(e) => setLinkSubSearch(e.target.value)}
                              placeholder="법인명 검색..."
                              className="h-8 text-xs"
                            />
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={showClosedSubs}
                                onChange={(e) => setShowClosedSubs(e.target.checked)}
                                className="h-3.5 w-3.5"
                              />
                              폐업 보기
                            </label>
                          </div>
                          <select
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                            defaultValue=""
                            onChange={(e) => tryAddLinkedSub(e.target.value)}
                          >
                            <option value="" disabled>하위 법인 선택</option>
                            {filteredSubOptions.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}{c.status === "폐업" ? " (폐업)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {linkedSubs.map((c) => {
                            const fullCorp = allCorps.find((ac) => ac.id === c.id)
                            const address = fullCorp?.region || fullCorp?.bizAddress || ""
                            return (
                              <div key={c.id} className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-sky-100 px-3 py-1.5 text-sm font-medium text-sky-700">
                                  {c.name}
                                  <button type="button" onClick={() => removeLinkedSub(c.id)} className="hover:text-sky-900">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </span>
                                {address && <p className="pl-1 text-xs text-muted-foreground">{address}</p>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* 상품권 법인 */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-muted-foreground">상품권 법인</span>
                      {linkedGifts.length === 0 ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <Input
                              value={linkGiftSearch}
                              onChange={(e) => setLinkGiftSearch(e.target.value)}
                              placeholder="법인명 검색..."
                              className="h-8 text-xs"
                            />
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={showClosedGifts}
                                onChange={(e) => setShowClosedGifts(e.target.checked)}
                                className="h-3.5 w-3.5"
                              />
                              폐업 보기
                            </label>
                          </div>
                          <select
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                            defaultValue=""
                            onChange={(e) => tryAddLinkedGift(e.target.value)}
                          >
                            <option value="" disabled>상품권 법인 선택</option>
                            {filteredGiftOptions.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}{c.status === "폐업" ? " (폐업)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {linkedGifts.map((c) => {
                            const fullCorp = allCorps.find((ac) => ac.id === c.id)
                            const address = fullCorp?.region || fullCorp?.bizAddress || ""
                            return (
                              <div key={c.id} className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-orange-100 px-3 py-1.5 text-sm font-medium text-orange-700">
                                  {c.name}
                                  <button type="button" onClick={() => removeLinkedGift(c.id)} className="hover:text-orange-900">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </span>
                                {address && <p className="pl-1 text-xs text-muted-foreground">{address}</p>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {linkSaving && <p className="text-xs text-muted-foreground">저장 중...</p>}
                  </div>
                )}
              </div>

              <DialogFooter className="border-t border-border px-6 pt-5 pb-8 gap-3">
                {editMode ? (
                  <>
                    <Button variant="outline" className="flex-1" disabled={submitting} onClick={() => { setEditMode(false); setSubmitError(null) }}>취소</Button>
                    <Button className="flex-1" disabled={submitting} onClick={handleEdit}>{submitting ? "저장 중..." : "저장"}</Button>
                  </>
                ) : (
                  <div className="flex w-full items-center gap-3">
                    <Button variant="outline" className="flex-1 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30" disabled={submitting} onClick={() => setDeleteConfirm(true)}>
                      <Trash2 className="h-4 w-4" />삭제
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => setEditMode(true)}>수정</Button>
                    <Button variant="outline" className="flex-1" onClick={() => setDetail(null)}>닫기</Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <Dialog open={deleteConfirm} onOpenChange={(o) => { if (!o) setDeleteConfirm(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>거래 법인 삭제</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            <span className="font-semibold text-foreground">{detail?.name}</span>을(를) 삭제합니다.<br />
            삭제된 데이터는 복구할 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={submitting} onClick={() => setDeleteConfirm(false)}>취소</Button>
            <Button variant="destructive" disabled={submitting} onClick={handleDelete}>{submitting ? "삭제 중..." : "삭제"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 주소지 중복 경고 */}
      <Dialog open={!!pendingLink} onOpenChange={(o) => { if (!o) setPendingLink(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>주소지 확인</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            <span className="font-semibold text-foreground">{pendingLink?.corp.name}</span>의 주소지가 같은 지역(<span className="font-semibold text-foreground">{pendingLink?.region}</span>)에 이미 연결된 법인이 있습니다.<br />
            그래도 등록하겠습니까?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingLink(null)}>취소</Button>
            <Button onClick={confirmPendingLink}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 등록 팝업 */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) setAddOpen(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-base font-semibold">거래 법인 등록</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[calc(75dvh-10rem)] sm:max-h-[calc(85dvh-10rem)] flex-col gap-4 overflow-y-auto px-6 py-5">
            {submitError && <p className="text-xs text-destructive">{submitError}</p>}
            {/* 사업자등록증 OCR + 파일 첨부 */}
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <input ref={addFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleOcr(e, setAddForm, addForm)} />
                <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" disabled={ocrLoading} onClick={() => { setOcrMsg(""); addFileRef.current?.click() }}>
                  {ocrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {ocrLoading ? "업로드 중..." : "사업자등록증 업로드"}
                </Button>
                <span className="text-xs text-muted-foreground">{ocrMsg || "업로드하면 자동입력 + 파일로 저장됩니다."}</span>
              </div>
              {addForm.bizLicenseFileUrl && (
                <div className="flex items-center gap-2 pl-1">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={addForm.bizLicenseFileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline underline-offset-2 truncate max-w-[220px]">
                    {addAttachedFileName || "첨부파일"}
                  </a>
                  <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => { setAddForm((f) => ({ ...f, bizLicenseFileUrl: "" })); setAddAttachedFileName("") }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field id="a-name" label="법인명 *" value={addForm.name} onChange={(v) => setAddForm((f) => ({ ...f, name: v }))} />
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">거래 유형</Label>
                <select value={addForm.tradingType} onChange={(e) => setAddForm((f) => ({ ...f, tradingType: e.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  {TRADING_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <Field id="a-bizNo" label="사업자번호" value={addForm.bizNo} onChange={(v) => setAddForm((f) => ({ ...f, bizNo: v }))} placeholder="000-00-00000" />
              <Field id="a-corpNo" label="법인번호" value={addForm.corpNo} onChange={(v) => setAddForm((f) => ({ ...f, corpNo: v }))} placeholder="000000-0000000" />
              <Field id="a-ceo" label="대표자" value={addForm.ceo} onChange={(v) => setAddForm((f) => ({ ...f, ceo: v }))} />
              <Field id="a-contact" label="연락처" value={addForm.contact} onChange={(v) => setAddForm((f) => ({ ...f, contact: v }))} />
              <Field id="a-email" label="이메일" value={addForm.email} onChange={(v) => setAddForm((f) => ({ ...f, email: v }))} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="a-openDate" className="text-xs text-muted-foreground">개업일</Label>
                <Input id="a-openDate" type="date" value={addForm.openDate} onChange={(e) => setAddForm((f) => ({ ...f, openDate: e.target.value }))} />
              </div>
              <Field id="a-businessType" label="업태" value={addForm.businessType} onChange={(v) => setAddForm((f) => ({ ...f, businessType: v }))} placeholder="예: 서비스업" />
              <Field id="a-businessItem" label="종목" value={addForm.businessItem} onChange={(v) => setAddForm((f) => ({ ...f, businessItem: v }))} placeholder="예: 소프트웨어 개발" />
              <div className="col-span-1 sm:col-span-2">
                <Field id="a-address" label="주소" value={addForm.address} onChange={(v) => setAddForm((f) => ({ ...f, address: v }))} />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <Field id="a-account" label="계좌번호" value={addForm.account} onChange={(v) => setAddForm((f) => ({ ...f, account: v }))} />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <Field id="a-note" label="비고" value={addForm.note} onChange={(v) => setAddForm((f) => ({ ...f, note: v }))} />
              </div>
              <PgSectionForm
                pgNames={addPgNames}
                pgCompanies={pgCompanies}
                onChange={setAddPgNames}
                onAddCompany={handleAddPgCompany}
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border px-6 pt-5 pb-8 gap-3">
            <Button variant="outline" className="flex-1" disabled={submitting} onClick={() => setAddOpen(false)}>취소</Button>
            <Button className="flex-1" disabled={submitting} onClick={handleAdd}>{submitting ? "등록 중..." : "등록"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 엑셀 다운로드 */}
      <Dialog open={excelOpen} onOpenChange={(o) => { if (!o) setExcelOpen(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-base font-semibold">엑셀 다운로드</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">거래 법인 선택</Label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                value={excelCorpId}
                onChange={(e) => setExcelCorpId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="" disabled>법인 선택</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}{r.bizNo ? ` (${r.bizNo})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">분기</Label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                value={excelQuarter}
                onChange={(e) => setExcelQuarter(e.target.value)}
              >
                <option value="1">1분기</option>
                <option value="2">2분기</option>
                <option value="3">3분기</option>
                <option value="4">4분기</option>
              </select>
            </div>
            {excelCorpId && (
              <p className="text-xs text-muted-foreground">
                파일명: <span className="font-medium text-foreground">E_{rows.find(r => r.id === excelCorpId)?.bizNo.replace(/-/g, "")}_2026{excelQuarter}_1.xlsx</span>
              </p>
            )}
          </div>
          <DialogFooter className="border-t border-border px-6 pt-5 pb-8 gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setExcelOpen(false)}>취소</Button>
            <Button className="flex-1" disabled={!excelCorpId} onClick={handleExcelDownload}>
              <Download className="h-4 w-4 mr-1" />
              다운로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  )
}

function DF({ label, value, children, className }: {
  label: string; value?: string; children?: React.ReactNode; className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {children ?? <span className="text-sm font-medium text-foreground">{value || "-"}</span>}
    </div>
  )
}
