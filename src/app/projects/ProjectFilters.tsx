"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ProjectFilters({
  categories,
  current,
}: {
  categories: string[];
  current: {
    q?: string;
    category?: string;
    sort?: string;
    minBudget?: string;
  };
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/projects?${next.toString()}`);
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="키워드 검색 (제목·설명)"
          defaultValue={current.q ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              update("q", (e.target as HTMLInputElement).value);
          }}
        />
        <select
          className="input max-w-[180px]"
          value={current.category ?? ""}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="">전체 카테고리</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="input max-w-[160px]"
          value={current.minBudget ?? ""}
          onChange={(e) => update("minBudget", e.target.value)}
        >
          <option value="">예산 전체</option>
          <option value="3000000">300만원 이상</option>
          <option value="5000000">500만원 이상</option>
          <option value="8000000">800만원 이상</option>
        </select>
        <select
          className="input max-w-[150px]"
          value={current.sort ?? "latest"}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="latest">최신순</option>
          <option value="deadline">마감임박순</option>
          <option value="budget">예산 높은순</option>
        </select>
      </div>
    </div>
  );
}
