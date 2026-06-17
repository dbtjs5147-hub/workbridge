import crypto from "crypto";
import { prisma } from "./prisma";

// 이메일 발송 + 인증/재설정 토큰 유틸.
//  - RESEND_API_KEY 가 있으면 Resend로 실제 발송, 없으면 콘솔에 링크를 출력(개발 폴백).
//    (AI/PG와 동일한 "키 없으면 폴백" 패턴)

const FROM = process.env.EMAIL_FROM ?? "WorkBridge <onboarding@resend.dev>";

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

type TokenType = "EMAIL_VERIFY" | "PASSWORD_RESET";

export async function createAuthToken(
  userId: string,
  type: TokenType,
  ttlMs: number
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.authToken.create({
    data: { userId, type, token, expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

// 토큰 검증 후 1회용으로 소모(usedAt 기록). 유효하면 userId 반환, 아니면 null.
export async function consumeAuthToken(
  token: string,
  type: TokenType
): Promise<string | null> {
  const row = await prisma.authToken.findUnique({ where: { token } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) {
    return null;
  }
  await prisma.authToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return row.userId;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; fallback?: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // 폴백: 실제 발송 대신 콘솔에 출력(개발/키 미설정 시)
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    console.log(`\n[메일 폴백] to=${to}\n  제목: ${subject}\n  내용: ${text}\n`);
    return { ok: true, fallback: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      console.error("[Resend 발송 실패]", res.status, await res.text().catch(() => ""));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[메일 발송 오류]", e);
    return { ok: false };
  }
}

function layout(body: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937">
    <h2 style="color:#2563eb">WorkBridge</h2>${body}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p style="font-size:12px;color:#9ca3af">본 메일은 발신 전용입니다.</p>
  </div>`;
}

export async function sendVerificationEmail(
  userId: string,
  email: string,
  name: string
) {
  const token = await createAuthToken(userId, "EMAIL_VERIFY", 24 * 60 * 60 * 1000);
  const link = `${appUrl()}/api/auth/verify-email?token=${token}`;
  await sendEmail(
    email,
    "[WorkBridge] 이메일 인증을 완료해 주세요",
    layout(
      `<p>${name}님, 안녕하세요.</p><p>아래 버튼을 눌러 이메일 인증을 완료해 주세요. (24시간 유효)</p>
       <p><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">이메일 인증하기</a></p>
       <p style="font-size:12px;color:#9ca3af">${link}</p>`
    )
  );
}

export async function sendPasswordResetEmail(
  userId: string,
  email: string,
  name: string
) {
  const token = await createAuthToken(userId, "PASSWORD_RESET", 60 * 60 * 1000);
  const link = `${appUrl()}/reset-password?token=${token}`;
  await sendEmail(
    email,
    "[WorkBridge] 비밀번호 재설정 안내",
    layout(
      `<p>${name}님, 비밀번호 재설정을 요청하셨습니다.</p><p>아래 버튼에서 새 비밀번호를 설정해 주세요. (1시간 유효)</p>
       <p><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">비밀번호 재설정</a></p>
       <p style="font-size:12px;color:#9ca3af">${link}</p>
       <p>본인이 요청하지 않았다면 이 메일을 무시하세요.</p>`
    )
  );
}
