import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui";
import { formatKRW, formatDate } from "@/lib/format";

export default async function MyProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "CLIENT") redirect("/");

  const projects = await prisma.project.findMany({
    where: { clientId: user.id, isDeleted: false },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { applications: true } },
      contract: true,
    },
  });

  return (
    <div className="container-page max-w-4xl">
      <PageHeader
        title="내 프로젝트"
        description="등록한 프로젝트와 거래 진행 상황을 확인하세요."
        action={
          <Link href="/projects/new" className="btn-primary">
            + 새 프로젝트
          </Link>
        }
      />
      {projects.length === 0 ? (
        <EmptyState
          title="아직 등록한 프로젝트가 없습니다"
          description="AI가 아이디어를 분석해 프로젝트로 만들어 드립니다."
          action={
            <Link href="/projects/new" className="btn-primary">
              아이디어 분석받기
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="card flex items-center justify-between gap-4 p-5 transition hover:shadow-md"
            >
              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} />
                  <span className="text-xs text-gray-400">
                    {formatDate(p.createdAt)} 등록
                  </span>
                </div>
                <Link
                  href={`/projects/${p.id}`}
                  className="mt-1.5 block font-bold text-gray-900 hover:text-brand-600"
                >
                  {p.title}
                </Link>
                <p className="text-sm text-gray-500">
                  {p.category} ·{" "}
                  {p.budget > 0 ? formatKRW(p.budget) : "견적 받는 중"}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-gray-700">
                  지원 {p._count.applications}명
                </p>
                <div className="mt-1 flex justify-end gap-3">
                  <Link
                    href={`/projects/${p.id}/applicants`}
                    className="text-brand-600 hover:underline"
                  >
                    지원자 관리 →
                  </Link>
                  {p.contract && (
                    <Link
                      href={`/contracts/${p.contract.id}`}
                      className="text-gray-500 hover:text-brand-600"
                    >
                      계약
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
