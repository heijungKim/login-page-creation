"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
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

export const CATEGORY_OPTIONS = ["운영 법인", "하위 법인", "상품권 법인", "계약법인(영세)"]
export const STATUS_OPTIONS = ["활성", "진행중", "대기중", "중지", "폐업"]

export type Shareholder = { name: string; equity: string }

export type Corporation = {
  id?: number
  category: string
  status: string
  name: string
  region: string
  openDate: string
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
}

const emptyForm: Corporation = {
  category: "운영 법인",
  status: "활성",
  name: "",
  region: "",
  openDate: "",
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90svh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>법인 등록</DialogTitle>
          <DialogDescription>신규 법인의 기본 정보와 계정 정보를 입력하세요.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex max-h-[calc(90svh-9rem)] flex-col">
          <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
            <Section title="기본 정보">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category" className="text-xs text-muted-foreground">구분</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger id="category"><SelectValue placeholder="구분 선택" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Field id="name" label="법인명" value={form.name} onChange={(v) => set("name", v)} placeholder="예: 한빛컴퍼니" required error={fieldErrors.name} />
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
              <Field id="region" label="지역" value={form.region} onChange={(v) => set("region", v)} placeholder="예: 서울 강남구" />
              <Field id="openDate" label="개업일" type="date" value={form.openDate} onChange={(v) => set("openDate", v)} />
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
  )
}
