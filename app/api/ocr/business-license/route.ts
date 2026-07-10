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
      max_tokens: 256,
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
              text: `이 한국 사업자등록증 이미지에서 정보를 추출해 JSON만 반환하세요 (설명 없이):
{"bizNo":"사업자등록번호(하이픈 포함 예:123-45-67890)","ceo":"대표자성명"}
찾을 수 없으면 빈 문자열로 반환하세요.`,
            },
          ],
        },
      ],
    })

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : ""
    const match = text.match(/\{[\s\S]*?\}/)
    if (!match) return NextResponse.json({ bizNo: "", ceo: "" })

    const result = JSON.parse(match[0])
    return NextResponse.json({ bizNo: result.bizNo ?? "", ceo: result.ceo ?? "" })
  } catch (e) {
    console.error("OCR error:", e)
    return NextResponse.json({ error: "OCR 처리에 실패했습니다." }, { status: 500 })
  }
}
