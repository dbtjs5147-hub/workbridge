import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

const schema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요."),
  email: z.string().email("올바른 이메일을 입력해 주세요."),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
  role: z.enum(["CLIENT", "FREELANCER"]).optional(),
});

export async function POST(req: NextRequest) {
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
