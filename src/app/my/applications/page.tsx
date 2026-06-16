import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui";
import { formatKRW, formatDate } from "@/lib/format";

export default async function MyApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "FREELANCER") redirect("/");

  const applications = await prisma.application.findMany({
    where: { freelancerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { project: { include: { contract: true } } },
  });

  return (
    <div className="container-page max-w-4xl">
      <PageHeader
        title="내 지원 현황"
        description="지원한 프로젝트의 상태를 추적하세요."
      />
      {applications.length === 0 ? (
        <EmptyState
          title="아직 지원한 프로젝트가 없습니다"
          action={
            <Link href="/projects" className="btn-primary">
              프로젝트 탐색
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {applications.map((a) => (
            <div
              key={a.id}
              className="card flex items-center justify-between gap-4 p-5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.status} />
                  <span className="text-xs text-gray-400">
                    {formatDate(a.createdAt)} 지원
                  </span>
                </div>
                <Link
                  href={`/projects/${a.projectId}`}
                  className="mt-1.5 block font-bold text-gray-900 hover:text-brand-600"
                >
                  {a.project.title}
                </Link>
                <p className="text-sm text-gray-500">
                  제안 {formatKRW(a.proposedAmount)} · {a.proposedDuration}
                </p>
              </div>
              {a.status === "ACCEPTED" && a.project.contract && (
                <Link
                  href={`/contracts/${a.project.contract.id}`}
                  className="btn-primary"
                >
                  계약 진행 →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
