"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROLES, ROLE_LABEL } from "@/lib/constants";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "" as "" | "CLIENT" | "FREELANCER",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role || undefined,
      }),
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
      router.push("/projects/new"); // 체험에서 만든 PRD 이어가기
    } else {
      router.push("/");
    }
    router.refresh();
  }

  return (
    <div className="container-page max-w-md">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
        <p className="mt-1 text-sm text-gray-500">
          이메일로 가입하고 WorkBridge를 시작하세요.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">이름</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="홍길동"
              required
            />
          </div>
          <div>
            <label className="label">이메일</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="label">비밀번호 (6자 이상)</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="label">역할 선택 (나중에 선택 가능)</label>
            <div className="grid grid-cols-2 gap-3">
              {[ROLES.CLIENT, ROLES.FREELANCER].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, role: r })}
                  className={`rounded-xl border p-3 text-sm font-semibold transition ${
                    form.role === r
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {ROLE_LABEL[r]}
                  <span className="mt-0.5 block text-xs font-normal text-gray-400">
                    {r === "CLIENT" ? "프로젝트를 맡기고 싶어요" : "프로젝트를 받고 싶어요"}
                  </span>
                </button>
              ))}
            </div>
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
            {loading ? "처리 중..." : "회원가입"}
          </button>
        </form>

        <div className="mt-4 space-y-2">
          <a href="/api/auth/oauth/google" className="btn-secondary w-full">
            Google로 시작 (데모)
          </a>
          <a href="/api/auth/oauth/kakao" className="btn-secondary w-full">
            Kakao로 시작 (데모)
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-semibold text-brand-600">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
