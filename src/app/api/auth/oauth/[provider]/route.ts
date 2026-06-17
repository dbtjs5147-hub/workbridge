import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

// 데모 소셜 로그인:
// 실제 GOOGLE/KAKAO 키가 있으면 진짜 OAuth로 리다이렉트하도록 확장 가능.
// 키가 없으면(데모) 해당 provider의 데모 계정으로 즉시 로그인한다.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  if (provider !== "google" && provider !== "kakao") {
    return NextResponse.redirect(`${base}/login?error=unsupported_provider`);
  }

  // 보안: 실제 OAuth가 구현되지 않은 상태의 '데모 자동 로그인'은 인증 우회 구멍이므로
  // 프로덕션에서는 비활성화한다. (실제 OAuth 연동 시 여기서 provider 인증 URL로 redirect)
  if (process.env.NODE_ENV === "production") {
    return NextResponse.redirect(`${base}/login?error=oauth_disabled`);
  }

  // --- 데모 흐름 (개발 환경 전용) ---
  const email = `${provider}-demo@workbridge.dev`;
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: provider === "google" ? "구글 데모" : "카카오 데모",
        email,
        authProvider: provider,
        role: null, // 역할 미선택 → 역할 선택 페이지로 유도
      },
    });
  }

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // 역할 없으면 역할 선택, 있으면 홈
  const dest = user.role ? "/" : "/role-select";
  return NextResponse.redirect(`${base}${dest}`);
}
