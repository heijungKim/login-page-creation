import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join, extname, basename } from "path"
import { existsSync } from "fs"

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/app/uploads"

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".gif": "image/gif", ".webp": "image/webp", ".pdf": "application/pdf",
  ".bmp": "image/bmp", ".tiff": "image/tiff",
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params
  const safe = basename(filename)
  if (!safe || safe.includes("..")) {
    return NextResponse.json({ error: "잘못된 파일명" }, { status: 400 })
  }

  const filepath = join(UPLOAD_DIR, safe)
  if (!existsSync(filepath)) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 })
  }

  const ext = extname(safe).toLowerCase()
  const contentType = MIME[ext] ?? "application/octet-stream"
  const data = await readFile(filepath)
  return new NextResponse(data, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${safe}"`,
      "Cache-Control": "private, max-age=31536000",
    },
  })
}
