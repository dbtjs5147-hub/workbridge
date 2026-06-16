import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProjectCard } from "@/components/ProjectCard";
import { PageHeader, EmptyState } from "@/components/ui";
import { CATEGORIES, RECRUIT_STATUSES } from "@/lib/constants";
import { ProjectFilters } from "./ProjectFilters";

type SearchParams = Promise<{
  q?: string;
  category?: string;
  sort?: string;
  minBudget?: string;
  status?: string;
}>;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const category = sp.category;
  const sort = sp.sort ?? "latest";
  const minBudget = sp.minBudget ? Number(sp.minBudget) : undefined;

  // 외부 목록: 모집 단계 상태만 노출 (거래 단계 진입은 숨김)
  const where: Record<string, unknown> = {
    isDeleted: false,
    status: { in: RECRUIT_STATUSES },
  };
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (category) where.category = category;
  if (minBudget) where.budget = { gte: minBudget };

  const orderBy =
    sort === "budget"
      ? { budget: "desc" as const }
      : sort === "deadline"
        ? { recruitEndDate: "asc" as const }
        : { createdAt: "desc" as const };

  const projects = await prisma.project.findMany({
    where,
    orderBy,
    take: 30,
    include: { client: true, _count: { select: { applications: true } } },
  });

  return (
    <div className="container-page space-y-6">
      <PageHeader
        title="프로젝트 탐색"
        description="요구사항이 명확하게 정리된 개발 프로젝트를 찾아보세요."
      />

      <ProjectFilters
        categories={[...CATEGORIES]}
        current={{ q, category, sort, minBudget: sp.minBudget }}
      />

      {projects.length === 0 ? (
        <EmptyState
          title="조건에 맞는 프로젝트가 없습니다"
          description="검색어나 필터를 바꿔보세요."
          action={
            <Link href="/projects" className="btn-secondary">
              필터 초기화
            </Link>
          }
        />
      ) : (
        <>
          <p className="text-sm text-gray-500">{projects.length}개의 프로젝트</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                applicantCount={p._count.applications}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
