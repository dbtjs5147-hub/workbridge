import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import {
  isProviderConfigured,
  fetchOAuthProfile,
  type OAuthProvider,
} from "@/lib/oauth";

// 소셜 로그인 콜백 — 공급자가 code/state 를 들고 돌아온다.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const fail = (e: string) => NextResponse.redirect(`${base}/login?error=${e}`);

  if (provider !== "google" && provider !== "kakao") return fail("unsupported_provider");
  const p = provider as OAuthProvider;
  if (!isProviderConfigured(p)) return fail("oauth_unavailable");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get(`wb_oauth_state_${p}`)?.value;

  if (url.searchParams.get("error") || !code) return fail("oauth_canceled");
  // CSRF: state 일치 확인
  if (!state || !cookieState || state !== cookieState) return fail("oauth_state");

  let profile;
  try {
    profile = await fetchOAuthProfile(p, code, base);
  } catch (e) {
    console.error("[OAuth 콜백 실패]", e);
    return fail("oauth_failed");
  }

  // 이메일로 기존 계정 매칭, 없으면 생성(소셜 이메일은 공급자 인증 완료로 간주)
  let user = await prisma.user.findUnique({ where: { email: profile.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        authProvider: p,
        profileImageUrl: profile.image,
        emailVerifiedAt: profile.emailVerified ? new Date() : null,
        role: null,
      },
    });
  } else if (user.deletedAt) {
    return fail("account_disabled");
  }

  await setSessionCookie({ userId: user.id, email: user.email, role: user.role });

  const res = NextResponse.redirect(`${base}${user.role ? "/" : "/role-select"}`);
  res.cookies.delete(`wb_oauth_state_${p}`);
  return res;
}
