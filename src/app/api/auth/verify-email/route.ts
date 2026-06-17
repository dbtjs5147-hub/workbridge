import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeAuthToken, appUrl } from "@/lib/email";

// 이메일 인증 링크(GET) — 토큰 검증 후 인증 완료 처리하고 로그인 화면으로 이동.
export async function GET(req: NextRequest) {
  const base = appUrl();
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(`${base}/login?verify=invalid`);

  const userId = await consumeAuthToken(token, "EMAIL_VERIFY");
  if (!userId) return NextResponse.redirect(`${base}/login?verify=invalid`);

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });
  return NextResponse.redirect(`${base}/login?verify=success`);
}
