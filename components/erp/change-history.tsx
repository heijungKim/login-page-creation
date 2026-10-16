"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, History } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

type FieldChange = { field: string; before: string | null; after: string | null }

export type ChangeLogEntry = {
  id: number
  entityType: string
  entityId: string
  parentType: string | null
  parentId: string | null
  action: "CREATE" | "UPDATE" | "DELETE"
  changedBy: string
  changedByName: string
  changedAt: string
  summary: string
  changes: FieldChange[]
}

type Props = {
  /** 백엔드 엔티티 단순 클래스명 (Corporation, Lease ...) 또는 가상 상위 타입 (PrepaidPerson) */
  entityType: string
  entityId?: number | string | null
  entityIds?: (number | string)[]
  /** 값이 바뀌면 이력을 다시 불러온다 (저장 직후 갱신용) */
  refreshKey?: string | number | null
  defaultOpen?: boolean
  className?: string
}

const ACTION_META: Record<ChangeLogEntry["action"], { label: string; className: string }> = {
  CREATE: { label: "등록", className: "bg-emerald-100 text-emerald-700" },
  UPDATE: { label: "수정", className: "bg-blue-100 text-blue-700" },
  DELETE: { label: "삭제", className: "bg-red-100 text-red-700" },
}

/** 하위 엔티티 타입 → 표시 이름 */
const ENTITY_LABELS: Record<string, string> = {
  BusinessIncomePayment: "지급 내역",
  FixedCostPayment: "납입 내역",
  TelecomPayment: "납입 내역",
  TradingCorporationPg: "PG사",
  FixedExpenseEntry: "월별 금액",
  Prepaid: "선지급 내역",
}

/** 엔티티 필드명 → 한글 라벨 */
const FIELD_LABELS: Record<string, string> = {
  name: "이름/명칭",
  corpName: "법인명",
  ceo: "대표",
  ceoName: "대표",
  status: "상태",
  category: "구분",
  categoryEtc: "구분(기타)",
  categoryNote: "구분 비고",
  region: "지역",
  openDate: "개업연월일",
  startDate: "개시일",
  closeDate: "폐업일",
  intro: "소개",
  bizNo: "사업자번호",
  corpNo: "법인번호",
  auditorDirector: "감사/사내이사",
  shareholder: "주주",
  birthDate: "생년월일",
  phone: "연락처",
  phonePlan: "휴대폰 요금제",
  bizAddress: "사업 소재지",
  bizEmail: "사업자 메일",
  account: "계좌",
  accountNo: "계좌번호",
  bankName: "은행",
  businessType: "업태",
  businessItem: "종목",
  certCorp: "법인 인증서",
  certPersonal: "개인 인증서",
  certExpiry: "인증서 만료일",
  iros: "아이로스 아이디",
  irosPw: "아이로스 비밀번호",
  irosUserNo: "아이로스 사용자번호",
  hometaxId: "홈택스 아이디",
  hometaxPw: "홈택스 비밀번호",
  progressMemo: "진행 메모",
  note: "비고",
  memo: "메모",
  registeredAt: "등록일",
  bizLicenseFileUrl: "사업자등록증 파일",
  commission: "수수료",
  tradingType: "거래 유형",
  contact: "연락처",
  email: "이메일",
  address: "주소",
  subsidiaryIds: "하위 법인 연결",
  giftCorpIds: "상품권 법인 연결",
  pgCompanyName: "PG사",
  tradingCorporationId: "거래 법인",
  corporationId: "법인",
  location: "소재지",
  contractStart: "계약 시작일",
  contractEnd: "계약 종료일",
  deposit: "보증금",
  monthlyRent: "월 납입금",
  paymentDay: "납입일",
  emergencyContact: "긴급 연락처",
  sharedOfficeName: "공유 오피스",
  pinned: "고정",
  item: "비용항목",
  amount: "금액",
  cycle: "지급주기",
  payDay: "지급일",
  payType: "지급타입",
  paidDate: "납입일",
  paidAmount: "납입 금액",
  fixedCostId: "고정 비용",
  owner: "명의자",
  carrier: "통신사",
  cost: "요금",
  telecomId: "통신비",
  regNo: "주민번호",
  residentNo: "주민번호",
  revenue: "매출총액",
  reportType: "신고 항목",
  incomeTax: "소득세",
  localTax: "지방소득세",
  payDate: "지급일",
  businessIncomeId: "소득자",
  personKey: "인물 키",
  bizRegion: "사업자 지역",
  bizCity: "사업자 시/구",
  bizRegDate: "사업자 등록일",
  bizInfos: "사업자 정보",
  username: "아이디",
  displayName: "이름",
  passwordHash: "비밀번호",
  enabled: "활성화",
  company: "회사명",
  service: "서비스",
  message: "문의 내용",
  task: "업무",
  dueDate: "기한",
  manager: "담당자",
  yearMonth: "년월",
  pgName: "PG사명",
  outstandingAmount: "미수 금액",
  quarter: "분기",
  clientTotal: "거래처 합계",
  salesAmount: "매출액",
  erpUsed: "ERP 사용",
  totalCommission: "총 수수료",
  salesCommissionConfirmed: "매출 수수료 확인",
  invoiceIssued: "계산서 발행",
  subsidiaryCommission: "하위 수수료",
  subsidiaryInvoiceIssued: "하위 계산서 발행",
  itemName: "항목명",
  itemId: "항목",
  year: "연도",
  month: "월",
  entryDate: "일자",
  completed: "완료",
  completedAt: "완료 일시",
  date: "일자",
  type: "유형",
  description: "내용",
}

