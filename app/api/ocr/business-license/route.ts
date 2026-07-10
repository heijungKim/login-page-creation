import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("image") as File
    if (!file) return NextResponse.json({ error: "이미지가 없습니다." }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString("base64")
    const mediaType = file.type || "image/jpeg"

    const ocrForm = new FormData()
    ocrForm.append("base64Image", `data:${mediaType};base64,${base64}`)
    ocrForm.append("language", "kor")
    ocrForm.append("isOverlayRequired", "false")
    ocrForm.append("OCREngine", "2")
    ocrForm.append("detectOrientation", "true")
    ocrForm.append("scale", "true")

    const apiKey = process.env.OCR_SPACE_KEY || "helloworld"
    const res = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { apikey: apiKey },
      body: ocrForm,
    })

    if (!res.ok) {
      return NextResponse.json({ error: "OCR 서버 오류" }, { status: 500 })
    }

    const json = await res.json()
    if (json.IsErroredOnProcessing) {
      const msg = Array.isArray(json.ErrorMessage) ? json.ErrorMessage[0] : "OCR 처리 실패"
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const rawText: string = json.ParsedResults?.[0]?.ParsedText ?? ""
    const result = parseBusinessLicense(rawText)
    return NextResponse.json(result)
  } catch (e) {
    console.error("OCR error:", e)
    return NextResponse.json({ error: "OCR 처리에 실패했습니다." }, { status: 500 })
  }
}

function first(text: string, patterns: RegExp[]): string {
  for (const p of patterns) {
    const m = text.match(p)
    const v = m?.[1]?.split(/\n/)[0]?.trim()
    if (v) return v
  }
  return ""
}

function parseBusinessLicense(text: string) {
  const t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

  // 사업자등록번호: 000-00-00000
  const bizNo = first(t, [
    /(\d{3}[-–]\d{2}[-–]\d{5})/,
    /(\d{3}\s*[-–]\s*\d{2}\s*[-–]\s*\d{5})/,
  ]).replace(/[–]/g, "-").replace(/\s/g, "")

  // 법인등록번호: 000000-0000000 (사업자번호와 다른 자릿수)
  const corpNoMatches = [...t.matchAll(/(\d{6}[-–]\d{7})/g)]
  const corpNo = (corpNoMatches[0]?.[1] ?? "").replace(/[–]/g, "-")

  // 상호 / 법인명 — "(단체명)", "(개인)", "(법인)" 등 괄호 설명 포함 패턴 처리
  const name = first(t, [
    /법\s*인\s*명\s*(?:\([^)]*\))?\s*[：:]\s*([^\n]{2,40})/,
    /단\s*체\s*명\s*(?:\([^)]*\))?\s*[：:]\s*([^\n]{2,40})/,
    /상\s*호\s*(?:\([^)]*\))?\s*[：:]\s*([^\n]{2,40})/,
    /상\s*호\s+([가-힣a-zA-Z0-9()（）&\s]{2,40})/,
    /법\s*인\s*명\s+([가-힣a-zA-Z0-9()（）&\s]{2,40})/,
    /등\s*록\s*번\s*호[^\n]*\n\s*([가-힣a-zA-Z0-9()（）&\s]{2,40})/,
  ])

  // 대표자
  const ceo = first(t, [
    /대\s*표\s*자\s*[：:]\s*([^\n]{1,20})/,
    /대\s*표\s*자\s+([가-힣a-zA-Z\s]{1,20})/,
  ])

  // 개업연월일
  let openDate = ""
  const datePatterns = [
    /개\s*업\s*연\s*월\s*일\s*[：:]?\s*(\d{4})[년.\-\/]\s*(\d{1,2})[월.\-\/]\s*(\d{1,2})/,
    /개\s*업\s*일\s*[：:]?\s*(\d{4})[년.\-\/]\s*(\d{1,2})[월.\-\/]\s*(\d{1,2})/,
  ]
  for (const p of datePatterns) {
    const m = t.match(p)
    if (m) {
      openDate = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`
      break
    }
  }

  // 사업장소재지
  const bizAddress = first(t, [
    /사\s*업\s*장\s*소\s*재\s*지\s*[：:]\s*([^\n]{5,80})/,
    /사\s*업\s*장\s*소\s*재\s*지\s+([가-힣a-zA-Z0-9\s,\-()]{5,80})/,
  ])

  // 업태 (종목 전까지)
  const businessType = first(t, [
    /업\s*태\s*[：:]?\s*(.+?)(?=\s+종\s*목|\n|$)/,
    /업\s*태\s+(.+?)(?=\s+종\s*목|\n|$)/,
  ])

  // 종목
  const businessItem = first(t, [
    /종\s*목\s*[：:]?\s*([^\n]+)/,
    /종\s*목\s+([^\n]+)/,
  ])

  return { name, bizNo, corpNo, ceo, openDate, bizAddress, businessType, businessItem }
}
