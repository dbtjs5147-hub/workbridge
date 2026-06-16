import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireUser, ok, fail } from "@/lib/api";

// 데모용 로컬 파일 업로드.
// ⚠️ 운영(Vercel 등 서버리스) 배포 시에는 파일시스템이 휘발성이므로
//    S3 / Supabase Storage / Cloudflare R2 등 클라우드 스토리지로 교체해야 한다.
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}-${sanitize(file.name)}`;
  await writeFile(path.join(dir, filename), buffer);

  const url = `/uploads/${filename}`;
  const kind = file.type === "application/pdf" ? "pdf" : "image";
  return ok({ url, name: file.name, kind });
}
