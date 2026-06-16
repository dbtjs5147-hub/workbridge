import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseArray } from "@/lib/json";
import { checkFreelancerProfile } from "@/lib/profile";
import { formatKRW, formatDate, daysLeft } from "@/lib/format";
import { StatusBadge, Tag, InfoRow } from "@/components/ui";
import {
  PROJECT_STATUS,
  TRADING_STATUSES,
  FEATURE_PRIORITY,
} from "@/lib/constants";
import { ProjectCard } from "@/components/ProjectCard";
import { PrdSection } from "@/components/PrdSection";
import { FreelancerActions } from "./FreelancerActions";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: { include: { clientProfile: true } },
      aiAnalysis: true,
      features: true,
      milestones: { orderBy: { order: "asc" } },
      contract: true,
      _count: { select: { applications: true } },
    },
  });
  if (!project || project.isDeleted) notFound();

  const isOwner = user?.id === project.clientId;
  const isFreelancer = user?.role === "FREELANCER";

  // 외부 노출 상태 규칙
  const displayStatus =
    !isOwner &&
    TRADING_STATUSES.includes(
      project.status as (typeof TRADING_STATUSES)[number]
    )
      ? PROJECT_STATUS.CLOSED
      : project.status;

  const requiredSkills = parseArray(project.requiredSkills);
  const mvpFeatures = project.features.filter(
    (f) => f.priority === FEATURE_PRIORITY.MVP_REQUIRED
  );
  const optionalFeatures = project.features.filter(
    (f) => f.priority === FEATURE_PRIORITY.OPTIONAL
  );
  const excludedFeatures = project.features.filter(
    (f) => f.priority === FEATURE_PRIORITY.EXCLUDED
  );

  // 프리랜서 상태 (북마크/지원)
  let myApplication = null;
  let isBookmarked = false;
  let mySkills: string[] = [];
  if (isFreelancer && user) {
    myApplication = await prisma.application.findUnique({
      where: { projectId_freelancerId: { projectId: id, freelancerId: user.id } },
    });
    isBookmarked = !!(await prisma.bookmark.findUnique({
      where: { projectId_freelancerId: { projectId: id, freelancerId: user.id } },
    }));
    mySkills = parseArray(user.freelancerProfile?.skills);
  }
  const matchedSkills = requiredSkills.filter((s) => mySkills.includes(s));
  const profileCheck = checkFreelancerProfile(user?.freelancerProfile);

  // 유사 프로젝트 추천 (동일 카테고리 우선)
  const recommendations = await prisma.project.findMany({
    where: {
      id: { not: id },
      isDeleted: false,
      status: PROJECT_STATUS.OPEN,
      category: project.category,
    },
    take: 3,
    include: { client: true },
  });

  const dleft = daysLeft(project.recruitEndDate);

  return (
    <div className="container-page grid gap-6 lg:grid-cols-3">
      {/* 본문 */}
      <div className="space-y-6 lg:col-span-2">
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <Tag>{project.category}</Tag>
            <StatusBadge status={displayStatus} />
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            {project.title}
          </h1>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
            {project.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {requiredSkills.map((s) => (
              <Tag key={s}>{s}</Tag>
            ))}
          </div>
        </div>

        {/* AI 분석 */}
        {project.aiAnalysis && (
          <div className="card space-y-5 p-6">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
                AI 분석
              </span>
              <p className="text-sm text-gray-500">
                {project.aiAnalysis.projectSummary}
              </p>
            </div>

            <FeatureGroup title="MVP 필수 기능" features={mvpFeatures} />
            {optionalFeatures.length > 0 && (
              <FeatureGroup title="선택 기능" features={optionalFeatures} />
            )}
            {excludedFeatures.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-bold text-gray-800">
                  제외 범위
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {excludedFeatures.map((f) => (
                    <span
                      key={f.id}
                      className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500 line-through"
                    >
                      {f.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {parseArray(project.aiAnalysis.risks).length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-bold text-gray-800">리스크</p>
                <ul className="space-y-1 text-xs text-gray-600">
                  {parseArray(project.aiAnalysis.risks).map((r, i) => (
                    <li key={i}>⚠️ {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 마일스톤 */}
        {project.milestones.length > 0 && (
          <div className="card space-y-3 p-6">
            <p className="text-sm font-bold text-gray-800">
              마일스톤 · 납품물 · 검수 기준
            </p>
            {project.milestones.map((m) => (
              <div key={m.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800">
                    {m.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={m.status} />
                    {m.amount > 0 && (
                      <span className="text-sm font-bold text-brand-600">
                        {formatKRW(m.amount)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <p>
                    <b>납품물</b> · {parseArray(m.deliverables).join(", ")}
                  </p>
                  <p>
                    <b>검수 기준</b> ·{" "}
                    {parseArray(m.acceptanceCriteria).join(" / ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PRD 문서 (의뢰인 본인만) */}
        {isOwner && project.prdDocument && (
          <PrdSection
            content={project.prdDocument}
            note="AI가 생성한 PRD 문서입니다. 계약이 체결되면 담당 개발자에게 전달됩니다."
          />
        )}

        {/* 유사 프로젝트 */}
        {recommendations.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-bold text-gray-800">
              비슷한 프로젝트
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {recommendations.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 사이드바 */}
      <div className="space-y-4">
        <div className="card space-y-1 p-5">
          {project.budget > 0 ? (
            <>
              <p className="text-xs text-gray-400">의뢰인 희망 예산</p>
              <p className="text-2xl font-bold text-brand-600">
                {formatKRW(project.budget)}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400">예상 비용</p>
              <p className="text-xl font-bold text-brand-600">
                개발자 견적 받는 중
              </p>
            </>
          )}
          <p className="mt-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-gray-500">
            💡 비용은 검증된 개발자들이 직접 견적(입찰)을 제시합니다. 입찰가는
            의뢰인만 확인하며, WorkBridge는 금액을 정하지 않습니다.
          </p>
          <div className="mt-3 divide-y divide-gray-100">
            <InfoRow label="카테고리">{project.category}</InfoRow>
            <InfoRow label="입찰 마감">
              {formatDate(project.recruitEndDate)}
              {displayStatus === PROJECT_STATUS.OPEN &&
                dleft != null &&
                dleft >= 0 && (
                  <span className="ml-1 text-amber-600">
                    ({dleft === 0 ? "오늘 마감" : `${dleft}일 남음`})
                  </span>
                )}
            </InfoRow>
            <InfoRow label="예상 기간">
              {project.aiAnalysis
                ? `약 ${project.aiAnalysis.estimatedDurationWeeks}주`
                : "-"}
            </InfoRow>
            <InfoRow label="받은 견적">
              {project._count.applications}건
            </InfoRow>
          </div>
        </div>

        {/* 의뢰인 정보 */}
        <div className="card p-5">
          <p className="text-xs text-gray-400">의뢰인</p>
          <Link
            href={`/users/${project.clientId}`}
            className="mt-1 block font-semibold text-gray-800 hover:text-brand-600"
          >
            {project.client.name}
          </Link>
          {project.client.clientProfile?.companyName && (
            <p className="text-sm text-gray-500">
              {project.client.clientProfile.companyName}
            </p>
          )}
        </div>

        {/* 역할별 액션 */}
        {isOwner ? (
          <div className="card space-y-2 p-5">
            <Link
              href={`/projects/${id}/applicants`}
              className="btn-primary w-full"
            >
              지원자 관리 ({project._count.applications})
            </Link>
            {(project.status === PROJECT_STATUS.IN_PROGRESS ||
              project.status === PROJECT_STATUS.UNDER_REVIEW ||
              project.status === PROJECT_STATUS.PAYMENT_PENDING ||
              project.status === PROJECT_STATUS.SIGNATURE_PENDING ||
              project.status === PROJECT_STATUS.COMPLETED) &&
              project.contract && (
                <Link
                  href={`/contracts/${project.contract.id}`}
                  className="btn-secondary w-full"
                >
                  계약 · 진행 상황
                </Link>
              )}
          </div>
        ) : isFreelancer ? (
          <FreelancerActions
            projectId={id}
            canApply={project.status === PROJECT_STATUS.OPEN}
            initialBookmarked={isBookmarked}
            existingApplicationStatus={myApplication?.status ?? null}
            matchedSkills={matchedSkills}
            totalRequired={requiredSkills.length}
            budget={project.budget}
            applicantCount={project._count.applications}
            profileComplete={profileCheck.complete}
            profileMissing={profileCheck.missing}
          />
        ) : (
          <div className="card p-5 text-center text-sm text-gray-500">
            {user ? (
              "프리랜서 계정으로 지원할 수 있습니다."
            ) : (
              <>
                <Link href="/login" className="font-semibold text-brand-600">
                  로그인
                </Link>{" "}
                후 지원할 수 있습니다.
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureGroup({
  title,
  features,
}: {
  title: string;
  features: { id: string; name: string; description: string; estimatedCost: number; priority: string }[];
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-gray-800">{title}</p>
      <div className="space-y-2">
        {features.map((f) => (
          <div
            key={f.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-gray-800">{f.name}</p>
              <p className="text-xs text-gray-500">{f.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
