"use client"

import React, { useMemo, useState } from "react"
import { Plus } from "lucide-react"
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
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
  type Corporation,
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

type Column = {
  key: keyof Corporation
  label: string
  minWidth?: string
  filterOptions?: string[]
}

const columns: Column[] = [
  { key: "category", label: "구분", minWidth: "130px", filterOptions: CATEGORY_OPTIONS },
  { key: "status", label: "상태", minWidth: "110px", filterOptions: STATUS_OPTIONS },
  { key: "name", label: "법인명", minWidth: "140px" },
  { key: "region", label: "지역", minWidth: "120px" },
  { key: "openDate", label: "개업일", minWidth: "120px" },
  { key: "bizNo", label: "사업자 번호", minWidth: "130px" },
  { key: "corpNo", label: "법인 번호", minWidth: "140px" },
  { key: "ceo", label: "법인 대표", minWidth: "100px" },
  { key: "auditorDirector", label: "감사/사내이사", minWidth: "130px" },
  { key: "shareholder", label: "주주", minWidth: "120px" },
  { key: "birthDate", label: "생년월일", minWidth: "120px" },
  { key: "phone", label: "휴대폰 번호", minWidth: "130px" },
  { key: "phonePlan", label: "휴대폰 요금제", minWidth: "120px" },
  { key: "bizAddress", label: "사업 소재지", minWidth: "200px" },
  { key: "bizEmail", label: "사업자 메일", minWidth: "180px" },
  { key: "account", label: "계좌번호", minWidth: "170px" },
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
  const { rows, setRows } = useCorporations()
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [detail, setDetail] = useState<Corporation | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Corporation | null>(null)

  // 좌측 고정(sticky) 열(구분/상태/법인명)의 누적 left 위치
  const stickyOffsets = [0, 130, 240]

  function handleSubmit(corp: Corporation) {
    const registeredAt = new Date().toISOString().slice(0, 10)
    setRows((prev) => [{ ...corp, registeredAt }, ...prev])
  }

  function handleSave() {
    if (!editForm) return
    setRows((prev) => prev.map((r) => (r === detail ? editForm : r)))
    setDetail(editForm)
    setIsEditing(false)
  }

  function setEdit<K extends keyof Corporation>(key: K, value: Corporation[K]) {
    setEditForm((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
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
          return String(row[col.key] ?? "").toLowerCase().includes(term.toLowerCase())
        }),
      )
      .sort((a, b) => {
        const catDiff = orderIndex(categoryOrder, a.category) - orderIndex(categoryOrder, b.category)
        if (catDiff !== 0) return catDiff
        return orderIndex(statusOrder, a.status) - orderIndex(statusOrder, b.status)
      })
  }, [activeRows, filters])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">법인 관리</h2>
          <p className="text-sm text-muted-foreground">
            전체 {activeRows.length}개 법인 · 현재 {filteredRows.length}개 표시
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          법인 등록
        </Button>
      </div>

      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="min-h-80 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="text-left text-muted-foreground">
                  {columns.map((col, colIdx) => (
                    <th
                      key={col.key}
                      className={cn(
                        "border-b border-border bg-muted/70 px-3 py-2.5 align-middle font-medium backdrop-blur",
                        colIdx < 3 && "sticky z-10",
                      )}
                      style={{
                        minWidth: col.minWidth,
                        left: colIdx < 3 ? stickyOffsets[colIdx] : undefined,
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
                  filteredRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-accent/50"
                      onClick={() => setDetail(row)}
                    >
                      {columns.map((col, colIdx) => (
                        <td
                          key={col.key}
                          className={cn(
                            "whitespace-nowrap px-3 py-2.5 text-foreground",
                            colIdx < 3 && "sticky z-10 bg-card group-hover:bg-accent",
                          )}
                          style={{ left: colIdx < 3 ? stickyOffsets[colIdx] : undefined }}
                        >
                          {col.key === "status" ? (
                            <StatusBadge status={row.status} />
                          ) : col.key === "category" ? (
                            <CategoryBadge category={row.category} />
                          ) : col.key === "name" ? (
                            <span className="font-medium text-foreground">{row.name}</span>
                          ) : (
                            <span className={col.key.startsWith("note") ? "text-muted-foreground" : undefined}>
                              {row[col.key] || "-"}
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

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setIsEditing(false) } }}>
        <DialogContent className="max-h-[90svh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-base font-semibold">법인 상세 정보</DialogTitle>
          </DialogHeader>

          {detail && (
            <>
              <div className="flex max-h-[calc(90svh-9rem)] flex-col overflow-y-auto px-6 py-5">
                <div className="flex flex-col gap-4">

                  {/* 기본 정보 – 수정/저장/취소 버튼 위치 */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</p>
                      <div className="flex gap-2">
                        {isEditing && editForm ? (
                          <>
                            <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => setIsEditing(false)}>취소</Button>
                            <Button size="sm" className="h-8 px-3" onClick={handleSave}>저장</Button>
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
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">상태</Label>
                          <Select value={editForm.status} onValueChange={(v) => setEdit("status", v ?? "")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <EF label="법인명" value={editForm.name} onChange={(v) => setEdit("name", v)} />
                        <EF label="지역" value={editForm.region} onChange={(v) => setEdit("region", v)} />
                        <EF label="개업일" type="date" value={editForm.openDate} onChange={(v) => setEdit("openDate", v)} />
                        <EF label="사업자 번호" value={editForm.bizNo} onChange={(v) => setEdit("bizNo", v)} />
                        <EF label="법인 번호" value={editForm.corpNo} onChange={(v) => setEdit("corpNo", v)} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                        <DetailField label="구분"><CategoryBadge category={detail.category} /></DetailField>
                        <DetailField label="상태"><StatusBadge status={detail.status} /></DetailField>
                        <DetailField label="법인명" value={detail.name} />
                        <DetailField label="지역" value={detail.region} />
                        <DetailField label="개업일" value={detail.openDate} />
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
                        <EF label="주주" value={editForm.shareholder} onChange={(v) => setEdit("shareholder", v)} />
                        <EF label="생년월일" type="date" value={editForm.birthDate} onChange={(v) => setEdit("birthDate", v)} />
                        <EF label="휴대폰 번호" value={editForm.phone} onChange={(v) => setEdit("phone", v)} />
                        <EF label="휴대폰 요금제" value={editForm.phonePlan} onChange={(v) => setEdit("phonePlan", v)} />
                      </>
                    ) : (
                      <>
                        <DetailField label="법인 대표" value={detail.ceo} />
                        <DetailField label="감사/사내이사" value={detail.auditorDirector} />
                        <DetailField label="주주" value={detail.shareholder} />
                        <DetailField label="생년월일" value={detail.birthDate} />
                        <DetailField label="휴대폰 번호" value={detail.phone} />
                        <DetailField label="휴대폰 요금제" value={detail.phonePlan} />
                      </>
                    )}
                  </EditSection>

                  <EditSection title="사업장 정보">
                    {isEditing && editForm ? (
                      <>
                        <EF label="사업 소재지" value={editForm.bizAddress} onChange={(v) => setEdit("bizAddress", v)} className="col-span-2" />
                        <EF label="사업자 메일" value={editForm.bizEmail} onChange={(v) => setEdit("bizEmail", v)} />
                        <EF label="계좌번호" value={editForm.account} onChange={(v) => setEdit("account", v)} className="col-span-2" />
                      </>
                    ) : (
                      <>
                        <DetailField label="사업 소재지" value={detail.bizAddress} className="col-span-2" />
                        <DetailField label="사업자 메일" value={detail.bizEmail} />
                        <DetailField label="계좌번호" value={detail.account} className="col-span-2" />
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
                        <EF label="비밀번호" type="password" value={editForm.irosPw} onChange={(v) => setEdit("irosPw", v)} />
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
                        <EF label="홈택스 비밀번호" type="password" value={editForm.hometaxPw} onChange={(v) => setEdit("hometaxPw", v)} />
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
              <DialogFooter className="border-t border-border px-6 py-4">
                <Button variant="outline" onClick={() => { setDetail(null); setIsEditing(false) }}>닫기</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
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
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
