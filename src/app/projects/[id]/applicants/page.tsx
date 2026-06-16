import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseArray } from "@/lib/json";
import { formatKRW, deltaPct } from "@/lib/format";
import { PageHeader, EmptyState, StatusBadge, StarRating } from "@/components/ui";
import { ApplicantActions } from "./ApplicantActions";
import { StartChatButton } from "@/components/StartChatButton";
import { Attachments } from "@/components/Attachments";
import { APPLICATION_STATUS } from "@/lib/constants";

export default async function ApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      applications: {
        orderBy: { createdAt: "asc" },
        include: {
          freelancer: {
            include: {
              freelancerProfile: true,
              reviewsReceived: true,
            },
          },
        },
      },
    },
  });
  if (!project || project.isDeleted) notFound();
  if (project.clientId !== user.id) {
    return (
      <div className="container-page max-w-xl">
        <div className="card p-8 text-center text-gray-500">
          본인 프로젝트의 지원자만 볼 수 있습니다.
        </div>
      </div>
    );
  }

  const requiredSkills = parseArray(project.requiredSkills);
  const hasAccepted = project.applications.some(
    (a) => a.status === APPLICATION_STATUS.ACCEPTED
  );

  // 입찰(제안가) 요약
  const bids = project.applications
    .map((a) => a.proposedAmount)
    .filter((n) => n > 0);
  const bidStats =
    bids.length > 0
      ? {
          min: Math.min(...bids),
          max: Math.max(...bids),
          avg: Math.round(bids.reduce((s, n) => s + n, 0) / bids.length),
        }
      : null;

  return (
    <div className="container-page max-w-4xl">
      <PageHeader
        title="지원자 관리"
        description={project.title}
        action={
          <Link href={`/projects/${id}`} className="btn-secondary">
            프로젝트로 ←
          </Link>
        }
      />

      {bidStats && (
        <div className="card mb-4 p-5">
          <p className="mb-3 text-sm font-bold text-gray-800">
            입찰 요약 (지원 {project.applications.length}명)
          </p>
          <div className={`grid grid-cols-2 gap-3 ${project.budget > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
            {project.budget > 0 && (
              <BidStat label="의뢰인 희망 예산" value={formatKRW(project.budget)} muted />
            )}
            <BidStat label="최저 입찰가" value={formatKRW(bidStats.min)} />
            <BidStat label="평균 입찰가" value={formatKRW(bidStats.avg)} />
            <BidStat label="최고 입찰가" value={formatKRW(bidStats.max)} />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
            🔒 입찰가는 의뢰인인 회원님에게만 보입니다. 프리랜서끼리는 서로의
            입찰가를 볼 수 없습니다. 가격뿐 아니라 경력·포트폴리오·리뷰를 함께
            보고 선택하세요.
          </p>
        </div>
      )}

      {project.applications.length === 0 ? (
        <EmptyState
          title="아직 지원자가 없습니다"
          description="모집 기간 동안 프리랜서의 지원을 기다려 보세요."
        />
      ) : (
        <div className="space-y-4">
          {project.applications.map((app) => {
            const fp = app.freelancer.freelancerProfile;
            const skills = parseArray(fp?.skills);
            const portfolioImages = parseArray(fp?.portfolioImages);
            const matched = requiredSkills.filter((s) => skills.includes(s));
            const reviews = app.freelancer.reviewsReceived;
            const avg =
              reviews.length > 0
                ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
                : 0;

            return (
              <div key={app.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/users/${app.freelancerId}`}
                        className="font-bold text-gray-900 hover:text-brand-600"
                      >
                        {app.freelancer.name}
                      </Link>
                      <StatusBadge status={app.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                      {reviews.length > 0 ? (
                        <StarRating rating={avg} count={reviews.length} />
                      ) : (
                        <span className="text-gray-400">리뷰 없음</span>
                      )}
                      {fp && <span>경력 {fp.experienceYears}년</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-brand-600">
                      {formatKRW(app.proposedAmount)}
                    </p>
                    {project.budget > 0 && app.proposedAmount > 0 && (
                      <p className="text-[11px] text-gray-400">
                        {deltaPct(app.proposedAmount, project.budget)}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      예상 {app.proposedDuration}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-sm text-gray-600">{app.coverLetter}</p>
                {app.relatedExperience && (
                  <p className="mt-1 text-sm text-gray-500">
                    <b>관련 경험</b> · {app.relatedExperience}
                  </p>
                )}
                {app.proposalText && (
                  <p className="mt-1 text-sm text-gray-500">
                    <b>제안</b> · {app.proposalText}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-400">
                    기술 일치 {matched.length}/{requiredSkills.length}:
                  </span>
                  {skills.slice(0, 8).map((s) => (
                    <span
                      key={s}
                      className={
                        matched.includes(s)
                          ? "rounded-md bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700"
                          : "rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                      }
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {fp?.portfolioUrl && (
                    <a href={fp.portfolioUrl} target="_blank" className="text-brand-600 hover:underline">
                      포트폴리오 ↗
                    </a>
                  )}
                  {fp?.githubUrl && (
                    <a href={fp.githubUrl} target="_blank" className="text-brand-600 hover:underline">
                      GitHub ↗
                    </a>
                  )}
                  {fp?.deployedProjectUrl && (
                    <a href={fp.deployedProjectUrl} target="_blank" className="text-brand-600 hover:underline">
                      배포 프로젝트 ↗
                    </a>
                  )}
                </div>

                {portfolioImages.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs font-semibold text-gray-500">
                      포트폴리오
                    </p>
                    <Attachments urls={portfolioImages} size={80} />
                  </div>
                )}

                <div className="mt-3">
                  <StartChatButton
                    projectId={id}
                    freelancerId={app.freelancerId}
                    label="이 지원자와 대화"
                    className="btn-secondary"
                  />
                </div>

                {app.status === APPLICATION_STATUS.PENDING && !hasAccepted && (
                  <ApplicantActions applicationId={app.id} />
                )}
                {app.status === APPLICATION_STATUS.ACCEPTED && (
                  <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    ✓ 수락됨 — 계약이 생성되었습니다.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BidStat({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={`rounded-xl px-4 py-3 ${muted ? "bg-gray-50" : "bg-brand-50"}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-0.5 text-base font-bold ${muted ? "text-gray-700" : "text-brand-700"}`}>
        {value}
      </p>
    </div>
  );
}
