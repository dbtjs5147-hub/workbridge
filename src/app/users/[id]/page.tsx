import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseArray } from "@/lib/json";
import { ROLE_LABEL } from "@/lib/constants";
import { StarRating, Tag } from "@/components/ui";
import { Attachments } from "@/components/Attachments";
import { formatKRW, formatDate } from "@/lib/format";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      clientProfile: true,
      freelancerProfile: true,
      reviewsReceived: {
        include: { reviewer: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!user || user.deletedAt) notFound();

  const reviews = user.reviewsReceived;
  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;
  const fp = user.freelancerProfile;
  const skills = parseArray(fp?.skills);
  const categories = parseArray(fp?.categories);
  const projectTypes = parseArray(fp?.projectTypeExperience);
  const portfolioImages = parseArray(fp?.portfolioImages);

  // 주요 리뷰 태그 집계
  const tagCount: Record<string, number> = {};
  reviews.forEach((r) =>
    parseArray(r.tags).forEach((t) => (tagCount[t] = (tagCount[t] ?? 0) + 1))
  );
  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="container-page max-w-3xl space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {user.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profileImageUrl}
                alt={user.name}
                className="h-16 w-16 shrink-0 rounded-full border border-gray-200 object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
                {user.name.slice(0, 1)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {user.role ? ROLE_LABEL[user.role] : ""}
                </span>
              </div>
              {user.bio && (
                <p className="mt-2 text-sm text-gray-600">{user.bio}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            {reviews.length > 0 ? (
              <StarRating rating={avg} count={reviews.length} />
            ) : (
              <span className="text-sm text-gray-400">리뷰 없음</span>
            )}
          </div>
        </div>

        {/* 프리랜서 정보 */}
        {fp && (
          <div className="mt-5 space-y-4 border-t border-gray-100 pt-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Info label="경력" value={`${fp.experienceYears}년`} />
              <Info label="시간당 단가" value={formatKRW(fp.hourlyRate)} />
              <Info label="활동 분야" value={categories.join(", ") || "-"} />
            </div>
            {skills.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-semibold text-gray-700">
                  기술 스택
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                </div>
              </div>
            )}
            {projectTypes.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-semibold text-gray-700">
                  프로젝트 유형 경험
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {projectTypes.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3 text-sm">
              {fp.portfolioUrl && (
                <a href={fp.portfolioUrl} target="_blank" className="text-brand-600 hover:underline">
                  포트폴리오 ↗
                </a>
              )}
              {fp.githubUrl && (
                <a href={fp.githubUrl} target="_blank" className="text-brand-600 hover:underline">
                  GitHub ↗
                </a>
              )}
              {fp.deployedProjectUrl && (
                <a href={fp.deployedProjectUrl} target="_blank" className="text-brand-600 hover:underline">
                  배포 프로젝트 ↗
                </a>
              )}
            </div>
            {portfolioImages.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-semibold text-gray-700">
                  포트폴리오
                </p>
                <Attachments urls={portfolioImages} />
              </div>
            )}
          </div>
        )}

        {/* 의뢰인 정보 */}
        {user.clientProfile && (
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-5 sm:grid-cols-3">
            <Info label="회사명" value={user.clientProfile.companyName || "-"} />
            <Info label="사업 분야" value={user.clientProfile.industry || "-"} />
          </div>
        )}
      </div>

      {/* 주요 태그 */}
      {topTags.length > 0 && (
        <div className="card p-6">
          <p className="mb-3 text-sm font-bold text-gray-800">주요 평가</p>
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <span
                key={tag}
                className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700"
              >
                {tag} <span className="text-brand-400">×{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 리뷰 목록 */}
      <div className="card p-6">
        <p className="mb-3 text-sm font-bold text-gray-800">
          리뷰 ({reviews.length})
        </p>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">아직 작성된 리뷰가 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    {r.reviewer.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(r.createdAt)}
                  </span>
                </div>
                <StarRating rating={r.rating} />
                <p className="mt-1 text-sm text-gray-600">{r.content}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {parseArray(r.tags).map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
