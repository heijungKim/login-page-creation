"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError, api } from "@/lib/api"
import { cn } from "@/lib/utils"

export type SavedLink = { id: number; name: string; url: string }

type Props = {
  /** 지금 입력칸에 들어 있는 URL (새로 저장할 때 기본값) */
  currentUrl: string
  /** 링크를 고르면 호출 */
  onSelect: (link: SavedLink) => void
  onClose: () => void
  className?: string
}

/**
 * 자주 쓰는 링크 주소록 패널.
 * 목록에서 고르면 입력칸에 넣고, 명칭+링크를 새로 저장하거나 지울 수 있다. (서버에 저장되어 모든 관리자가 함께 사용)
 */
export function LinkBook({ currentUrl, onSelect, onClose, className }: Props) {
  const [links, setLinks] = useState<SavedLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [url, setUrl] = useState(currentUrl)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    let cancelled = false
    api.get<SavedLink[]>("/api/saved-links")
      .then((res) => { if (!cancelled) setLinks(res) })
      .catch((e) => { if (!cancelled) setError(e instanceof ApiError ? e.message : "주소록을 불러오지 못했습니다.") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function handleAdd() {
    if (!name.trim() || !url.trim()) { setError("명칭과 링크를 모두 입력해주세요."); return }
    setSaving(true)
    setError(null)
    try {
      const created = await api.post<SavedLink>("/api/saved-links", { name: name.trim(), url: url.trim() })
      setLinks((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "ko")))
      setName("")
      setUrl("")
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "저장에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(link: SavedLink) {
    if (!confirm(`"${link.name}" 링크를 주소록에서 삭제할까요?`)) return
    try {
      await api.delete(`/api/saved-links/${link.id}`)
      setLinks((prev) => prev.filter((l) => l.id !== link.id))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "삭제에 실패했습니다.")
    }
  }

  const q = query.trim().toLowerCase()
  const shown = q ? links.filter((l) => l.name.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)) : links

  return (
    <div className={cn("rounded-lg border border-primary/30 bg-primary/5 p-3", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">링크 주소록</p>
        <div className="flex items-center gap-1">
          {links.length > 5 && (
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="검색" className="h-7 w-32 text-xs" aria-label="링크 검색" />
          )}
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="주소록 닫기">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="py-3 text-center text-xs text-muted-foreground">불러오는 중...</p>
      ) : shown.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">{q ? "검색 결과가 없습니다." : "저장된 링크가 없습니다. 아래에서 추가하세요."}</p>
      ) : (
        <ul className="max-h-44 overflow-y-auto rounded-md border border-border bg-background">
          {shown.map((l) => (
            <li key={l.id} className="flex items-center gap-2 border-b border-border/60 px-2 py-1.5 last:border-0 hover:bg-accent/60">
              <button type="button" className="flex min-w-0 flex-1 flex-col text-left" onClick={() => onSelect(l)} title="이 링크 넣기">
                <span className="truncate text-sm font-medium text-foreground">{l.name}</span>
                <span className="truncate text-[11px] text-muted-foreground">{l.url}</span>
              </button>
              <Button type="button" size="sm" variant="outline" className="h-7 shrink-0 px-2 text-xs" onClick={() => onSelect(l)}>선택</Button>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground" aria-label={`${l.name} 열기`} onClick={(e) => e.stopPropagation()}>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button type="button" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => void handleDelete(l)} aria-label={`${l.name} 삭제`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-col gap-1.5 sm:flex-row">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="명칭 (예: SKT 다이렉트)" className="h-8 text-xs sm:w-40" aria-label="링크 명칭"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAdd() } }} />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="링크 (예: www.tworld.co.kr)" className="h-8 flex-1 text-xs" aria-label="링크 주소" inputMode="url"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAdd() } }} />
        <Button type="button" size="sm" className="h-8 gap-1 px-2.5 text-xs" disabled={saving} onClick={() => void handleAdd()}>
          <Plus className="h-3.5 w-3.5" />{saving ? "저장 중" : "추가"}
        </Button>
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  )
}
