"use client"

import { useRef, useState } from "react"
import { Loader2, Paperclip, Plus, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type OcrData = {
  name: string
  bizNo: string
  corpNo: string
  ceo: string
  openDate: string
  bizAddress: string
  businessType: string
  businessItem: string
}

const OCR_FIELDS: { key: keyof OcrData; label: string }[] = [
  { key: "name",         label: "법인명" },
  { key: "bizNo",        label: "사업자번호" },
  { key: "corpNo",       label: "법인번호" },
  { key: "ceo",          label: "대표자명" },
  { key: "openDate",     label: "개업연월일" },
  { key: "bizAddress",   label: "사업장소재지" },
  { key: "businessType", label: "업태" },
  { key: "businessItem", label: "종목" },
]

export function OcrPreviewDialog({
  imageUrl,
  data,
  onApply,
  onClose,
}: {
  imageUrl: string
  data: OcrData
  onApply: (selected: Partial<OcrData>) => void
  onClose: () => void
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const { key } of OCR_FIELDS) init[key] = !!data[key]
    return init
  })
  const [edits, setEdits] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const { key } of OCR_FIELDS) init[key] = data[key] ?? ""
    return init
  })
  const [editingKey, setEditingKey] = useState<string | null>(null)

  const selectedCount = Object.values(checked).filter(Boolean).length

  function toggle(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function commitEdit(key: string) {
    setEditingKey(null)
    const val = edits[key]?.trim() ?? ""
    setEdits((prev) => ({ ...prev, [key]: val }))
    setChecked((prev) => ({ ...prev, [key]: !!val }))
  }

  function handleApply() {
    const selected: Partial<OcrData> = {}
    for (const { key } of OCR_FIELDS) {
      const val = edits[key]?.trim()
      if (checked[key] && val) selected[key] = val
    }
    onApply(selected)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-4xl w-full gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>사업자등록증 인식 결과</DialogTitle>
          <DialogDescription>인식된 항목을 확인하고, 값을 클릭하면 직접 수정할 수 있습니다.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row max-h-[75vh] overflow-hidden">
          {/* 이미지 미리보기 */}
          <div className="sm:w-80 shrink-0 border-b sm:border-b-0 sm:border-r border-border p-4 flex items-start justify-center bg-muted/20 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="사업자등록증" className="w-full h-full object-contain rounded shadow-sm" style={{ maxHeight: "60vh" }} />
          </div>
          {/* 인식 결과 */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-1">
            <p className="text-xs text-muted-foreground mb-3">적용할 항목을 선택하고, 값을 클릭하면 수정할 수 있습니다.</p>
            {OCR_FIELDS.map(({ key, label }) => {
              const val = edits[key] ?? ""
              const hasVal = !!val
              const on = hasVal && checked[key]
              const isEditing = editingKey === key
              const isChanged = val !== (data[key] ?? "")
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded shrink-0 cursor-pointer"
                    checked={on}
                    onChange={() => hasVal && toggle(key)}
                  />
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground">=</span>
                  {isEditing ? (
                    <Input
                      autoFocus
                      value={val}
                      onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                      onBlur={() => commitEdit(key)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(key) }}
                      className="flex-1 h-7 text-sm py-0"
                    />
                  ) : (
                    <span
                      onClick={() => setEditingKey(key)}
                      title="클릭하여 수정"
                      className={cn(
                        "flex-1 text-sm truncate cursor-text rounded px-1 -mx-1 hover:bg-accent transition-colors",
                        hasVal ? "font-medium text-foreground" : "italic text-muted-foreground",
                      )}
                    >
                      {val || "인식 안됨 · 클릭하여 입력"}
                    </span>
                  )}
                  {isChanged && !isEditing && hasVal && (
                    <span className="shrink-0 text-[10px] text-amber-600 font-medium">수정됨</span>
                  )}
                  {!isEditing && (
                    <span className={cn("shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded-full", on ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground")}>
                      {on ? "적용" : "제외"}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <DialogFooter className="border-t border-border px-6 py-4 gap-2">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleApply} disabled={selectedCount === 0}>
            {selectedCount}개 항목 적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const CATEGORY_OPTIONS = ["운영 법인", "하위 법인", "상품권 법인", "계약법인(영세)", "기타"]
export const STATUS_OPTIONS = ["활성", "진행중", "대기중", "중지", "폐업"]

export const SIDO_LIST = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
  "대전광역시", "울산광역시", "세종특별자치시",
  "경기도", "강원특별자치도", "충청북도", "충청남도",
  "전북특별자치도", "전라남도", "경상북도", "경상남도", "제주특별자치도",
]

export const SIGUNGU_MAP: Record<string, string[]> = {
  "서울특별시": ["종로구","중구","용산구","성동구","광진구","동대문구","중랑구","성북구","강북구","도봉구","노원구","은평구","서대문구","마포구","양천구","강서구","구로구","금천구","영등포구","동작구","관악구","서초구","강남구","송파구","강동구"],
  "부산광역시": ["중구","서구","동구","영도구","부산진구","동래구","남구","북구","해운대구","사하구","금정구","강서구","연제구","수영구","사상구","기장군"],
  "대구광역시": ["중구","동구","서구","남구","북구","수성구","달서구","달성군"],
  "인천광역시": ["중구","동구","미추홀구","연수구","남동구","부평구","계양구","서구","강화군","옹진군"],
  "광주광역시": ["동구","서구","남구","북구","광산구"],
  "대전광역시": ["동구","중구","서구","유성구","대덕구"],
  "울산광역시": ["중구","남구","동구","북구","울주군"],
  "세종특별자치시": [],
  "경기도": ["수원시","성남시","의정부시","안양시","부천시","광명시","평택시","동두천시","안산시","고양시","과천시","구리시","남양주시","오산시","시흥시","군포시","의왕시","하남시","용인시","파주시","이천시","안성시","김포시","화성시","광주시","양주시","포천시","여주시","양평군","가평군","연천군"],
  "강원특별자치도": ["춘천시","원주시","강릉시","동해시","태백시","속초시","삼척시","홍천군","횡성군","영월군","평창군","정선군","철원군","화천군","양구군","인제군","고성군","양양군"],
  "충청북도": ["청주시","충주시","제천시","보은군","옥천군","영동군","증평군","진천군","괴산군","음성군","단양군"],
  "충청남도": ["천안시","공주시","보령시","아산시","서산시","논산시","계룡시","당진시","금산군","부여군","서천군","청양군","홍성군","예산군","태안군"],
  "전북특별자치도": ["전주시","군산시","익산시","정읍시","남원시","김제시","완주군","진안군","무주군","장수군","임실군","순창군","고창군","부안군"],
  "전라남도": ["목포시","여수시","순천시","나주시","광양시","담양군","곡성군","구례군","고흥군","보성군","화순군","장흥군","강진군","해남군","영암군","무안군","함평군","영광군","장성군","완도군","진도군","신안군"],
  "경상북도": ["포항시","경주시","김천시","안동시","구미시","영주시","영천시","상주시","문경시","경산시","군위군","의성군","청송군","영양군","영덕군","청도군","고령군","성주군","칠곡군","예천군","봉화군","울진군","울릉군"],
  "경상남도": ["창원시","진주시","통영시","사천시","김해시","밀양시","거제시","양산시","의령군","함안군","창녕군","고성군","남해군","하동군","산청군","함양군","거창군","합천군"],
  "제주특별자치도": ["제주시","서귀포시"],
}

export function deriveRegion(address: string): string {
  const sido = SIDO_LIST.find(s => address.startsWith(s))
  if (!sido) return ""
  const rest = address.slice(sido.length).trim()
  const sigungu = (SIGUNGU_MAP[sido] ?? []).find(sg => rest.startsWith(sg))
  return sigungu ? `${sido} ${sigungu}` : sido
}

function parseRegion(value: string): { sido: string; sigungu: string } {
  if (!value) return { sido: "", sigungu: "" }
  for (const sido of SIDO_LIST) {
    if (value === sido) return { sido, sigungu: "" }
    if (value.startsWith(sido + " ")) return { sido, sigungu: value.slice(sido.length + 1) }
  }
  return { sido: "", sigungu: "" }
}

export function RegionSelect({ value, onChange, className }: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  const { sido, sigungu } = parseRegion(value)
  const sigunguList = SIGUNGU_MAP[sido] ?? []
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row", className)}>
      <select
        value={sido}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground"
      >
        <option value="">시/도 선택</option>
        {SIDO_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {sido && sigunguList.length > 0 && (
        <select
          value={sigungu}
          onChange={(e) => onChange(sido + (e.target.value ? " " + e.target.value : ""))}
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="">시/군/구 선택</option>
          {sigunguList.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
    </div>
  )
}

export type Shareholder = { name: string; equity: string }

export type Corporation = {
  id?: number
  category: string
  categoryNote?: string
  status: string
  name: string
  intro: string
  region: string
  openDate: string
  startDate: string
  bizNo: string
  corpNo: string
  ceo: string
  auditorDirector: string
  shareholders: Shareholder[]
  residentNo: string
  phone: string
  phonePlan: string
  bizAddress: string
  bizEmail: string
  businessType: string
  businessItem: string
  corpBankName: string
  corpAccountNo: string
  corpAccountPw: string
  personalBankName: string
  personalAccountNo: string
  personalAccountPw: string
  certCorp: string
  certPersonal: string
  certExpiry: string
  iros: string
  irosPw: string
  irosUserNo: string
  hometaxId: string
  hometaxPw: string
  closeDate: string
  progressMemo: string
  note: string
  registeredAt?: string
  createdAt?: string
  updatedAt?: string
  bizLicenseFileUrl?: string
}

const emptyForm: Corporation = {
  category: "운영 법인",
  categoryNote: "",
  status: "활성",
  name: "",
  intro: "",
  region: "",
  openDate: "",
  startDate: "",
  bizNo: "",
  corpNo: "",
  ceo: "",
  auditorDirector: "",
  shareholders: [{ name: "", equity: "" }],
  residentNo: "",
  phone: "",
  phonePlan: "",
  bizAddress: "",
  bizEmail: "",
  businessType: "",
  businessItem: "",
  corpBankName: "",
  corpAccountNo: "",
  corpAccountPw: "",
  personalBankName: "",
  personalAccountNo: "",
  personalAccountPw: "",
  certCorp: "",
  certPersonal: "",
  certExpiry: "",
  iros: "",
  irosPw: "",
  irosUserNo: "",
  hometaxId: "",
  hometaxPw: "",
  closeDate: "",
  progressMemo: "",
  note: "",
  bizLicenseFileUrl: "",
}

export function formatResidentNo(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 13)
  if (digits.length <= 6) return digits
  return `${digits.slice(0, 6)}-${digits.slice(6)}`
}

export function ShareholdersEditor({
  shareholders,
  onChange,
}: {
  shareholders: Shareholder[]
  onChange: (s: Shareholder[]) => void
}) {
  function add() {
    onChange([...shareholders, { name: "", equity: "" }])
  }
  function remove(i: number) {
    onChange(shareholders.filter((_, idx) => idx !== i))
  }
  function update(i: number, field: keyof Shareholder, value: string) {
    onChange(shareholders.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }

  return (
    <div className="col-span-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">주주</Label>
        <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs" onClick={add}>
          <Plus className="h-3 w-3" />
          추가
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {shareholders.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="주주명"
              value={s.name}
              onChange={(e) => update(i, "name", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="지분 (예: 50%)"
              value={s.equity}
              onChange={(e) => update(i, "equity", e.target.value)}
              className="w-32"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => remove(i)}
              disabled={shareholders.length === 1}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline,
  className,
  required,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  multiline?: boolean
  className?: string
  required?: boolean
  error?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={cn(error && "border-destructive focus-visible:ring-destructive")}
        />
      ) : (
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(error && "border-destructive focus-visible:ring-destructive")}
        />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-border p-4">
      <legend className="px-2 text-sm font-semibold text-foreground">{title}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  )
}

export function CorporationFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (corp: Corporation) => Promise<void> | void
}) {
  const [form, setForm] = useState<Corporation>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrMsg, setOcrMsg] = useState("")
  const [ocrPreview, setOcrPreview] = useState<{ imageUrl: string; data: OcrData } | null>(null)
  const [attachedFileName, setAttachedFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleOcr(e: React.ChangeEvent<HTMLInputElement>) {
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
        setForm((prev) => ({ ...prev, bizLicenseFileUrl: uploadRes.url }))
        setAttachedFileName(file.name)
      }
      setOcrPreview({ imageUrl, data: ocrRes })
    } catch {
      setOcrMsg("OCR 처리에 실패했습니다.")
      URL.revokeObjectURL(imageUrl)
    } finally {
      setOcrLoading(false)
      e.target.value = ""
    }
  }

  function handleOcrApply(selected: Partial<OcrData>) {
    const LABEL: Record<string, string> = {
      name: "법인명", bizNo: "사업자번호", corpNo: "법인번호",
      ceo: "대표자명", openDate: "개업일", bizAddress: "사업장소재지",
      businessType: "업태", businessItem: "종목",
    }
    const updates: Partial<Corporation> = {}
    if (selected.name)         updates.name         = selected.name
    if (selected.bizNo)        updates.bizNo        = selected.bizNo
    if (selected.corpNo)       updates.corpNo       = selected.corpNo
    if (selected.ceo)          updates.ceo          = selected.ceo
    if (selected.openDate)     updates.openDate     = selected.openDate
    if (selected.bizAddress)   updates.bizAddress   = selected.bizAddress
    if (selected.businessType) updates.businessType = selected.businessType
    if (selected.businessItem) updates.businessItem = selected.businessItem
    if (selected.bizAddress) {
      const region = deriveRegion(selected.bizAddress)
      if (region) updates.region = region
    }
    setForm((prev) => ({ ...prev, ...updates }))
    const filled = Object.keys(selected).map((k) => LABEL[k]).filter(Boolean)
    setOcrMsg(filled.length ? filled.join(" · ") + " 자동입력 완료" : "")
    if (ocrPreview?.imageUrl) URL.revokeObjectURL(ocrPreview.imageUrl)
    setOcrPreview(null)
  }

  function set<K extends keyof Corporation>(key: K, value: Corporation[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (fieldErrors[key as string]) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[key as string]; return next })
    }
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = "법인명을 입력하세요."
    if (!form.bizNo.trim()) errors.bizNo = "사업자 번호를 입력하세요."
    if (!form.corpNo.trim()) errors.corpNo = "법인 번호를 입력하세요."
    return errors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError(null)
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(form)
      setForm(emptyForm)
      setFieldErrors({})
      onOpenChange(false)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "법인 등록에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) { setFieldErrors({}); setApiError(null) }
    onOpenChange(open)
  }

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-h-[90svh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>법인 등록</DialogTitle>
          <DialogDescription>신규 법인의 기본 정보와 계정 정보를 입력하세요.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex max-h-[calc(75dvh-9rem)] sm:max-h-[calc(90svh-9rem)] flex-col">
          <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
            {/* 사업자등록증 OCR + 파일 첨부 */}
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleOcr} />
                <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" disabled={ocrLoading} onClick={() => fileInputRef.current?.click()}>
                  {ocrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {ocrLoading ? "업로드 중..." : "사업자등록증 업로드"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {ocrMsg || "업로드하면 자동입력 + 파일로 저장됩니다."}
                </span>
              </div>
              {form.bizLicenseFileUrl && (
                <div className="flex items-center gap-2 pl-1">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={form.bizLicenseFileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline underline-offset-2 truncate max-w-[240px]">
                    {attachedFileName || "첨부파일"}
                  </a>
                  <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => { setForm((p) => ({ ...p, bizLicenseFileUrl: "" })); setAttachedFileName("") }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <Section title="기본 정보">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category" className="text-xs text-muted-foreground">구분</Label>
                <div className="flex gap-2">
                  <Select value={form.category} onValueChange={(v) => set("category", v)}>
                    <SelectTrigger id="category"><SelectValue placeholder="구분 선택" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {form.category === "기타" && (
                    <Input id="categoryNote" value={form.categoryNote ?? ""} onChange={(e) => set("categoryNote", e.target.value)} placeholder="내용 입력" />
                  )}
                </div>
              </div>
              <Field id="name" label="법인명" value={form.name} onChange={(v) => set("name", v)} placeholder="예: 한빛컴퍼니" required error={fieldErrors.name} />
              <Field id="intro" label="소개" value={form.intro} onChange={(v) => set("intro", v)} placeholder="법인 소개" />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status" className="text-xs text-muted-foreground">상태</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger id="status"><SelectValue placeholder="상태 선택" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.status === "진행중" && (
                <Field id="progressMemo" label="진행 메모" value={form.progressMemo} onChange={(v) => set("progressMemo", v)} multiline className="col-span-full" placeholder="진행 상황을 입력하세요" />
              )}
              {form.status === "폐업" && (
                <Field id="closeDate" label="폐업일" type="date" value={form.closeDate} onChange={(v) => set("closeDate", v)} />
              )}
              <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">지역</Label>
                <RegionSelect value={form.region} onChange={(v) => set("region", v)} />
              </div>
              <Field id="openDate" label="개업일" type="date" value={form.openDate} onChange={(v) => set("openDate", v)} />
              <Field id="startDate" label="개시일" type="date" value={form.startDate} onChange={(v) => set("startDate", v)} />
              <Field id="bizNo" label="사업자 번호" value={form.bizNo} onChange={(v) => set("bizNo", v)} placeholder="000-00-00000" required error={fieldErrors.bizNo} />
              <Field id="corpNo" label="법인 번호" value={form.corpNo} onChange={(v) => set("corpNo", v)} placeholder="000000-0000000" required error={fieldErrors.corpNo} />
            </Section>

            <Section title="대표 / 임원 정보">
              <Field id="ceo" label="법인 대표" value={form.ceo} onChange={(v) => set("ceo", v)} placeholder="대표자명" />
              <Field id="auditorDirector" label="감사 / 사내이사" value={form.auditorDirector} onChange={(v) => set("auditorDirector", v)} placeholder="성명" />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="residentNo" className="text-xs text-muted-foreground">주민번호</Label>
                <Input
                  id="residentNo"
                  value={form.residentNo}
                  onChange={(e) => set("residentNo", formatResidentNo(e.target.value))}
                  placeholder="000000-0000000"
                  maxLength={14}
                />
              </div>
              <Field id="phone" label="휴대폰 번호" value={form.phone} onChange={(v) => set("phone", v)} placeholder="010-0000-0000" />
              <Field id="phonePlan" label="휴대폰 요금제" value={form.phonePlan} onChange={(v) => set("phonePlan", v)} placeholder="요금제 정보를 입력하세요" multiline className="col-span-full" />
              <ShareholdersEditor
                shareholders={form.shareholders}
                onChange={(s) => set("shareholders", s)}
              />
            </Section>

            <Section title="사업장 / 연락 정보">
              <Field id="bizAddress" label="사업 소재지" value={form.bizAddress} onChange={(v) => set("bizAddress", v)} placeholder="도로명 주소" />
              <Field id="bizEmail" label="사업자 메일주소" type="email" value={form.bizEmail} onChange={(v) => set("bizEmail", v)} placeholder="name@company.com" />
              <Field id="businessType" label="업태" value={form.businessType} onChange={(v) => set("businessType", v)} placeholder="예: 서비스업" />
              <Field id="businessItem" label="종목" value={form.businessItem} onChange={(v) => set("businessItem", v)} placeholder="예: 소프트웨어 개발" />
            </Section>

            <Section title="법인 계좌">
              <Field id="corpBankName" label="은행" value={form.corpBankName} onChange={(v) => set("corpBankName", v)} placeholder="예: 국민은행" />
              <Field id="corpAccountNo" label="계좌번호" value={form.corpAccountNo} onChange={(v) => set("corpAccountNo", v)} placeholder="000-0000-0000-00" />
              <Field id="corpAccountPw" label="계좌 비밀번호" value={form.corpAccountPw} onChange={(v) => set("corpAccountPw", v)} placeholder="비밀번호" />
            </Section>

            <Section title="개인 계좌">
              <Field id="personalBankName" label="은행" value={form.personalBankName} onChange={(v) => set("personalBankName", v)} placeholder="예: 신한은행" />
              <Field id="personalAccountNo" label="계좌번호" value={form.personalAccountNo} onChange={(v) => set("personalAccountNo", v)} placeholder="000-0000-0000-00" />
              <Field id="personalAccountPw" label="계좌 비밀번호" value={form.personalAccountPw} onChange={(v) => set("personalAccountPw", v)} placeholder="비밀번호" />
            </Section>

            <Section title="인증서">
              <Field id="certCorp" label="법인 인증서" value={form.certCorp} onChange={(v) => set("certCorp", v)} placeholder="발급기관 / 일련번호" />
              <Field id="certPersonal" label="개인 인증서" value={form.certPersonal} onChange={(v) => set("certPersonal", v)} placeholder="발급기관 / 일련번호" />
              <Field id="certExpiry" label="만료일" type="date" value={form.certExpiry} onChange={(v) => set("certExpiry", v)} />
            </Section>

            <Section title="인터넷 등기소">
              <Field id="iros" label="아이디" value={form.iros} onChange={(v) => set("iros", v)} placeholder="등기소 아이디" />
              <Field id="irosPw" label="비밀번호" value={form.irosPw} onChange={(v) => set("irosPw", v)} placeholder="비밀번호" />
              <Field id="irosUserNo" label="사용자 등록번호" value={form.irosUserNo} onChange={(v) => set("irosUserNo", v)} placeholder="등록번호" />
            </Section>

            <Section title="홈택스 계정">
              <Field id="hometaxId" label="홈택스 아이디" value={form.hometaxId} onChange={(v) => set("hometaxId", v)} placeholder="홈택스 아이디" />
              <Field id="hometaxPw" label="홈택스 비밀번호" value={form.hometaxPw} onChange={(v) => set("hometaxPw", v)} placeholder="비밀번호" />
            </Section>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note" className="text-xs text-muted-foreground">비고</Label>
              <Textarea
                id="note"
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                placeholder="특이사항을 입력하세요."
                rows={3}
              />
            </div>
          </div>

          {apiError && (
            <div className="border-t border-destructive/20 bg-destructive/5 px-6 py-3">
              <p className="text-sm text-destructive">{apiError}</p>
            </div>
          )}
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => handleOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "등록 중..." : "등록"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
