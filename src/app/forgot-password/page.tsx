"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/request-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="container-page max-w-md">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-gray-900">비밀번호 재설정</h1>
        {sent ? (
          <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-gray-700">
            입력하신 이메일로 가입된 계정이 있다면, 비밀번호 재설정 링크를
            보냈습니다. 메일함을 확인해 주세요. (링크는 1시간 동안 유효합니다)
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-500">
              가입한 이메일을 입력하시면 재설정 링크를 보내드립니다.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="label">이메일</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? "전송 중..." : "재설정 링크 보내기"}
              </button>
            </form>
          </>
        )}
        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/login" className="font-semibold text-brand-600">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
