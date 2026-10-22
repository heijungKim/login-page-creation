"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

/** 클립보드 복사. https/localhost 가 아니면 navigator.clipboard 가 없으므로 textarea 방식으로 대체한다. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to legacy copy
  }
  try {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.setAttribute("readonly", "")
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

type Props = {
  /** 클립보드에 넣을 값 */
  value: string
  /** 화면에 보여줄 내용 (없으면 value) */
  children?: ReactNode
  /** 복사 대상 이름 (툴팁/스크린리더용, 예: "계좌번호") */
  label?: string
  className?: string
}

/** 누르면 값을 복사하는 텍스트. 행 클릭 등 상위 클릭 이벤트로 전파되지 않는다. */
export function CopyText({ value, children, label, className }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle")
  const timer = useRef<number | null>(null)

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  if (!value) return <span className={className}>{children ?? "-"}</span>

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const ok = await copyToClipboard(value)
    setState(ok ? "copied" : "failed")
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState("idle"), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`${label ?? ""} 복사`.trim()}
      aria-label={`${label ?? "값"} 복사: ${value}`}
      className={cn(
        "group/copy relative inline-flex items-center gap-1 rounded px-1 -mx-1 text-left transition-colors hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span>{children ?? value}</span>
      {state === "copied" ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover/copy:text-muted-foreground" aria-hidden="true" />
      )}
      {state !== "idle" && (
        <span
          role="status"
          className={cn(
            "pointer-events-none absolute -top-7 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium text-white shadow",
            state === "copied" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {state === "copied" ? "복사됨" : "복사 실패"}
        </span>
      )}
    </button>
  )
}
