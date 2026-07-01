"use client"

import React, { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

const categoryStyles: Record<string, string> = {
  "운영 법인": "bg-emerald-100 text-emerald-700",
  "하위 법인": "bg-sky-100 text-sky-700",
  "상품권 법인": "bg-orange-100 text-orange-700",
  "계약법인(영세)": "bg-slate-200 text-slate-700",
}

function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] ?? "bg-muted text-muted-foreground"
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{status}</span>
}

function CategoryBadge({ category }: { category: string }) {
  const style = categoryStyles[category] ?? "bg-muted text-muted-foreground"
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{category}</span>
}

type Column = { key: keyof Corporation; label: string; minWidth: string; sticky?: boolean }

const columns: Column[] = [
  { key: "category",    label: "구분",        minWidth: "130px", sticky: true },
  { key: "intro",       label: "소개",        minWidth: "120px" },
  { key: "name",        label: "법인명",      minWidth: "140px", sticky: true },
  { key: "region",      label: "지역",        minWidth: "120px" },
  { key: "openDate",    label: "개업일",      minWidth: "120px" },
  { key: "startDate",   label: "개시일",      minWidth: "120px" },
  { key: "bizNo",       label: "사업자 번호", minWidth: "130px" },
  { key: "corpNo",      label: "법인 번호",   minWidth: "140px" },
  { key: "ceo",         label: "법인 대표",   minWidth: "100px" },
  { key: "bizAddress",  label: "사업 소재지", minWidth: "200px" },
  { key: "registeredAt",label: "등록일",      minWidth: "110px" },
]

const stickyOffsets: Record<string, number> = { category: 0, name: 130 }

