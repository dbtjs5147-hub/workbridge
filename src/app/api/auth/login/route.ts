import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email("올바른 이메일을 입력해 주세요."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

export async function POST(req: NextRequest) {
  // 무차별 대입 방지: IP당 5분에 10회
  const limited = checkRateLimit(req, "login", 10, 5 * 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || user.deletedAt) {
    return fail("이메일 또는 비밀번호가 올바르지 않습니다.", 401);
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return fail("이메일 또는 비밀번호가 올바르지 않습니다.", 401);
  }

  await setSessionCookie({ userId: user.id, email: user.email, role: user.role });
  return ok({ id: user.id, role: user.role });
}
