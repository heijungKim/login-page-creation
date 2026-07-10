"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { type Corporation, type Shareholder } from "@/components/erp/corporation-form-dialog"
import { ApiError, api } from "@/lib/api"

// 백엔드 API 응답 형태 (shareholder: JSON 문자열, birthDate: 주민번호)
type CorporationResponse = {
  id: number
  category: string
  status: string
  name: string
  region: string
  openDate: string | null
  startDate: string | null
  intro: string
  bizNo: string
  corpNo: string
  ceo: string
  auditorDirector: string
  shareholder: string
  birthDate: string | null
  phone: string
  phonePlan: string
  bizAddress: string
  bizEmail: string
  account: string
  businessType: string
  businessItem: string
  certCorp: string
  certPersonal: string
  certExpiry: string | null
  iros: string
  irosPw: string
  irosUserNo: string
  hometaxId: string
  hometaxPw: string
  closeDate: string | null
  progressMemo: string
  note: string
  registeredAt: string
  createdAt: string
  updatedAt: string
}

type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

function parseAccount(raw: string) {
  const empty = {
    corpBankName: "", corpAccountNo: "", corpAccountPw: "",
    personalBankName: "", personalAccountNo: "", personalAccountPw: "",
  }
  try {
    const parsed = JSON.parse(raw || "{}")
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return empty
    if (parsed.corp || parsed.personal) {
      return {
        corpBankName: String(parsed.corp?.bank || ""),
        corpAccountNo: String(parsed.corp?.no || ""),
        corpAccountPw: String(parsed.corp?.pw || ""),
        personalBankName: String(parsed.personal?.bank || ""),
        personalAccountNo: String(parsed.personal?.no || ""),
        personalAccountPw: String(parsed.personal?.pw || ""),
      }
    }
    return {
      ...empty,
      corpBankName: String(parsed.bank || ""),
      corpAccountNo: String(parsed.no || ""),
      corpAccountPw: String(parsed.pw || ""),
    }
  } catch {
    return empty
  }
}

function parseShareholders(raw: string): Shareholder[] {
  try {
    const parsed = JSON.parse(raw || "[]")
    if (Array.isArray(parsed)) return parsed as Shareholder[]
  } catch {
    // 구버전 단순 문자열 → 단일 주주로 처리
  }
  return raw ? [{ name: raw, equity: "" }] : []
}

function fromResponse(r: CorporationResponse): Corporation {
  return {
    id: r.id,
    category: r.category,
    status: r.status,
    name: r.name,
    region: r.region,
    openDate: r.openDate ?? "",
    startDate: r.startDate ?? "",
    intro: r.intro ?? "",
    bizNo: r.bizNo,
    corpNo: r.corpNo,
    ceo: r.ceo,
    auditorDirector: r.auditorDirector,
    shareholders: parseShareholders(r.shareholder),
    residentNo: r.birthDate ?? "",
    phone: r.phone,
    phonePlan: r.phonePlan,
    bizAddress: r.bizAddress,
    bizEmail: r.bizEmail,
    businessType: r.businessType ?? "",
    businessItem: r.businessItem ?? "",
    ...parseAccount(r.account),
    certCorp: r.certCorp,
    certPersonal: r.certPersonal,
    certExpiry: r.certExpiry ?? "",
    iros: r.iros,
    irosPw: r.irosPw,
    irosUserNo: r.irosUserNo,
    hometaxId: r.hometaxId,
    hometaxPw: r.hometaxPw,
    closeDate: r.closeDate ?? "",
    progressMemo: r.progressMemo ?? "",
    note: r.note,
    registeredAt: r.registeredAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function toRequest(c: Corporation) {
  return {
    category: c.category,
    status: c.status,
    name: c.name,
    region: c.region,
    openDate: c.openDate || null,
    startDate: c.startDate || null,
    intro: c.intro || "",
    bizNo: c.bizNo,
    corpNo: c.corpNo,
    ceo: c.ceo,
    auditorDirector: c.auditorDirector,
    shareholder: JSON.stringify(c.shareholders || []),
    birthDate: c.residentNo || "",
    phone: c.phone,
    phonePlan: c.phonePlan,
    bizAddress: c.bizAddress,
    bizEmail: c.bizEmail,
    businessType: c.businessType || "",
    businessItem: c.businessItem || "",
    account: JSON.stringify({
      corp: { bank: c.corpBankName, no: c.corpAccountNo, pw: c.corpAccountPw },
      personal: { bank: c.personalBankName, no: c.personalAccountNo, pw: c.personalAccountPw },
    }),
    certCorp: c.certCorp,
    certPersonal: c.certPersonal,
    certExpiry: c.certExpiry || null,
    iros: c.iros,
    irosPw: c.irosPw,
    irosUserNo: c.irosUserNo,
    hometaxId: c.hometaxId,
    hometaxPw: c.hometaxPw,
    closeDate: c.closeDate || null,
    progressMemo: c.progressMemo,
    note: c.note,
    registeredAt: c.registeredAt || null,
  }
}

type CorporationsContextValue = {
  rows: Corporation[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createCorporation: (corp: Corporation) => Promise<Corporation>
  updateCorporation: (id: number, corp: Corporation) => Promise<Corporation>
  changeStatus: (id: number, status: string) => Promise<Corporation>
  removeCorporation: (id: number) => Promise<void>
}

const CorporationsContext = createContext<CorporationsContextValue | null>(null)

export function CorporationsProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<Corporation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await api.get<PageResponse<CorporationResponse>>("/api/corporations?size=200")
      setRows(page.content.map(fromResponse))
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "법인 목록을 불러오지 못했습니다."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const createCorporation = useCallback(async (corp: Corporation) => {
    const created = await api.post<CorporationResponse>("/api/corporations", toRequest(corp))
    const mapped = fromResponse(created)
    setRows((prev) => [mapped, ...prev])
    return mapped
  }, [])

  const updateCorporation = useCallback(async (id: number, corp: Corporation) => {
    const updated = await api.put<CorporationResponse>(`/api/corporations/${id}`, toRequest(corp))
    const mapped = fromResponse(updated)
    setRows((prev) => prev.map((r) => (r.id === id ? mapped : r)))
    return mapped
  }, [])

  const changeStatus = useCallback(async (id: number, status: string) => {
    const updated = await api.patch<CorporationResponse>(`/api/corporations/${id}/status`, { status })
    const mapped = fromResponse(updated)
    setRows((prev) => prev.map((r) => (r.id === id ? mapped : r)))
    return mapped
  }, [])

  const removeCorporation = useCallback(async (id: number) => {
    await api.delete(`/api/corporations/${id}`)
    setRows((prev) => prev.filter((r) => r.id !== id))
  }, [])

  return (
    <CorporationsContext.Provider
      value={{ rows, loading, error, refresh, createCorporation, updateCorporation, changeStatus, removeCorporation }}
    >
      {children}
    </CorporationsContext.Provider>
  )
}

export function useCorporations() {
  const ctx = useContext(CorporationsContext)
  if (!ctx) throw new Error("useCorporations must be used within CorporationsProvider")
  return ctx
}
