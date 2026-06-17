import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashPassword } from "@/lib/auth";
import { consumeAuthToken } from "@/lib/email";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(128),
});

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, "reset-password", 10, 30 * 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
  }

  const userId = await consumeAuthToken(parsed.data.token, "PASSWORD_RESET");
  if (!userId) {
    return fail("링크가 만료되었거나 유효하지 않습니다. 다시 요청해 주세요.", 400);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });
  // 남은 미사용 재설정 토큰 무효화
  await prisma.authToken.updateMany({
    where: { userId, type: "PASSWORD_RESET", usedAt: null },
    data: { usedAt: new Date() },
  });

  return ok({ success: true });
}
