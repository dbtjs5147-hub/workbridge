import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

// 비밀번호 재설정 메일 요청. 이메일 존재 여부를 노출하지 않기 위해 항상 동일하게 응답.
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, "request-reset", 5, 30 * 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("올바른 이메일을 입력해 주세요.");

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // 이메일 계정(passwordHash 존재)에만 발송. 결과는 항상 동일(계정 존재 여부 비노출).
  if (user && user.passwordHash && !user.deletedAt) {
    try {
      await sendPasswordResetEmail(user.id, user.email, user.name);
    } catch (e) {
      console.error("[비번재설정 메일 실패]", e);
    }
  }
  return ok({ sent: true });
}
