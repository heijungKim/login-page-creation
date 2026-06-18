"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  CorporationFormDialog,
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
  type Corporation,
} from "@/components/erp/corporation-form-dialog"

const statusStyles: Record<string, string> = {
  활성: "bg-blue-100 text-blue-700",
  진행중: "bg-yellow-100 text-yellow-700",
  대기중: "bg-gray-200 text-gray-700",
  중지: "bg-red-100 text-red-700",
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

const initialRows: Corporation[] = [
  {
    category: "운영 법인",
    status: "활성",
    name: "운영 법인",
    region: "서울 강남구",
    openDate: "2019-03-12",
    bizNo: "123-81-45678",
    corpNo: "110111-1234567",
    ceo: "김한빛",
    auditorDirector: "이사 박정민",
    shareholder: "김한빛 (60%)",
    birthDate: "1980-05-20",
    phone: "010-1234-5678",
    phonePlan: "5G 프리미엄",
    bizAddress: "서울 강남구 테헤란로 123",
    bizEmail: "admin@hanbit.co.kr",
    account: "신한 110-123-456789",
    certCorp: "한국전자인증 / C-2024",
    certPersonal: "yessign / P-1180",
    certExpiry: "2026-12-31",
    iros: "hanbit_iros",
    irosPw: "********",
    irosUserNo: "IR-558712",
    hometaxId: "hanbit_tax",
    hometaxPw: "********",
    note: "본사 이전 검토 중",
    registeredAt: "2024-01-15",
  },
  {
    category: "하위 법인",
    status: "진행중",
    name: "하위 법인",
    region: "서울 영등포구",
    openDate: "2015-07-01",
    bizNo: "214-88-12345",
    corpNo: "110111-7654321",
    ceo: "이대성",
    auditorDirector: "감사 정수아",
    shareholder: "이대성 (80%)",
    birthDate: "1972-11-03",
    phone: "010-2222-3333",
    phonePlan: "LTE 표준",
    bizAddress: "서울 영등포구 여의대로 7",
    bizEmail: "info@daesung.com",
    account: "국민 222-33-444555",
    certCorp: "한국정보인증 / C-3021",
    certPersonal: "yessign / P-2210",
    certExpiry: "2027-03-15",
    iros: "daesung_iros",
    irosPw: "********",
    irosUserNo: "IR-220114",
    hometaxId: "daesung_tax",
    hometaxPw: "********",
    note: "",
    registeredAt: "2023-11-02",
  },
  {
    category: "상품권 법인",
    status: "대기중",
    name: "상품권 법인",
    region: "경기 성남시",
    openDate: "2021-01-18",
    bizNo: "305-86-22119",
    corpNo: "131111-3344556",
    ceo: "박상품",
    auditorDirector: "이사 한지원",
    shareholder: "박상품 (100%)",
    birthDate: "1985-09-14",
    phone: "010-3456-7788",
    phonePlan: "5G 스탠다드",
    bizAddress: "경기 성남시 분당구 판교로 256",
    bizEmail: "contact@giftcorp.kr",
    account: "우리 305-88-221190",
    certCorp: "한국전자인증 / C-4102",
    certPersonal: "yessign / P-3315",
    certExpiry: "2025-08-30",
    iros: "gift_iros",
    irosPw: "********",
    irosUserNo: "IR-330921",
    hometaxId: "gift_tax",
    hometaxPw: "********",
    note: "상품권 발행 한도 점검 필요",
    registeredAt: "2024-03-21",
  },
  {
    category: "계약법인(영세)",
    status: "중지",
    name: "계약법인(영세)",
    region: "인천 남동구",
    openDate: "2018-04-22",
    bizNo: "412-30-55678",
    corpNo: "120111-9988776",
    ceo: "정영세",
    auditorDirector: "감사 김도윤",
    shareholder: "정영세 (50%)",
    birthDate: "1978-02-27",
    phone: "010-9876-5432",
    phonePlan: "LTE 알뜰",
    bizAddress: "인천 남동구 논현로 88",
    bizEmail: "ceo@contract-sme.kr",
    account: "기업 412-300-556789",
    certCorp: "한국정보인증 / C-5210",
    certPersonal: "yessign / P-4420",
    certExpiry: "2024-11-10",
    iros: "contract_iros",
    irosPw: "********",
    irosUserNo: "IR-440287",
    hometaxId: "contract_tax",
    hometaxPw: "********",
    note: "계약 만료로 영업 중지",
    registeredAt: "2023-08-09",
  },
  {
    category: "운영 법인",
    status: "진행중",
    name: "운영 법인",
    region: "부산 해운대구",
    openDate: "2020-09-05",
    bizNo: "606-81-77234",
    corpNo: "180111-2211009",
    ceo: "최운영",
    auditorDirector: "이사 서민호",
    shareholder: "최운영 (70%)",
    birthDate: "1983-12-01",
    phone: "010-5555-6677",
    phonePlan: "5G 프리미엄",
    bizAddress: "부산 해운대구 센텀중앙로 90",
    bizEmail: "hq@operate2.co.kr",
    account: "농협 606-8100-77234",
    certCorp: "한국전자인증 / C-6033",
    certPersonal: "yessign / P-5530",
    certExpiry: "2026-06-20",
    iros: "operate2_iros",
    irosPw: "********",
    irosUserNo: "IR-602215",
    hometaxId: "operate2_tax",
    hometaxPw: "********",
    note: "지점 확장 진행 중",
    registeredAt: "2024-05-30",
  },
  {
    category: "하위 법인",
    status: "대기중",
    name: "하위 법인",
    region: "대전 유성구",
    openDate: "2022-02-14",
    bizNo: "708-87-33445",
    corpNo: "150111-6677889",
    ceo: "윤하위",
    auditorDirector: "감사 노은채",
    shareholder: "윤하위 (90%)",
    birthDate: "1990-07-19",
    phone: "010-7788-1122",
    phonePlan: "5G 스탠다드",
    bizAddress: "대전 유성구 대학로 99",
    bizEmail: "sub@subcorp2.kr",
    account: "하나 708-870-334450",
    certCorp: "한국정보인증 / C-7044",
    certPersonal: "yessign / P-6640",
    certExpiry: "2027-01-25",
    iros: "subcorp2_iros",
    irosPw: "********",
    irosUserNo: "IR-770336",
    hometaxId: "subcorp2_tax",
    hometaxPw: "********",
    note: "설립 후 초기 세팅 대기",
    registeredAt: "2024-02-14",
  },
  {
    category: "상품권 법인",
    status: "활성",
    name: "상품권 법인",
    region: "서울 마포구",
    openDate: "2017-11-30",
    bizNo: "809-85-66012",
    corpNo: "110111-4455667",
    ceo: "강상품",
    auditorDirector: "이사 임수빈",
    shareholder: "강상품 (65%)",
    birthDate: "1981-03-08",
    phone: "010-3344-9900",
    phonePlan: "5G 프리미엄",
    bizAddress: "서울 마포구 월드컵북로 120",
    bizEmail: "sales@giftcorp2.kr",
    account: "신한 809-850-660120",
    certCorp: "한국전자인증 / C-8055",
    certPersonal: "yessign / P-7750",
    certExpiry: "2026-09-12",
    iros: "giftcorp2_iros",
    irosPw: "********",
    irosUserNo: "IR-880447",
    hometaxId: "giftcorp2_tax",
    hometaxPw: "********",
    note: "",
    registeredAt: "2023-06-18",
  },
  {
    category: "계약법인(영세)",
    status: "활성",
    name: "계약법인(영세)",
    region: "광주 서구",
    openDate: "2016-06-09",
    bizNo: "910-32-11223",
    corpNo: "200111-1122334",
    ceo: "한계약",
    auditorDirector: "감사 오세영",
    shareholder: "한계약 (55%)",
    birthDate: "1975-10-16",
    phone: "010-1212-3434",
    phonePlan: "LTE 표준",
    bizAddress: "광주 서구 상무중앙로 50",
    bizEmail: "ceo@sme2.kr",
    account: "국민 910-320-112230",
    certCorp: "한국정보인증 / C-9066",
    certPersonal: "yessign / P-8860",
    certExpiry: "2025-12-05",
    iros: "sme2_iros",
    irosPw: "********",
    irosUserNo: "IR-990558",
    hometaxId: "sme2_tax",
    hometaxPw: "********",
    note: "정기 계약 갱신 완료",
    registeredAt: "2023-09-27",
  },
  {
    category: "운영 법인",
    status: "중지",
    name: "운영 법인",
    region: "경남 창원시",
    openDate: "2014-08-21",
    bizNo: "111-81-99887",
    corpNo: "190111-5566778",
    ceo: "조운영",
    auditorDirector: "이사 백승현",
    shareholder: "조운영 (75%)",
    birthDate: "1970-04-30",
    phone: "010-6677-8899",
    phonePlan: "LTE 알뜰",
    bizAddress: "경남 창원시 성산구 중앙대로 30",
    bizEmail: "hq@operate3.co.kr",
    account: "경남 111-810-998870",
    certCorp: "한국전자인증 / C-1077",
    certPersonal: "yessign / P-9970",
    certExpiry: "2024-07-18",
    iros: "operate3_iros",
    irosPw: "********",
    irosUserNo: "IR-110669",
    hometaxId: "operate3_tax",
    hometaxPw: "********",
    note: "구조조정으로 운영 중지",
    registeredAt: "2023-04-03",
  },
]

export function CorporationsView() {
  const [rows, setRows] = useState<Corporation[]>(initialRows)
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})

  // 좌측 고정(sticky) 열(구분/상태/법인명)의 누적 left 위치
  const stickyOffsets = [0, 130, 240]

  function handleSubmit(corp: Corporation) {
    const registeredAt = new Date().toISOString().slice(0, 10)
    setRows((prev) => [{ ...corp, registeredAt }, ...prev])
  }

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filteredRows = useMemo(() => {
    const categoryOrder = ["운영 법인", "계약법인(영세)", "하위 법인", "상품권 법인"]
    const statusOrder = ["활성", "진행중", "대기중", "중지"]
    const orderIndex = (list: string[], value: string) => {
      const i = list.indexOf(value)
      return i === -1 ? list.length : i
    }

    return rows
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
  }, [rows, filters])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">법인 관리</h2>
          <p className="text-sm text-muted-foreground">
            전체 {rows.length}개 법인 · 현재 {filteredRows.length}개 표시
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
                      className="group border-b border-border/60 transition-colors last:border-0 hover:bg-accent/50"
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
    </div>
  )
}