export function ClosedCorporationsView() {
  const { rows, loading, error, changeStatus } = useCorporations()
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [detail, setDetail] = useState<Corporation | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<Corporation | null>(null)
  const [restoreStatus, setRestoreStatus] = useState("활성")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const closedRows = useMemo(() => rows.filter((r) => r.status === "폐업"), [rows])

  const filteredRows = useMemo(() => {
    return closedRows
      .filter((row) =>
        columns.every((col) => {
          const term = filters[col.key]?.trim()
          if (!term) return true
          return String(row[col.key] ?? "").toLowerCase().includes(term.toLowerCase())
        }),
      )
      .sort((a, b) => (b.registeredAt ?? "").localeCompare(a.registeredAt ?? ""))
  }, [closedRows, filters])

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  async function handleRestore() {
    if (!restoreTarget?.id) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      await changeStatus(restoreTarget.id, restoreStatus)
      setRestoreTarget(null)
      setDetail(null)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "복원에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">폐업 법인</h2>
        <p className="text-sm text-muted-foreground">
          {loading ? "불러오는 중..." : `전체 ${closedRows.length}개 폐업 법인 · 현재 ${filteredRows.length}개 표시`}
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {submitError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {submitError}
        </div>
      ) : null}

      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="min-h-80 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="text-left text-muted-foreground">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "border-b border-border bg-muted/70 px-3 py-2.5 align-middle font-medium backdrop-blur",
                        col.sticky && "sticky z-10",
                      )}
                      style={{
                        minWidth: col.minWidth,
                        left: col.sticky ? stickyOffsets[col.key] : undefined,
                      }}
                    >
                      <Input
                        value={filters[col.key] ?? ""}
                        onChange={(e) => setFilter(col.key, e.target.value)}
                        placeholder={col.label}
                        className="h-8 bg-background text-xs font-normal"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="h-64 px-4 py-10 text-center text-muted-foreground">
                      폐업 법인이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id ?? row.corpNo}
                      className="group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-accent/50"
                      onClick={() => setDetail(row)}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            "whitespace-nowrap px-3 py-2.5 text-foreground",
                            col.sticky && "sticky z-10 bg-card group-hover:bg-accent",
                          )}
                          style={{ left: col.sticky ? stickyOffsets[col.key] : undefined }}
                        >
                          {col.key === "category" ? (
                            <CategoryBadge category={row.category} />
                          ) : col.key === "name" ? (
                            <span className="font-medium">{row.name}</span>
                          ) : (
                            <span className={col.key === "intro" ? "text-muted-foreground" : ""}>{String(row[col.key] ?? "") || "-"}</span>
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

      {/* 상세 팝업 */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent className="max-h-[90svh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-base font-semibold">폐업 법인 상세 정보</DialogTitle>
          </DialogHeader>
          {detail && (
            <>
              <div className="flex max-h-[calc(90svh-9rem)] flex-col overflow-y-auto px-6 py-5">
                <div className="flex flex-col gap-4">
                  <ClosedSection title="기본 정보">
                    <DF label="구분"><CategoryBadge category={detail.category} /></DF>
                    <DF label="상태"><StatusBadge status={detail.status} /></DF>
                    <DF label="폐업일" value={detail.closeDate} />
                    <DF label="법인명" value={detail.name} />
                    <DF label="소개" value={detail.intro} className="col-span-2" />
                    <DF label="지역" value={detail.region} />
                    <DF label="개업일" value={detail.openDate} />
                    <DF label="개시일" value={detail.startDate} />
                    <DF label="사업자 번호" value={detail.bizNo} />
                    <DF label="법인 번호" value={detail.corpNo} />
                  </ClosedSection>
                  <ClosedSection title="대표 / 임원 정보">
                    <DF label="법인 대표" value={detail.ceo} />
                    <DF label="감사/사내이사" value={detail.auditorDirector} />
                    <DF label="주주" value={detail.shareholder} />
                    <DF label="생년월일" value={detail.birthDate} />
                    <DF label="휴대폰 번호" value={detail.phone} />
                    <DF label="휴대폰 요금제" value={detail.phonePlan} />
                  </ClosedSection>
                  <ClosedSection title="사업장 정보">
                    <DF label="사업 소재지" value={detail.bizAddress} className="col-span-2" />
                    <DF label="사업자 메일" value={detail.bizEmail} />
                    <DF label="계좌번호" value={detail.account} className="col-span-2" />
                  </ClosedSection>
                  <ClosedSection title="인증서">
                    <DF label="법인 인증서" value={detail.certCorp} />
                    <DF label="개인 인증서" value={detail.certPersonal} />
                    <DF label="인증서 만료일" value={detail.certExpiry} />
                  </ClosedSection>
                  <ClosedSection title="인터넷 등기소">
                    <DF label="아이디" value={detail.iros} />
                    <DF label="비밀번호" value={detail.irosPw} />
                    <DF label="사용자 등록번호" value={detail.irosUserNo} />
                  </ClosedSection>
                  <ClosedSection title="홈택스 계정">
                    <DF label="홈택스 아이디" value={detail.hometaxId} />
                    <DF label="홈택스 비밀번호" value={detail.hometaxPw} />
                  </ClosedSection>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-muted-foreground">비고</span>
                    <span className="text-sm text-foreground">{detail.note || "-"}</span>
                  </div>
                  {detail.registeredAt && (
                    <p className="text-xs text-muted-foreground">등록일: {detail.registeredAt}</p>
                  )}
                </div>
              </div>
              <DialogFooter className="border-t border-border px-6 py-4">
                <Button
                  variant="outline"
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  onClick={() => { setRestoreTarget(detail); setRestoreStatus("활성") }}
                >
                  법인 관리로 복원
                </Button>
                <Button variant="outline" onClick={() => setDetail(null)}>닫기</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 복원 확인 다이얼로그 */}
      <Dialog open={!!restoreTarget} onOpenChange={(o) => { if (!o) setRestoreTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>법인 복원</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{restoreTarget?.name}</span>을(를) 법인 관리로 복원합니다.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">복원 후 상태</Label>
              <Select value={restoreStatus} onValueChange={(v) => setRestoreStatus(v ?? "활성")}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.filter((s) => s !== "폐업").map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={submitting} onClick={() => setRestoreTarget(null)}>취소</Button>
            <Button onClick={handleRestore} disabled={submitting}>{submitting ? "복원 중..." : "복원"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ClosedSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-border p-4">
      <legend className="px-2 text-sm font-semibold text-foreground">{title}</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  )
}

function DF({
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
