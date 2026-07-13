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
    console.log("[OCR] key prefix:", apiKey.slice(0, 6), "| base64 length:", base64.length)

    let res: Response
    try {
      res = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: { apikey: apiKey },
        body: ocrForm,
      })
    } catch (fetchErr) {
      console.error("[OCR] fetch 네트워크 오류:", fetchErr)
      return NextResponse.json({ error: "OCR 네트워크 오류: " + String(fetchErr) }, { status: 500 })
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error("[OCR] 서버 오류 status:", res.status, body)
      return NextResponse.json({ error: `OCR 서버 오류 (${res.status}): ${body}` }, { status: 500 })
    }

    const json = await res.json()
    if (json.IsErroredOnProcessing) {
      const msg = Array.isArray(json.ErrorMessage) ? json.ErrorMessage[0] : "OCR 처리 실패"
      console.error("[OCR] IsErroredOnProcessing:", json.ErrorMessage)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const rawText: string = json.ParsedResults?.[0]?.ParsedText ?? ""
    console.log("[OCR] raw text:\n", rawText)
    const result = parseBusinessLicense(rawText)
    console.log("[OCR] parsed result:", JSON.stringify(result))
    return NextResponse.json({ ...result, _rawText: rawText })
  } catch (e) {
    console.error("[OCR] 예외:", e)
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
  // \s를 캐릭터 클래스에서 제거해 줄바꿈을 넘어가지 않도록 함
  const name = first(t, [
    /법\s*인\s*명\s*(?:\([^)]*\))?\s*[：:]\s*([^\n]{2,40})/,
    /단\s*체\s*명\s*(?:\([^)]*\))?\s*[：:]\s*([^\n]{2,40})/,
    /상\s*호\s*(?:\([^)]*\))?\s*[：:]\s*([^\n]{2,40})/,
    // 콜론 없이 '상호' 바로 뒤에 값 (줄바꿈 불가)
    /상\s*호\s+([가-힣a-zA-Z0-9()（）&][^\n]{1,39})/,
    // '상'이 분리된 경우: 줄 시작에 '호 : 신익' 패턴 (등록번호 오매칭 방지 위해 한글 시작 필수)
    /(?:^|\n)\s*호\s*[：:]\s*([가-힣][^\n]{1,39})/m,
    /법\s*인\s*명\s+([가-힣a-zA-Z0-9()（）&][^\n]{1,39})/,
    // 등록번호 다음 줄 — \s 제거하여 줄바꿈 넘김 방지
    /등\s*록\s*번\s*호[^\n]*\n[^\n]*?([가-힣]{2,20}[가-힣a-zA-Z0-9()（）&\s]{0,19})/,
  ])

  // 대표자 (성명/대표자명 분리 포함)
  const ceo = first(t, [
    /대\s*표\s*자\s*[：:]\s*([^\n]{1,20})/,
    /대\s*표\s*자\s+([가-힣a-zA-Z\s]{1,20})/,
    // '성명'이 '성\n명 :' 으로 분리된 경우
    /(?:^|\n)\s*명\s*[：:]\s*([가-힣][^\n]{1,20})/m,
  ])

  // 개업연월일
  let openDate = ""
  const datePatterns = [
    /개\s*업\s*연\s*월\s*일\s*[：:]?\s*(\d{4})\s*[년.\-\/]\s*(\d{1,2})\s*[월.\-\/]\s*(\d{1,2})/,
    /개\s*업\s*일\s*[：:]?\s*(\d{4})\s*[년.\-\/]\s*(\d{1,2})\s*[월.\-\/]\s*(\d{1,2})/,
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

  // 종목 (점 제거)
  const businessItem = first(t, [
    /종\s*목\s*[：:]?\s*([^\n]+)/,
    /종\s*목\s+([^\n]+)/,
  ]).replace(/\./g, "").trim()

  return { name, bizNo, corpNo, ceo, openDate, bizAddress, businessType, businessItem }
}
