import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요.").max(50),
  email: z.string().email("올바른 이메일을 입력해 주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(128),
  role: z.enum(["CLIENT", "FREELANCER"]).optional(),
});

export async function POST(req: NextRequest) {
  // 가입 스팸 방지: IP당 1시간에 5회
  const limited = checkRateLimit(req, "signup", 5, 60 * 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
  }
  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return fail("이미 가입된 이메일입니다.", 409);
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: role ?? null,
      authProvider: "email",
    },
  });

  await setSessionCookie({ userId: user.id, email: user.email, role: user.role });
  return ok({ id: user.id, role: user.role });
}
