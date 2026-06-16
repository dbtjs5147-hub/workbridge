import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, setSessionCookie } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

const schema = z.object({ role: z.enum(["CLIENT", "FREELANCER"]) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail("로그인이 필요합니다.", 401);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("역할을 선택해 주세요.");

  if (user.role) {
    return fail("이미 역할이 설정되어 있습니다.", 409);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: parsed.data.role },
  });

  // 세션 토큰의 role 갱신
  await setSessionCookie({
    userId: updated.id,
    email: updated.email,
    role: updated.role,
  });

  return ok({ role: updated.role });
}
