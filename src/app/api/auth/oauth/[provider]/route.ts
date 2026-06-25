import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { isProviderConfigured, buildAuthUrl, type OAuthProvider } from "@/lib/oauth";

// 소셜 로그인 시작.
//  - 키가 설정돼 있으면 실제 OAuth 인증 URL로 리다이렉트(state 쿠키로 CSRF 방지).
//  - 키가 없으면: 개발 환경은 데모 계정 로그인, 프로덕션은 비활성.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  if (provider !== "google" && provider !== "kakao") {
    return NextResponse.redirect(`${base}/login?error=unsupported_provider`);
  }
  const p = provider as OAuthProvider;

  // 실연동 경로
  if (isProviderConfigured(p)) {
    const state = crypto.randomBytes(16).toString("hex");
    const res = NextResponse.redirect(buildAuthUrl(p, base, state));
    res.cookies.set(`wb_oauth_state_${p}`, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    return res;
  }

  // 미설정 — 프로덕션에서는 비활성(인증 우회 방지)
  if (process.env.NODE_ENV === "production") {
    return NextResponse.redirect(`${base}/login?error=oauth_unavailable`);
  }

  // 개발 전용 데모 로그인
  const email = `${provider}-demo@workbridge.dev`;
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: provider === "google" ? "구글 데모" : "카카오 데모",
        email,
        authProvider: provider,
        role: null,
      },
    });
  }
  await setSessionCookie({ userId: user.id, email: user.email, role: user.role });
  return NextResponse.redirect(`${base}${user.role ? "/" : "/role-select"}`);
}
