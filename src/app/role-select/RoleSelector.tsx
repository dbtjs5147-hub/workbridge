"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RoleSelector() {
  const router = useRouter();
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function choose(role: "CLIENT" | "FREELANCER") {
    setLoading(role);
    setError("");
    const res = await fetch("/api/auth/select-role", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error);
      setLoading("");
      return;
    }
    router.push(role === "CLIENT" ? "/projects/new" : "/projects");
    router.refresh();
  }

  const options = [
    {
      role: "CLIENT" as const,
      emoji: "💡",
      title: "의뢰인",
      desc: "아이디어를 AI로 정리하고 개발자에게 맡기고 싶어요.",
      bullets: ["AI 프로젝트 분석", "프로젝트 등록", "지원자 비교·계약·결제"],
    },
    {
      role: "FREELANCER" as const,
      emoji: "💻",
      title: "프리랜서(개발자)",
      desc: "요구사항이 명확한 프로젝트를 받고 싶어요.",
      bullets: ["프로젝트 탐색·북마크", "지원·계약", "마일스톤 납품·정산"],
    },
  ];

  return (
    <div className="mt-8 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.role}
            onClick={() => choose(o.role)}
            disabled={!!loading}
            className="card p-6 text-left transition hover:border-brand-400 hover:shadow-md disabled:opacity-60"
          >
            <div className="text-3xl">{o.emoji}</div>
            <p className="mt-3 text-lg font-bold text-gray-900">{o.title}</p>
            <p className="mt-1 text-sm text-gray-500">{o.desc}</p>
            <ul className="mt-3 space-y-1">
              {o.bullets.map((b) => (
                <li key={b} className="text-sm text-gray-600">
                  · {b}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-semibold text-brand-600">
              {loading === o.role ? "설정 중..." : `${o.title}(으)로 시작 →`}
            </p>
          </button>
        ))}
      </div>
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
