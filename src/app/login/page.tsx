"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  // ?verify= / ?error= 안내 — window 기반으로 읽어 Suspense 제약 회피
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get("verify");
    if (v === "success") setNotice("이메일 인증이 완료되었습니다. 로그인해 주세요.");
    else if (v === "invalid")
      setNotice("인증 링크가 만료되었거나 유효하지 않습니다.");

    const err = sp.get("error");
    if (err) {
      const map: Record<string, string> = {
        oauth_unavailable: "소셜 로그인이 아직 설정되지 않았습니다.",
        oauth_canceled: "소셜 로그인이 취소되었습니다.",
        oauth_state: "보안 확인에 실패했습니다. 다시 시도해 주세요.",
        oauth_failed: "소셜 로그인에 실패했습니다. 다시 시도해 주세요.",
        account_disabled: "비활성화된 계정입니다.",
        unsupported_provider: "지원하지 않는 로그인 방식입니다.",
      };
      setError(map[err] ?? "로그인 중 문제가 발생했습니다.");
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      setError(data.error);
      return;
    }
    const hasTrial =
      typeof window !== "undefined" && !!sessionStorage.getItem("wb_trial");
    if (!data.data.role) {
      router.push("/role-select");
    } else if (data.data.role === "CLIENT" && hasTrial) {
      router.push("/projects/new");
    } else {
      router.push("/");
    }
    router.refresh();
  }

  function fill(email: string) {
    setForm({ email, password: "test1234" });
  }

  return (
    <div className="container-page max-w-md">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
        <p className="mt-1 text-sm text-gray-500">
          WorkBridge 계정으로 로그인하세요.
        </p>

        {notice && (
          <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
            {notice}
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">이메일</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="label">비밀번호</label>
              <Link
                href="/forgot-password"
                className="text-xs text-brand-600 hover:underline"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? "처리 중..." : "로그인"}
          </button>
        </form>

        <SocialLoginButtons label="로그인" />

        {process.env.NODE_ENV !== "production" && (
          <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
            <p className="mb-2 font-semibold text-gray-600">데모 계정 (클릭하면 자동 입력)</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => fill("client@test.com")} className="rounded-md bg-white px-2 py-1 ring-1 ring-gray-200">
                의뢰인 client@test.com
              </button>
              <button onClick={() => fill("dev@test.com")} className="rounded-md bg-white px-2 py-1 ring-1 ring-gray-200">
                프리랜서 dev@test.com
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="font-semibold text-brand-600">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
