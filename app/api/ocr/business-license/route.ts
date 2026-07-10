import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("image") as File
    if (!file) return NextResponse.json({ error: "이미지가 없습니다." }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString("base64")
    const mediaType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp"

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `이 한국 사업자등록증 이미지에서 모든 항목을 추출해 JSON만 반환하세요 (설명 없이):
{
  "name": "상호(법인명)",
  "bizNo": "사업자등록번호(하이픈 포함, 예:123-45-67890)",
  "corpNo": "법인등록번호(하이픈 포함, 예:110111-1234567, 없으면 빈 문자열)",
  "ceo": "대표자성명",
  "openDate": "개업연월일(YYYY-MM-DD 형식, 예:2020-01-15)",
  "bizAddress": "사업장소재지(전체 주소)",
  "businessType": "업태",
  "businessItem": "종목"
}
찾을 수 없는 항목은 빈 문자열로 반환하세요.`,
            },
          ],
        },
      ],
    })

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : ""
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({})

    const result = JSON.parse(match[0])
    return NextResponse.json({
      name: result.name ?? "",
      bizNo: result.bizNo ?? "",
      corpNo: result.corpNo ?? "",
      ceo: result.ceo ?? "",
      openDate: result.openDate ?? "",
      bizAddress: result.bizAddress ?? "",
      businessType: result.businessType ?? "",
      businessItem: result.businessItem ?? "",
    })
  } catch (e) {
    console.error("OCR error:", e)
    return NextResponse.json({ error: "OCR 처리에 실패했습니다." }, { status: 500 })
  }
}
