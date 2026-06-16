"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewForm({
  projectId,
  tags,
}: {
  projectId: string;
  tags: string[];
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggle(t: string) {
    setSelected((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/projects/${projectId}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rating, content, tags: selected }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!data.ok) {
      setError(data.error);
      return;
    }
    router.push(`/projects/${projectId}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <div>
        <label className="label">별점</label>
        <div className="flex gap-1 text-3xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className={
                n <= (hover || rating) ? "text-amber-400" : "text-gray-300"
              }
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">평가 태그 (복수 선택)</label>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                selected.includes(t)
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">리뷰 내용</label>
        <textarea
          className="input min-h-[100px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="협업 경험을 자유롭게 작성해 주세요."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
        {submitting ? "작성 중..." : "리뷰 등록"}
      </button>
    </form>
  );
}
