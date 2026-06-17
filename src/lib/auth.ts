import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE_NAME = "wb_token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7일

// JWT 서명 키. 프로덕션에서 JWT_SECRET이 없으면 '실패'시킨다(하드코딩 폴백 금지).
// 개발에서만 임시 키를 허용한다. (요청 시점에 평가 — 빌드 중 import 크래시 방지)
function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET 환경변수가 설정되지 않았거나 너무 짧습니다(16자 이상). 프로덕션에서는 필수입니다."
    );
  }
  return new TextEncoder().encode("dev-only-insecure-secret-do-not-use-in-prod");
}

export type SessionPayload = {
  userId: string;
  email: string;
  role: string | null;
};

// --- 비밀번호 해싱 ---
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// --- JWT ---
export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: (payload.role as string) ?? null,
    };
  } catch {
    return null;
  }
}

// --- 쿠키 세션 ---
export async function setSessionCookie(payload: SessionPayload) {
  const token = await createToken(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// 현재 로그인 사용자(프로필 포함) 조회
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { clientProfile: true, freelancerProfile: true },
  });
  if (!user || user.deletedAt) return null;
  return user;
}