const MONEY_FIELDS = new Set([
  "amount", "deposit", "monthlyRent", "cost", "revenue", "paidAmount", "incomeTax", "localTax",
  "outstandingAmount", "clientTotal", "salesAmount", "totalCommission", "subsidiaryCommission",
])

function fieldLabel(field: string) {
  return FIELD_LABELS[field] ?? field
}

function formatValue(field: string, value: string | null) {
  if (value === null || value === "") return "(없음)"
  if (value === "true") return "예"
  if (value === "false") return "아니오"
  if (MONEY_FIELDS.has(field) && /^-?\d+(\.\d+)?$/.test(value)) {
    return "₩" + Number(value).toLocaleString("ko-KR")
  }
  return value
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function ChangeHistory({ entityType, entityId, entityIds, refreshKey, defaultOpen = false, className }: Props) {
  const ids = (entityIds ?? (entityId !== null && entityId !== undefined ? [entityId] : []))
    .map((v) => String(v))
    .filter((v) => v.length > 0)
  const idsKey = ids.join(",")

  const [open, setOpen] = useState(defaultOpen)
  const [logs, setLogs] = useState<ChangeLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!idsKey) {
      setLogs([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .get<ChangeLogEntry[]>(
        `/api/change-logs?entityType=${encodeURIComponent(entityType)}&entityIds=${encodeURIComponent(idsKey)}`,
      )
      .then((res) => {
        if (!cancelled) setLogs(Array.isArray(res) ? res : [])
      })
      .catch(() => {
        if (!cancelled) setError("변경 이력을 불러오지 못했습니다.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [entityType, idsKey, refreshKey])

  const latest = logs[0]

  return (
    <div className={cn("rounded-lg border border-border bg-muted/20", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          변경 이력
          {logs.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-foreground">
              {logs.length}
            </span>
          )}
        </span>
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {loading
              ? "불러오는 중..."
              : error
                ? error
                : latest
                  ? `최근 ${formatDateTime(latest.changedAt)} · ${latest.changedByName}`
                  : "이력 없음"}
          </span>
          {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          {loading ? (
            <p className="py-2 text-center text-xs text-muted-foreground">불러오는 중...</p>
          ) : error ? (
            <p className="py-2 text-center text-xs text-destructive">{error}</p>
          ) : logs.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">변경 이력이 없습니다.</p>
          ) : (
            <ol className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
              {logs.map((log) => {
                const meta = ACTION_META[log.action]
                const childLabel = log.parentType ? ENTITY_LABELS[log.entityType] ?? log.entityType : null
                return (
                  <li key={log.id} className="relative border-l-2 border-border/70 pl-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", meta.className)}>
                        {meta.label}
                      </span>
                      {childLabel && (
                        <span className="font-medium text-foreground">
                          {childLabel}
                          {log.summary ? <span className="text-muted-foreground"> · {log.summary}</span> : null}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {formatDateTime(log.changedAt)} · {log.changedByName}
                      </span>
                    </div>
                    {log.changes.length > 0 && (
                      <ul className="mt-1.5 flex flex-col gap-0.5">
                        {log.changes.map((c) => (
                          <li key={c.field} className="grid grid-cols-[minmax(0,7rem)_1fr] gap-2 text-xs">
                            <span className="truncate text-muted-foreground" title={c.field}>{fieldLabel(c.field)}</span>
                            <span className="min-w-0 break-all">
                              <span className="text-muted-foreground line-through decoration-muted-foreground/60">{formatValue(c.field, c.before)}</span>
                              <span className="mx-1.5 text-muted-foreground">{"→"}</span>
                              <span className="font-medium text-foreground">{formatValue(c.field, c.after)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
