"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Column = { key: string; label: string }
type Row = Record<string, string>

const statusStyles: Record<string, string> = {
  정상: "bg-primary/10 text-primary",
  완료: "bg-primary/10 text-primary",
  진행중: "bg-chart-2/15 text-chart-2",
  계약중: "bg-chart-2/15 text-chart-2",
  대기: "bg-chart-4/15 text-chart-4",
  검토중: "bg-chart-4/15 text-chart-4",
  지연: "bg-destructive/10 text-destructive",
  폐업: "bg-destructive/10 text-destructive",
  만료임박: "bg-destructive/10 text-destructive",
}

type ViewConfig = {
  title: string
  columns: Column[]
  statusKey?: string
  rows: Row[]
}

const views: Record<string, ViewConfig> = {
  corporations: {
    title: "법인 관리",
    statusKey: "status",
    columns: [
      { key: "name", label: "법인명" },
      { key: "regNo", label: "사업자등록번호" },
      { key: "ceo", label: "대표자" },
      { key: "type", label: "업종" },
      { key: "status", label: "상태" },
    ],
    rows: [
      { name: "한빛컴퍼니", regNo: "123-81-45678", ceo: "김한빛", type: "도소매", status: "정상" },
      { name: "대성홀딩스", regNo: "214-88-12345", ceo: "이대성", type: "지주회사", status: "정상" },
      { name: "미래파트너스", regNo: "305-86-99887", ceo: "박미래", type: "컨설팅", status: "검토중" },
      { name: "정우산업", regNo: "118-81-33221", ceo: "정우진", type: "제조", status: "정상" },
      { name: "세진무역", regNo: "402-85-77665", ceo: "최세진", type: "무역", status: "폐업" },
    ],
  },
  "fixed-cost": {
    title: "고정 비용",
    columns: [
      { key: "corp", label: "법인명" },
      { key: "item", label: "비용 항목" },
      { key: "amount", label: "월 금액" },
      { key: "cycle", label: "결제주기" },
      { key: "payday", label: "결제일" },
    ],
    rows: [
      { corp: "한빛컴퍼니", item: "사무실 임대료", amount: "₩3,200,000", cycle: "월납", payday: "매월 5일" },
      { corp: "한빛컴퍼니", item: "회계 프로그램", amount: "₩150,000", cycle: "월납", payday: "매월 1일" },
      { corp: "대성홀딩스", item: "차량 리스", amount: "₩980,000", cycle: "월납", payday: "매월 20일" },
      { corp: "정우산업", item: "공장 임대료", amount: "₩5,400,000", cycle: "월납", payday: "매월 10일" },
      { corp: "미래파트너스", item: "서버 호스팅", amount: "₩320,000", cycle: "월납", payday: "매월 15일" },
    ],
  },
  prepaid: {
    title: "선지급 내역",
    statusKey: "status",
    columns: [
      { key: "corp", label: "법인명" },
      { key: "item", label: "항목" },
      { key: "amount", label: "선지급액" },
      { key: "date", label: "지급일" },
      { key: "status", label: "정산상태" },
    ],
    rows: [
      { corp: "한빛컴퍼니", item: "보험료 선납", amount: "₩2,400,000", date: "2026-01-10", status: "진행중" },
      { corp: "대성홀딩스", item: "임차보증금", amount: "₩30,000,000", date: "2025-12-01", status: "정상" },
      { corp: "정우산업", item: "원자재 선급금", amount: "₩8,500,000", date: "2026-05-20", status: "대기" },
      { corp: "미래파트너스", item: "용역 선급금", amount: "₩1,200,000", date: "2026-06-01", status: "완료" },
    ],
  },
  "business-income": {
    title: "사업소득",
    statusKey: "status",
    columns: [
      { key: "corp", label: "법인명" },
      { key: "payee", label: "지급대상" },
      { key: "amount", label: "지급액" },
      { key: "tax", label: "원천세(3.3%)" },
      { key: "status", label: "신고상태" },
    ],
    rows: [
      { corp: "한빛컴퍼니", payee: "프리랜서 디자이너", amount: "₩3,000,000", tax: "₩99,000", status: "완료" },
      { corp: "미래파트너스", payee: "외부 강사", amount: "₩1,500,000", tax: "₩49,500", status: "진행중" },
      { corp: "대성홀딩스", payee: "마케팅 대행", amount: "₩5,000,000", tax: "₩165,000", status: "대기" },
      { corp: "정우산업", payee: "설비 점검 기사", amount: "₩800,000", tax: "₩26,400", status: "완료" },
    ],
  },
  closed: {
    title: "폐업 법인",
    statusKey: "status",
    columns: [
      { key: "name", label: "법인명" },
      { key: "regNo", label: "사업자등록번호" },
      { key: "closeDate", label: "폐업일" },
      { key: "reason", label: "사유" },
      { key: "status", label: "정리상태" },
    ],
    rows: [
      { name: "세진무역", regNo: "402-85-77665", closeDate: "2026-03-31", reason: "사업 종료", status: "진행중" },
      { name: "동방상사", regNo: "211-81-55443", closeDate: "2025-12-31", reason: "합병", status: "완료" },
      { name: "광명전자", regNo: "133-86-22110", closeDate: "2026-05-15", reason: "경영 악화", status: "대기" },
    ],
  },
  "audit-region": {
    title: "감사/사업자 지역",
    columns: [
      { key: "corp", label: "법인명" },
      { key: "region", label: "사업자 지역" },
      { key: "taxOffice", label: "관할 세무서" },
      { key: "auditor", label: "담당 감사" },
      { key: "lastAudit", label: "최근 감사일" },
    ],
    rows: [
      { corp: "한빛컴퍼니", region: "서울 강남구", taxOffice: "삼성세무서", auditor: "김감사", lastAudit: "2026-02-18" },
      { corp: "대성홀딩스", region: "서울 영등포구", taxOffice: "영등포세무서", auditor: "이감사", lastAudit: "2025-11-05" },
      { corp: "정우산업", region: "경기 화성시", taxOffice: "동화성세무서", auditor: "박감사", lastAudit: "2026-04-22" },
      { corp: "미래파트너스", region: "부산 해운대구", taxOffice: "해운대세무서", auditor: "최감사", lastAudit: "2026-01-30" },
    ],
  },
  lease: {
    title: "임대차 현황",
    statusKey: "status",
    columns: [
      { key: "corp", label: "법인명" },
      { key: "address", label: "소재지" },
      { key: "deposit", label: "보증금" },
      { key: "rent", label: "월 임대료" },
      { key: "expiry", label: "계약만료" },
      { key: "status", label: "상태" },
    ],
    rows: [
      { corp: "한빛컴퍼니", address: "서울 강남구 테헤란로 123", deposit: "₩50,000,000", rent: "₩3,200,000", expiry: "2027-02-28", status: "계약중" },
      { corp: "정우산업", address: "경기 화성시 동탄산단 45", deposit: "₩120,000,000", rent: "₩5,400,000", expiry: "2026-07-31", status: "만료임박" },
      { corp: "대성홀딩스", address: "서울 영등포구 여의대로 7", deposit: "₩80,000,000", rent: "₩4,100,000", expiry: "2028-05-31", status: "계약중" },
    ],
  },
  "fixed-expense": {
    title: "고정지출",
    statusKey: "status",
    columns: [
      { key: "corp", label: "법인명" },
      { key: "item", label: "지출 항목" },
      { key: "amount", label: "금액" },
      { key: "date", label: "지출일" },
      { key: "status", label: "처리상태" },
    ],
    rows: [
      { corp: "한빛컴퍼니", item: "4대보험료", amount: "₩2,850,000", date: "매월 10일", status: "정상" },
      { corp: "대성홀딩스", item: "대출 이자", amount: "₩1,420,000", date: "매월 25일", status: "정상" },
      { corp: "정우산업", item: "전기/수도료", amount: "₩3,100,000", date: "매월 말일", status: "진행중" },
      { corp: "미래파트너스", item: "통신비", amount: "₩280,000", date: "매월 18일", status: "정상" },
    ],
  },
  "operating-cost": {
    title: "운영비 관리",
    columns: [
      { key: "corp", label: "법인명" },
      { key: "category", label: "분류" },
      { key: "budget", label: "예산" },
      { key: "spent", label: "집행액" },
      { key: "rate", label: "집행률" },
    ],
    rows: [
      { corp: "한빛컴퍼니", category: "복리후생", budget: "₩5,000,000", spent: "₩3,200,000", rate: "64%" },
      { corp: "대성홀딩스", category: "접대비", budget: "₩3,000,000", spent: "₩2,750,000", rate: "92%" },
      { corp: "정우산업", category: "소모품비", budget: "₩2,000,000", spent: "₩900,000", rate: "45%" },
      { corp: "미래파트너스", category: "교육훈련비", budget: "₩1,500,000", spent: "₩1,500,000", rate: "100%" },
    ],
  },
  "tax-progress": {
    title: "월 세무 진행현황",
    statusKey: "status",
    columns: [
      { key: "corp", label: "법인명" },
      { key: "task", label: "신고 업무" },
      { key: "due", label: "신고기한" },
      { key: "manager", label: "담당자" },
      { key: "status", label: "진행상태" },
    ],
    rows: [
      { corp: "한빛컴퍼니", task: "부가세 신고", due: "2026-06-25", manager: "김세무", status: "진행중" },
      { corp: "대성홀딩스", task: "원천세 신고", due: "2026-06-10", manager: "이세무", status: "완료" },
      { corp: "미래파트너스", task: "법인세 중간예납", due: "2026-06-30", manager: "박세무", status: "대기" },
      { corp: "정우산업", task: "4대보험 정산", due: "2026-06-15", manager: "정세무", status: "진행중" },
      { corp: "세진무역", task: "부가세 신고", due: "2026-06-25", manager: "최세무", status: "지연" },
    ],
  },
}

export function MenuView({ menuId }: { menuId: string }) {
  const config = views[menuId]

  if (!config) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-border bg-card text-sm text-muted-foreground">
        준비 중인 메뉴입니다.
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{config.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {config.columns.map((col) => (
                  <th key={col.key} className="px-6 py-3 font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border last:border-0 hover:bg-muted/40"
                >
                  {config.columns.map((col) => {
                    const value = row[col.key]
                    const isStatus = config.statusKey === col.key
                    return (
                      <td key={col.key} className="px-6 py-3 text-foreground">
                        {isStatus ? (
                          <span
                            className={
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium " +
                              (statusStyles[value] ?? "bg-muted text-muted-foreground")
                            }
                          >
                            {value}
                          </span>
                        ) : (
                          value
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
