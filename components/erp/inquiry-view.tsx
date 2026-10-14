"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { ChangeHistory } from "@/components/erp/change-history"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Inquiry = {
  id: number
  company: string
  name: string
  email: string
  phone: string
  service: string
  message: string
  createdAt: string
}

const SERVICE_LABELS: Record<string, string> = {
  distribution: "유통",
  consulting: "컨설팅",
  settlement: "정산 플랫폼",
  other: "기타",
}

export function InquiryView() {
  const [rows, setRows] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<Inquiry | null>(null)

  useEffect(() => {
    api.get("/api/inquiries")
      .then((r) => setRows(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function formatDate(iso: string) {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="mobile-hidden text-lg font-semibold">문의 게시판</h2>
        <p className="text-sm text-muted-foreground">
          {loading ? "불러오는 중..." : `전체 ${rows.length}건`}
        </p>
      </div>

      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap w-12">번호</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap min-w-[120px]">회사명</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap min-w-[80px]">이름</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap min-w-[160px]">이메일</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap min-w-[120px]">연락처</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap min-w-[100px]">서비스</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap min-w-[200px]">문의 내용</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap min-w-[140px]">접수일시</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">불러오는 중...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">문의 내역이 없습니다.</td>
                  </tr>
                ) : rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="group border-t border-border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setDetail(row)}
                  >
                    <td className="px-3 py-2.5 text-muted-foreground">{rows.length - idx}</td>
                    <td className="px-3 py-2.5 font-medium">{row.company || "-"}</td>
                    <td className="px-3 py-2.5">{row.name || "-"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.email || "-"}</td>
                    <td className="px-3 py-2.5">{row.phone || "-"}</td>
                    <td className="px-3 py-2.5">
                      {row.service ? (
                        <Badge variant="secondary" className="text-xs">
                          {SERVICE_LABELS[row.service] ?? row.service}
                        </Badge>
                      ) : "-"}
                    </td>
                    <td className="px-3 py-2.5 max-w-[200px] truncate text-muted-foreground">{row.message || "-"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-base font-semibold">문의 상세</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="flex flex-col gap-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">회사명</span>
                  <span className="text-sm font-medium">{detail.company || "-"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">이름</span>
                  <span className="text-sm font-medium">{detail.name || "-"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">이메일</span>
                  <span className="text-sm">{detail.email || "-"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">연락처</span>
                  <span className="text-sm">{detail.phone || "-"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">서비스</span>
                  <span className="text-sm">{detail.service ? (SERVICE_LABELS[detail.service] ?? detail.service) : "-"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">접수일시</span>
                  <span className="text-sm">{formatDate(detail.createdAt)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">문의 내용</span>
                <p className="text-sm whitespace-pre-wrap rounded-md border border-border bg-muted/40 px-3 py-2.5">{detail.message || "-"}</p>
              </div>
              <ChangeHistory entityType="Inquiry" entityId={detail.id} refreshKey={JSON.stringify(detail)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
