"use client"

import { useState } from "react"
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

export type Corporation = {
  category: string
  status: string
  name: string
  region: string
  openDate: string
  bizNo: string
  corpNo: string
  ceo: string
  auditorDirector: string
  shareholder: string
  birthDate: string
  phone: string
  phonePlan: string
  bizAddress: string
  bizEmail: string
  account: string
  certCorp: string
  certPersonal: string
  certExpiry: string
  iros: string
  irosPw: string
  irosUserNo: string
  hometaxId: string
  hometaxPw: string
  note: string
  registeredAt?: string
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
  shareholder: "",
  birthDate: "",
  phone: "",
  phonePlan: "",
  bizAddress: "",
  bizEmail: "",
  account: "",
  certCorp: "",
  certPersonal: "",
  certExpiry: "",
  iros: "",
  irosPw: "",
  irosUserNo: "",
  hometaxId: "",
  hometaxPw: "",
  note: "",
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
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
  onSubmit: (corp: Corporation) => void
}) {
  const [form, setForm] = useState<Corporation>(emptyForm)

  function set<K extends keyof Corporation>(key: K, value: Corporation[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
    setForm(emptyForm)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>법인 등록</DialogTitle>
          <DialogDescription>신규 법인의 기본 정보와 계정 정보를 입력하세요.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex max-h-[calc(90svh-9rem)] flex-col">
          <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
            <Section title="기본 정보">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category" className="text-xs text-muted-foreground">
                  구분
                </Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="구분 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field id="name" label="법인명" value={form.name} onChange={(v) => set("name", v)} placeholder="예: 한빛컴퍼니" />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status" className="text-xs text-muted-foreground">
                  상태
                </Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field id="region" label="지역" value={form.region} onChange={(v) => set("region", v)} placeholder="예: 서울 강남구" />
              <Field id="openDate" label="개업일" type="date" value={form.openDate} onChange={(v) => set("openDate", v)} />
              <Field id="bizNo" label="사업자 번호" value={form.bizNo} onChange={(v) => set("bizNo", v)} placeholder="000-00-00000" />
              <Field id="corpNo" label="법인 번호" value={form.corpNo} onChange={(v) => set("corpNo", v)} placeholder="000000-0000000" />
            </Section>

            <Section title="대표 / 임원 정보">
              <Field id="ceo" label="법인 대표" value={form.ceo} onChange={(v) => set("ceo", v)} placeholder="대표자명" />
              <Field id="auditorDirector" label="감사 / 사내이사" value={form.auditorDirector} onChange={(v) => set("auditorDirector", v)} placeholder="성명" />
              <Field id="shareholder" label="주주" value={form.shareholder} onChange={(v) => set("shareholder", v)} placeholder="주주명 (지분)" />
              <Field id="birthDate" label="생년월일" type="date" value={form.birthDate} onChange={(v) => set("birthDate", v)} />
              <Field id="phone" label="휴대폰 번호" value={form.phone} onChange={(v) => set("phone", v)} placeholder="010-0000-0000" />
              <Field id="phonePlan" label="휴대폰 요금제" value={form.phonePlan} onChange={(v) => set("phonePlan", v)} placeholder="예: 5G 프리미엄" />
            </Section>

            <Section title="사업장 / 연락 정보">
              <Field id="bizAddress" label="사업 소재지" value={form.bizAddress} onChange={(v) => set("bizAddress", v)} placeholder="도로명 주소" />
              <Field id="bizEmail" label="사업자 메일주소" type="email" value={form.bizEmail} onChange={(v) => set("bizEmail", v)} placeholder="name@company.com" />
              <Field id="account" label="계좌번호" value={form.account} onChange={(v) => set("account", v)} placeholder="은행 / 계좌��호" />
            </Section>

            <Section title="인증서">
              <Field id="certCorp" label="법인 인증서" value={form.certCorp} onChange={(v) => set("certCorp", v)} placeholder="발급기관 / 일련번호" />
              <Field id="certPersonal" label="개인 인증서" value={form.certPersonal} onChange={(v) => set("certPersonal", v)} placeholder="발급기관 / 일련번호" />
              <Field id="certExpiry" label="만료일" type="date" value={form.certExpiry} onChange={(v) => set("certExpiry", v)} />
            </Section>

            <Section title="인터넷 등기소">
              <Field id="iros" label="아이디" value={form.iros} onChange={(v) => set("iros", v)} placeholder="등기소 아이디" />
              <Field id="irosPw" label="비밀번호" type="password" value={form.irosPw} onChange={(v) => set("irosPw", v)} placeholder="비밀번호" />
              <Field id="irosUserNo" label="사용자 등록번호" value={form.irosUserNo} onChange={(v) => set("irosUserNo", v)} placeholder="등록번호" />
            </Section>

            <Section title="홈택스 계정">
              <Field id="hometaxId" label="홈택스 아이디" value={form.hometaxId} onChange={(v) => set("hometaxId", v)} placeholder="홈택스 아이디" />
              <Field id="hometaxPw" label="홈택스 비밀번호" type="password" value={form.hometaxPw} onChange={(v) => set("hometaxPw", v)} placeholder="비밀번호" />
            </Section>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note" className="text-xs text-muted-foreground">
                비고
              </Label>
              <Textarea
                id="note"
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                placeholder="특이사항을 입력하세요."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit">등록</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
