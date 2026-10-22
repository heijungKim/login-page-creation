"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ApiError, api } from "@/lib/api"
import { ChangeHistory } from "@/components/erp/change-history"
import { CopyText } from "@/components/erp/copy-text"

type AddressEntry = {
  id: number
  companyName: string
  ceoName: string
  contact: string
  address: string
  createdAt: string
  updatedAt: string
}

type FormState = { companyName: string; ceoName: string; contact: string; address: string }
const emptyForm: FormState = { companyName: "", ceoName: "", contact: "", address: "" }

/** 숫자만 입력하면 휴대폰/지역번호 형식으로 하이픈을 넣는다. 숫자 외 문자가 있으면 그대로 둔다. */
function formatContact(value: string): string {
  if (/[^\d-\s]/.test(value)) return value
  const d = value.replace(/\D/g, "").slice(0, 11)
  if (d.startsWith("02")) {
    if (d.length <= 2) return d
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`
  }
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function EntryForm({ form, onChange }: { form: FormState; onChange: (patch: Partial<FormState>) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ab-company" className="text-xs text-muted-foreground">업체명 <span className="text-destructive">*</span></Label>
        <Input id="ab-company" value={form.companyName} onChange={(e) => onChange({ companyName: e.target.value })} placeholder="예: 주식회사 프리드" autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ab-ceo" className="text-xs text-muted-foreground">대표자명</Label>
        <Input id="ab-ceo" value={form.ceoName} onChange={(e) => onChange({ ceoName: e.target.value })} placeholder="예: 홍길동" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ab-contact" className="text-xs text-muted-foreground">연락처</Label>
        <Input id="ab-contact" value={form.contact} onChange={(e) => onChange({ contact: formatContact(e.target.value) })} placeholder="010-0000-0000" inputMode="tel" />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="ab-address" className="text-xs text-muted-foreground">주소지</Label>
        <Input id="ab-address" value={form.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="예: 경기도 포천시 ..." />
      </div>
    </div>
  )
}

export function AddressBookView() {
  const [rows, setRows] = useState<AddressEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<FormState>(emptyForm)
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const [detail, setDetail] = useState<AddressEntry | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setRows(await api.get<AddressEntry[]>("/api/address-book"))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "주소록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    const qDigits = q.replace(/\D/g, "")
    return rows.filter((r) =>
      [r.companyName, r.ceoName, r.address].some((v) => v.toLowerCase().includes(q)) ||
      r.contact.toLowerCase().includes(q) ||
      (qDigits.length >= 3 && r.contact.replace(/\D/g, "").includes(qDigits)),
    )
  }, [rows, query])

  function openDetail(row: AddressEntry) {
    setDetail(row)
    setEditForm({ companyName: row.companyName, ceoName: row.ceoName, contact: row.contact, address: row.address })
    setEditError(null)
    setDeleteConfirm(false)
  }

  const editDirty = !!detail && (
    editForm.companyName !== detail.companyName ||
    editForm.ceoName !== detail.ceoName ||
    editForm.contact !== detail.contact ||
    editForm.address !== detail.address
  )

  async function handleAdd() {
    if (!addForm.companyName.trim()) { setAddError("업체명을 입력해주세요."); return }
    setAdding(true)
    setAddError(null)
    try {
      await api.post<AddressEntry>("/api/address-book", addForm)
      setAddOpen(false)
      setAddForm(emptyForm)
      await refresh()
    } catch (e) {
      setAddError(e instanceof ApiError ? e.message : "등록에 실패했습니다.")
    } finally {
      setAdding(false)
    }
  }

  async function handleSave() {
    if (!detail) return
    if (!editForm.companyName.trim()) { setEditError("업체명을 입력해주세요."); return }
    setSaving(true)
    setEditError(null)
    try {
      const updated = await api.put<AddressEntry>(`/api/address-book/${detail.id}`, editForm)
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      openDetail(updated)
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : "수정에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!detail) return
    setSaving(true)
    try {
      await api.delete(`/api/address-book/${detail.id}`)
      setRows((prev) => prev.filter((r) => r.id !== detail.id))
      setDetail(null)
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : "삭제에 실패했습니다.")
    } finally {
      setSaving(false)
      setDeleteConfirm(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="mobile-hidden text-xl font-semibold tracking-tight text-foreground">주소록</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "불러오는 중..." : query ? `전체 ${rows.length}건 · 검색 ${filtered.length}건` : `전체 ${rows.length}건`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="업체명·대표자·연락처·주소 검색"
              className="h-9 w-64 pl-8"
              aria-label="주소록 검색"
            />
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => { setAddForm(emptyForm); setAddError(null); setAddOpen(true) }}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            주소 등록
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      )}

      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="max-h-[calc(100svh-14rem)] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-muted">
                <tr className="text-left text-muted-foreground">
                  <th className="w-12 px-3 py-2.5 font-medium">번호</th>
                  <th className="min-w-[180px] px-3 py-2.5 font-medium">업체명</th>
                  <th className="min-w-[100px] px-3 py-2.5 font-medium">대표자명</th>
                  <th className="min-w-[140px] px-3 py-2.5 font-medium">연락처</th>
                  <th className="min-w-[260px] px-3 py-2.5 font-medium">주소지</th>
                  <th className="min-w-[100px] px-3 py-2.5 font-medium">등록일</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="h-48 text-center text-muted-foreground">불러오는 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-48 text-center text-muted-foreground">
                      {query ? "검색 결과가 없습니다." : "등록된 주소가 없습니다. 오른쪽 위 '주소 등록'으로 추가하세요."}
                    </td>
                  </tr>
                ) : filtered.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-border/60 transition-colors hover:bg-accent/50"
                    onClick={() => openDetail(row)}
                  >
                    <td className="px-3 py-2.5 text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground">{row.companyName}</td>
                    <td className="px-3 py-2.5">{row.ceoName || "-"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <CopyText value={row.contact} label="연락처" className="tabular-nums" />
                    </td>
                    <td className="px-3 py-2.5">
                      <CopyText value={row.address} label="주소지" />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 등록 */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) setAddOpen(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>주소 등록</DialogTitle></DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void handleAdd() }}>
            <EntryForm form={addForm} onChange={(p) => setAddForm((f) => ({ ...f, ...p }))} />
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
              <Button type="submit" disabled={adding}>{adding ? "등록 중..." : "등록"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 상세 / 수정 */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>주소록 상세</DialogTitle></DialogHeader>
          {detail && (
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (editDirty) void handleSave() }}>
              <EntryForm form={editForm} onChange={(p) => setEditForm((f) => ({ ...f, ...p }))} />
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              <ChangeHistory entityType="AddressBookEntry" entityId={detail.id} refreshKey={detail.updatedAt} />
              <DialogFooter className="sm:justify-between">
                {deleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive">정말 삭제할까요?</span>
                    <Button type="button" variant="destructive" size="sm" disabled={saving} onClick={() => void handleDelete()}>삭제</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setDeleteConfirm(false)}>아니오</Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteConfirm(true)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />삭제
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setDetail(null)}>닫기</Button>
                  <Button type="submit" disabled={saving || !editDirty}>{saving ? "저장 중..." : "저장"}</Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
