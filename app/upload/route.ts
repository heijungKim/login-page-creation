import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join, extname } from "path"
import { existsSync } from "fs"

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/app/uploads"

export async function POST(request: NextRequest) {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })

    const ext = extname(file.name) || ".bin"
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    const filepath = join(UPLOAD_DIR, filename)

    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    return NextResponse.json({ url: `/file/${filename}`, filename })
  } catch (e) {
    console.error("[upload] 오류:", e)
    return NextResponse.json({ error: "파일 저장에 실패했습니다." }, { status: 500 })
  }
}
