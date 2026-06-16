import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: object) {
  return NextResponse.json(
    { ok: false, error: message, ...extra },
    { status }
  );
}

// 로그인 필수 가드 — 핸들러에서 사용
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, error: fail("로그인이 필요합니다.", 401) };
  }
  return { user, error: null };
}

// 특정 역할 필수 가드
export async function requireRole(role: "CLIENT" | "FREELANCER") {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, error: fail("로그인이 필요합니다.", 401) };
  }
  if (user.role !== role) {
    const label = role === "CLIENT" ? "의뢰인" : "프리랜서";
    return {
      user: null,
      error: fail(`${label} 권한이 필요합니다.`, 403),
    };
  }
  return { user, error: null };
}
