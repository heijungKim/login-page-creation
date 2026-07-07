"use client"

import { useRef, useState } from "react"
import * as XLSX from "xlsx"
import { Upload, Download, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { suppressUnauthorizedRedirect } from "@/lib/api"

function normalizeDate(val: string): string {
  const m = val.replace(/\.\s*/g, "-").replace(/\//g, "-").replace(/-+$/, "").trim()
  const parts = m.split("-").map((p) => p.trim().padStart(2, "0"))
  if (parts.length === 3 && parts[0].length === 4) return parts.join("-")
  return val
}

export type ExcelColumn = {
  key: string
  label: string
  required?: boolean
  example?: string
  options?: string[]
}

type UploadResult = { success: number; failed: Array<{ row: number; reason: string }> }

// rowIndex → colKey → error message
type CellErrors = Record<number, Record<string, string>>

function validateRows(rows: Record<string, string>[], columns: ExcelColumn[]): CellErrors {
  const errors: CellErrors = {}
  rows.forEach((row, i) => {
    columns.forEach((col) => {
      const val = (row[col.key] ?? "").trim()
      if (col.required && !val) {
        if (!errors[i]) errors[i] = {}
        errors[i][col.key] = "필수 항목 — 값을 입력해주세요"
      } else if (col.options?.length && val && !col.options.includes(val)) {
        if (!errors[i]) errors[i] = {}
        errors[i][col.key] = `"${val}" 은(는) 사용할 수 없는 값입니다\n입력 가능: ${col.options.join(" / ")}`
      }
    })
  })
  return errors
}

type Props = {
  templateName: string
  columns: ExcelColumn[]
  onRows: (rows: Record<string, string>[]) => Promise<UploadResult>
}

export function ExcelUploadButton({ templateName, columns, onRows }: Props) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [fileName, setFileName] = useState("")
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [cellErrors, setCellErrors] = useState<CellErrors>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const errorRowCount = Object.keys(cellErrors).length
  const hasErrors = errorRowCount > 0

  // 오류 목록: [{ rowLabel, colLabel, message }]
  const errorList = Object.entries(cellErrors).flatMap(([rowIdx, cols]) =>
    Object.entries(cols).map(([colKey, msg]) => ({
      rowLabel: `${Number(rowIdx) + 2}행`,
      colLabel: columns.find((c) => c.key === colKey)?.label ?? colKey,
      message: msg,
    }))
  )

  function handleClose() {
    setOpen(false)
    setPreview([])
    setFileName("")
    setResult(null)
    setParseError(null)
    setCellErrors({})
    if (fileRef.current) fileRef.current.value = ""
  }

  function downloadTemplate() {
    const headers = columns.map((c) => c.label)
    const example = columns.map((c) => c.example ?? "")
    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    ws["!cols"] = columns.map(() => ({ wch: 20 }))
    const dataValidations: XLSX.DataValidation[] = []
    columns.forEach((col, colIdx) => {
      if (!col.options?.length) return
      const colLetter = XLSX.utils.encode_col(colIdx)
      dataValidations.push({
        type: "list",
        sqref: `${colLetter}2:${colLetter}10000`,
        formula1: `"${col.options.join(",")}"`,
        showDropDown: false,
      } as XLSX.DataValidation)
    })
    if (dataValidations.length > 0) ws["!dataValidations"] = dataValidations
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "데이터")
    XLSX.writeFile(wb, `${templateName}_양식.xlsx`)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError(null)
    setResult(null)
    setCellErrors({})

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: "array", cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" })

        if (raw.length < 2) {
          setParseError("데이터가 없습니다. 헤더 포함 2행 이상 필요합니다.")
          return
        }

        const headerRow = raw[0] as string[]
        const colMap: Record<string, number> = {}
        columns.forEach((col) => {
          const idx = headerRow.findIndex((h) => String(h).trim() === col.label)
          if (idx !== -1) colMap[col.key] = idx
        })

        const missing = columns.filter((c) => c.required && colMap[c.key] === undefined).map((c) => c.label)
        if (missing.length > 0) {
          setParseError(`필수 열이 없습니다: ${missing.join(", ")}`)
          return
        }

        const rows: Record<string, string>[] = []
        for (let i = 1; i < raw.length; i++) {
          const row = raw[i] as unknown[]
          const isEmpty = columns.every((c) => {
            const idx = colMap[c.key]
            return idx === undefined || String(row[idx] ?? "").trim() === ""
          })
          if (isEmpty) continue
          const obj: Record<string, string> = {}
          columns.forEach((c) => {
            const idx = colMap[c.key]
            if (idx === undefined) { obj[c.key] = ""; return }
            const val = row[idx]
            if (val instanceof Date) {
              const y = val.getFullYear()
              const mo = String(val.getMonth() + 1).padStart(2, "0")
              const d = String(val.getDate()).padStart(2, "0")
              obj[c.key] = `${y}-${mo}-${d}`
            } else {
              obj[c.key] = normalizeDate(String(val ?? "").trim())
            }
          })
          rows.push(obj)
        }

        if (rows.length === 0) {
          setParseError("데이터 행이 없습니다.")
          return
        }

        const errors = validateRows(rows, columns)
        setPreview(rows)
        setCellErrors(errors)
      } catch {
        setParseError("파일을 읽을 수 없습니다. 올바른 엑셀 파일인지 확인해주세요.")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleUpload() {
    if (preview.length === 0 || hasErrors) return
    setUploading(true)
    setResult(null)
    suppressUnauthorizedRedirect(true)
    try {
      const res = await onRows(preview)
      setResult(res)
      setPreview([])
      setFileName("")
      setCellErrors({})
      if (fileRef.current) fileRef.current.value = ""
    } catch (e) {
      setResult({ success: 0, failed: [{ row: 0, reason: e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다." }] })
    } finally {
      suppressUnauthorizedRedirect(false)
      setUploading(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        엑셀 업로드
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
        <DialogContent className="sm:max-w-6xl flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base">엑셀 업로드 — {templateName}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-1 min-h-0">
            {/* 1단계: 양식 다운로드 */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-semibold text-primary mb-2">① 양식 다운로드 (필수)</p>
              <div className="flex items-center gap-3">
                <Button size="sm" className="gap-1.5" onClick={downloadTemplate}>
                  <Download className="h-4 w-4" />
                  양식 다운로드
                </Button>
                <span className="text-xs text-muted-foreground">
                  {columns.filter((c) => c.required).length}개 필수 / 전체 {columns.length}개 열
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {columns.map((c) => (
                  <span key={c.key} className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                    c.required
                      ? "bg-primary/10 text-primary font-medium"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {c.label}{c.required && " *"}{c.options && ` (${c.options.join("/")})`}
                  </span>
                ))}
              </div>
            </div>

            {/* 2단계: 파일 선택 */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">② 파일 선택 (.xlsx / .xls)</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  파일 선택
                </Button>
                {fileName && (
                  <div className="flex items-center gap-1.5 text-xs text-foreground">
                    <span className="truncate max-w-[240px]">{fileName}</span>
                    <button onClick={() => { setFileName(""); setPreview([]); setParseError(null); setCellErrors({}); if (fileRef.current) fileRef.current.value = "" }}>
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
              {parseError && (
                <p className="mt-2 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />{parseError}
                </p>
              )}
            </div>

            {/* 오류 목록 */}
            {hasErrors && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5 mb-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errorRowCount}행에서 {errorList.length}개 오류 발견 — 엑셀 파일을 수정 후 다시 업로드해주세요
                </p>
                <ul className="space-y-1">
                  {errorList.map((e, i) => (
                    <li key={i} className="text-xs text-destructive flex gap-2">
                      <span className="shrink-0 font-semibold w-10">{e.rowLabel}</span>
                      <span className="shrink-0 font-medium text-destructive/80 w-24 truncate">[{e.colLabel}]</span>
                      <span className="whitespace-pre-line">{e.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 미리보기 — 전체 행 표시 */}
            {preview.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">
                    미리보기 ({preview.length}행
                    {hasErrors && <span className="text-destructive"> · {errorRowCount}행 오류</span>})
                  </p>
                  {hasErrors && (
                    <span className="text-[10px] text-destructive/70">빨간색 셀을 엑셀에서 수정 후 파일을 다시 선택해주세요</span>
                  )}
                </div>
                <div className="overflow-auto max-h-80">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap w-10 bg-muted/30">행</th>
                        {columns.map((c) => (
                          <th key={c.key} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap bg-muted/30">
                            {c.label}{c.required && <span className="text-destructive ml-0.5">*</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {preview.map((row, i) => {
                        const rowHasError = !!cellErrors[i]
                        return (
                          <tr
                            key={i}
                            className={cn(
                              rowHasError ? "bg-red-50" : i % 2 === 1 ? "bg-muted/10" : ""
                            )}
                          >
                            <td className={cn(
                              "px-3 py-2 text-center font-semibold whitespace-nowrap",
                              rowHasError ? "text-destructive" : "text-muted-foreground"
                            )}>
                              {i + 2}
                            </td>
                            {columns.map((c) => {
                              const err = cellErrors[i]?.[c.key]
                              return (
                                <td
                                  key={c.key}
                                  className={cn(
                                    "px-3 py-2 whitespace-nowrap",
                                    err ? "bg-red-100" : ""
                                  )}
                                >
                                  {err ? (
                                    <div className="flex items-start gap-1">
                                      <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                                      <div>
                                        <span className={cn(
                                          "block font-medium",
                                          row[c.key] ? "text-red-700" : "text-red-400 italic"
                                        )}>
                                          {row[c.key] || "비어 있음"}
                                        </span>
                                        <span className="block text-[10px] text-destructive/80 leading-tight whitespace-pre-line max-w-[200px]">
                                          {err}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="block truncate max-w-[140px] text-foreground">
                                      {row[c.key] || <span className="text-muted-foreground/40">-</span>}
                                    </span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 업로드 결과 */}
            {result && (
              <div className={cn(
                "rounded-lg border p-4",
                result.failed.length === 0
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-orange-200 bg-orange-50"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">성공 {result.success}건</span>
                  {result.failed.length > 0 && (
                    <>
                      <AlertCircle className="h-4 w-4 text-orange-500 ml-2" />
                      <span className="text-sm font-semibold text-orange-700">실패 {result.failed.length}건</span>
                    </>
                  )}
                </div>
                {result.failed.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {result.failed.map((f, i) => (
                      <li key={i} className="text-xs text-orange-700">{f.row}행: {f.reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-border pt-4">
            <Button variant="outline" onClick={handleClose}>닫기</Button>
            <Button
              onClick={handleUpload}
              disabled={preview.length === 0 || uploading || hasErrors}
              className="gap-1.5 min-w-[80px]"
            >
              {uploading
                ? <><Loader2 className="h-4 w-4 animate-spin" />업로드 중...</>
                : hasErrors
                  ? <><AlertCircle className="h-4 w-4" />오류 수정 필요 ({errorRowCount}행)</>
                  : `${preview.length}건 업로드`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
