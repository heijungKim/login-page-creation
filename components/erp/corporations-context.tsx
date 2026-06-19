"use client"

import { createContext, useContext, useState } from "react"
import { type Corporation } from "@/components/erp/corporation-form-dialog"

export const initialRows: Corporation[] = [
  {
    category: "운영 법인", status: "활성", name: "운영 법인", region: "서울 강남구",
    openDate: "2019-03-12", bizNo: "123-81-45678", corpNo: "110111-1234567",
    ceo: "김한빛", auditorDirector: "이사 박정민", shareholder: "김한빛 (60%)",
    birthDate: "1980-05-20", phone: "010-1234-5678", phonePlan: "5G 프리미엄",
    bizAddress: "서울 강남구 테헤란로 123", bizEmail: "admin@hanbit.co.kr",
    account: "신한 110-123-456789", certCorp: "한국전자인증 / C-2024",
    certPersonal: "yessign / P-1180", certExpiry: "2026-12-31",
    iros: "hanbit_iros", irosPw: "********", irosUserNo: "IR-558712",
    hometaxId: "hanbit_tax", hometaxPw: "********",
    note: "본사 이전 검토 중", registeredAt: "2024-01-15",
  },
  {
    category: "하위 법인", status: "진행중", name: "하위 법인", region: "서울 영등포구",
    openDate: "2015-07-01", bizNo: "214-88-12345", corpNo: "110111-7654321",
    ceo: "이대성", auditorDirector: "감사 정수아", shareholder: "이대성 (80%)",
    birthDate: "1972-11-03", phone: "010-2222-3333", phonePlan: "LTE 표준",
    bizAddress: "서울 영등포구 여의대로 7", bizEmail: "info@daesung.com",
    account: "국민 222-33-444555", certCorp: "한국정보인증 / C-3021",
    certPersonal: "yessign / P-2210", certExpiry: "2027-03-15",
    iros: "daesung_iros", irosPw: "********", irosUserNo: "IR-220114",
    hometaxId: "daesung_tax", hometaxPw: "********",
    note: "", registeredAt: "2023-11-02",
  },
  {
    category: "상품권 법인", status: "대기중", name: "상품권 법인", region: "경기 성남시",
    openDate: "2021-01-18", bizNo: "305-86-22119", corpNo: "131111-3344556",
    ceo: "박상품", auditorDirector: "이사 한지원", shareholder: "박상품 (100%)",
    birthDate: "1985-09-14", phone: "010-3456-7788", phonePlan: "5G 스탠다드",
    bizAddress: "경기 성남시 분당구 판교로 256", bizEmail: "contact@giftcorp.kr",
    account: "우리 305-88-221190", certCorp: "한국전자인증 / C-4102",
    certPersonal: "yessign / P-3315", certExpiry: "2025-08-30",
    iros: "gift_iros", irosPw: "********", irosUserNo: "IR-330921",
    hometaxId: "gift_tax", hometaxPw: "********",
    note: "상품권 발행 한도 점검 필요", registeredAt: "2024-03-21",
  },
  {
    category: "계약법인(영세)", status: "중지", name: "계약법인(영세)", region: "인천 남동구",
    openDate: "2018-04-22", bizNo: "412-30-55678", corpNo: "120111-9988776",
    ceo: "정영세", auditorDirector: "감사 김도윤", shareholder: "정영세 (50%)",
    birthDate: "1978-02-27", phone: "010-9876-5432", phonePlan: "LTE 알뜰",
    bizAddress: "인천 남동구 논현로 88", bizEmail: "ceo@contract-sme.kr",
    account: "기업 412-300-556789", certCorp: "한국정보인증 / C-5210",
    certPersonal: "yessign / P-4420", certExpiry: "2024-11-10",
    iros: "contract_iros", irosPw: "********", irosUserNo: "IR-440287",
    hometaxId: "contract_tax", hometaxPw: "********",
    note: "계약 만료로 영업 중지", registeredAt: "2023-08-09",
  },
  {
    category: "운영 법인", status: "진행중", name: "운영 법인", region: "부산 해운대구",
    openDate: "2020-09-05", bizNo: "606-81-77234", corpNo: "180111-2211009",
    ceo: "최운영", auditorDirector: "이사 서민호", shareholder: "최운영 (70%)",
    birthDate: "1983-12-01", phone: "010-5555-6677", phonePlan: "5G 프리미엄",
    bizAddress: "부산 해운대구 센텀중앙로 90", bizEmail: "hq@operate2.co.kr",
    account: "농협 606-8100-77234", certCorp: "한국전자인증 / C-6033",
    certPersonal: "yessign / P-5530", certExpiry: "2026-06-20",
    iros: "operate2_iros", irosPw: "********", irosUserNo: "IR-602215",
    hometaxId: "operate2_tax", hometaxPw: "********",
    note: "지점 확장 진행 중", registeredAt: "2024-05-30",
  },
  {
    category: "하위 법인", status: "대기중", name: "하위 법인", region: "대전 유성구",
    openDate: "2022-02-14", bizNo: "708-87-33445", corpNo: "150111-6677889",
    ceo: "윤하위", auditorDirector: "감사 노은채", shareholder: "윤하위 (90%)",
    birthDate: "1990-07-19", phone: "010-7788-1122", phonePlan: "5G 스탠다드",
    bizAddress: "대전 유성구 대학로 99", bizEmail: "sub@subcorp2.kr",
    account: "하나 708-870-334450", certCorp: "한국정보인증 / C-7044",
    certPersonal: "yessign / P-6640", certExpiry: "2027-01-25",
    iros: "subcorp2_iros", irosPw: "********", irosUserNo: "IR-770336",
    hometaxId: "subcorp2_tax", hometaxPw: "********",
    note: "설립 후 초기 세팅 대기", registeredAt: "2024-02-14",
  },
  {
    category: "상품권 법인", status: "활성", name: "상품권 법인", region: "서울 마포구",
    openDate: "2017-11-30", bizNo: "809-85-66012", corpNo: "110111-4455667",
    ceo: "강상품", auditorDirector: "이사 임수빈", shareholder: "강상품 (65%)",
    birthDate: "1981-03-08", phone: "010-3344-9900", phonePlan: "5G 프리미엄",
    bizAddress: "서울 마포구 월드컵북로 120", bizEmail: "sales@giftcorp2.kr",
    account: "신한 809-850-660120", certCorp: "한국전자인증 / C-8055",
    certPersonal: "yessign / P-7750", certExpiry: "2026-09-12",
    iros: "giftcorp2_iros", irosPw: "********", irosUserNo: "IR-880447",
    hometaxId: "giftcorp2_tax", hometaxPw: "********",
    note: "", registeredAt: "2023-06-18",
  },
  {
    category: "계약법인(영세)", status: "활성", name: "계약법인(영세)", region: "광주 서구",
    openDate: "2016-06-09", bizNo: "910-32-11223", corpNo: "200111-1122334",
    ceo: "한계약", auditorDirector: "감사 오세영", shareholder: "한계약 (55%)",
    birthDate: "1975-10-16", phone: "010-1212-3434", phonePlan: "LTE 표준",
    bizAddress: "광주 서구 상무중앙로 50", bizEmail: "ceo@sme2.kr",
    account: "국민 910-320-112230", certCorp: "한국정보인증 / C-9066",
    certPersonal: "yessign / P-8860", certExpiry: "2025-12-05",
    iros: "sme2_iros", irosPw: "********", irosUserNo: "IR-990558",
    hometaxId: "sme2_tax", hometaxPw: "********",
    note: "정기 계약 갱신 완료", registeredAt: "2023-09-27",
  },
  {
    category: "운영 법인", status: "중지", name: "운영 법인", region: "경남 창원시",
    openDate: "2014-08-21", bizNo: "111-81-99887", corpNo: "190111-5566778",
    ceo: "조운영", auditorDirector: "이사 백승현", shareholder: "조운영 (75%)",
    birthDate: "1970-04-30", phone: "010-6677-8899", phonePlan: "LTE 알뜰",
    bizAddress: "경남 창원시 성산구 중앙대로 30", bizEmail: "hq@operate3.co.kr",
    account: "경남 111-810-998870", certCorp: "한국전자인증 / C-1077",
    certPersonal: "yessign / P-9970", certExpiry: "2024-07-18",
    iros: "operate3_iros", irosPw: "********", irosUserNo: "IR-110669",
    hometaxId: "operate3_tax", hometaxPw: "********",
    note: "구조조정으로 운영 중지", registeredAt: "2023-04-03",
  },
]

type CorporationsContextValue = {
  rows: Corporation[]
  setRows: React.Dispatch<React.SetStateAction<Corporation[]>>
}

const CorporationsContext = createContext<CorporationsContextValue | null>(null)

export function CorporationsProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<Corporation[]>(initialRows)
  return (
    <CorporationsContext.Provider value={{ rows, setRows }}>
      {children}
    </CorporationsContext.Provider>
  )
}

export function useCorporations() {
  const ctx = useContext(CorporationsContext)
  if (!ctx) throw new Error("useCorporations must be used within CorporationsProvider")
  return ctx
}
