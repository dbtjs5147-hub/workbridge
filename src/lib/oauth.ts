// 실제 소셜 로그인(OAuth 2.0) 공급자 로직 — Google / Kakao.
//  - 콘솔에서 발급한 클라이언트 ID/시크릿이 .env 에 있으면 실연동, 없으면 미설정으로 처리.
//  - 보안: state(CSRF) 검증은 라우트에서 쿠키로 수행. 여기서는 URL/토큰/프로필만 다룬다.

export type OAuthProvider = "google" | "kakao";

export type OAuthProfile = {
  email: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
};

type Cfg = {
  clientId?: string;
  clientSecret?: string;
  authBase: string;
  tokenUrl: string;
  scope?: string;
};

function config(provider: OAuthProvider): Cfg {
  if (provider === "google") {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authBase: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
    };
  }
  // kakao — scope는 앱에 설정된 동의항목을 따르도록 기본 미지정(닉네임은 기본 제공)
  return {
    clientId: process.env.KAKAO_CLIENT_ID,
    clientSecret: process.env.KAKAO_CLIENT_SECRET, // 선택(보안 강화용)
    authBase: "https://kauth.kakao.com/oauth/authorize",
    tokenUrl: "https://kauth.kakao.com/oauth/token",
    scope: process.env.KAKAO_SCOPE, // 예: "account_email profile_nickname" (동의항목 활성화 시)
  };
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  return !!config(provider).clientId;
}

export function redirectUri(provider: OAuthProvider, origin: string): string {
  return `${origin}/api/auth/oauth/${provider}/callback`;
}

export function buildAuthUrl(
  provider: OAuthProvider,
  origin: string,
  state: string
): string {
  const c = config(provider);
  const params = new URLSearchParams({
    client_id: c.clientId ?? "",
    redirect_uri: redirectUri(provider, origin),
    response_type: "code",
    state,
  });
  if (c.scope) params.set("scope", c.scope);
  return `${c.authBase}?${params.toString()}`;
}

// code → access token → 사용자 프로필
export async function fetchOAuthProfile(
  provider: OAuthProvider,
  code: string,
  origin: string
): Promise<OAuthProfile> {
  const c = config(provider);

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: c.clientId ?? "",
    redirect_uri: redirectUri(provider, origin),
    code,
  });
  if (c.clientSecret) tokenBody.set("client_secret", c.clientSecret);

  const tokenRes = await fetch(c.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });
  if (!tokenRes.ok) {
    throw new Error(`${provider} 토큰 교환 실패(${tokenRes.status})`);
  }
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) throw new Error(`${provider} access_token 없음`);

  if (provider === "google") {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    if (!res.ok) throw new Error("Google 프로필 조회 실패");
    const p = (await res.json()) as {
      email?: string;
      name?: string;
      picture?: string;
      verified_email?: boolean;
    };
    if (!p.email) throw new Error("Google 이메일을 가져오지 못했습니다");
    return {
      email: p.email,
      name: p.name || p.email.split("@")[0],
      image: p.picture ?? null,
      emailVerified: p.verified_email ?? true,
    };
  }

  // kakao
  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!res.ok) throw new Error("Kakao 프로필 조회 실패");
  const p = (await res.json()) as {
    id?: number;
    kakao_account?: {
      email?: string;
      profile?: { nickname?: string; profile_image_url?: string };
    };
  };
  const acc = p.kakao_account ?? {};
  const email = acc.email ?? `kakao_${p.id}@kakao.user`; // 이메일 동의 없으면 대체값
  return {
    email,
    name: acc.profile?.nickname || `카카오사용자${p.id ?? ""}`,
    image: acc.profile?.profile_image_url ?? null,
    emailVerified: !!acc.email,
  };
}
