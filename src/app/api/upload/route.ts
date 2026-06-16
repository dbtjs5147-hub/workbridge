import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { requireUser, ok, fail } from "@/lib/api";

// 파일 업로드.
//  - 운영(Vercel): BLOB_READ_WRITE_TOKEN 이 있으면 Vercel Blob(클라우드)에 저장 → 영구 보관.
//  - 로컬 개발: 토큰이 없으면 기존처럼 public/uploads 에 저장(휘발성, 데모용).
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function sanitize(name: string): string {
  const ext = path.extname(name).toLowerCase().slice(0, 10);
  const base = path
    .basename(name, path.extname(name))
    .replace(/[^a-zA-Z0-9가-힣._-]/g, "_")
    .slice(0, 40);
  return `${base || "file"}${ext}`;
}

export async function POST(req: NextRequest) {
  const { error } = await requireUser();
  if (error) return error;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("파일 업로드 형식이 올바르지 않습니다.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return fail("파일이 없습니다.");
  }
  if (!ALLOWED.has(file.type)) {
    return fail("이미지(jpg, png, webp, gif) 또는 PDF만 업로드할 수 있습니다.");
  }
  if (file.size > MAX_SIZE) {
    return fail("파일 크기는 10MB 이하여야 합니다.");
  }

  const filename = `${crypto.randomUUID()}-${sanitize(file.name)}`;
  const kind = file.type === "application/pdf" ? "pdf" : "image";

  // 운영: Vercel Blob(클라우드 저장소)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`uploads/${filename}`, file, {
        access: "public",
        contentType: file.type,
      });
      return ok({ url: blob.url, name: file.name, kind });
    } catch (e) {
      console.error("[Blob 업로드 실패]", e);
      return fail("파일 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.", 500);
    }
  }

  // 로컬 개발: public/uploads 폴더에 저장
  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  const url = `/uploads/${filename}`;
  return ok({ url, name: file.name, kind });
}
