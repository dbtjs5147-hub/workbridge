"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") ?? "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pw !== pw2) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: pw }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      setError(data.error);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  if (!token) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-gray-600">유효하지 않은 접근입니다.</p>
        <Link href="/forgot-password" className="btn-secondary mt-4 inline-block">
          재설정 다시 요청
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <h1 className="text-2xl font-bold text-gray-900">새 비밀번호 설정</h1>
      {done ? (
        <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✓ 비밀번호가 변경되었습니다. 로그인 화면으로 이동합니다…
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">새 비밀번호 (8자 이상)</label>
            <input
              className="input"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">새 비밀번호 확인</label>
            <input
              className="input"
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="container-page max-w-md">
      <Suspense fallback={<div className="card p-8" />}>
        <ResetInner />
      </Suspense>
    </div>
  );
}
