"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
            <label className="label">비밀번호</label>
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
