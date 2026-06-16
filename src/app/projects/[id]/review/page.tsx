import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PROJECT_STATUS } from "@/lib/constants";
import {
  REVIEW_TAGS_CLIENT_TO_FREELANCER,
  REVIEW_TAGS_FREELANCER_TO_CLIENT,
} from "@/lib/constants";
import { ReviewForm } from "./ReviewForm";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id },
    include: { contract: true },
  });
  if (!project || !project.contract) notFound();

  const c = project.contract;
  const isClient = user.id === c.clientId;
  const isFreelancer = user.id === c.freelancerId;
  if (!isClient && !isFreelancer) {
    return (
      <div className="container-page max-w-xl">
        <div className="card p-8 text-center text-gray-500">
          거래 당사자만 리뷰할 수 있습니다.
        </div>
      </div>
    );
  }
  if (project.status !== PROJECT_STATUS.COMPLETED) {
    return (
      <div className="container-page max-w-xl">
        <div className="card p-8 text-center text-gray-500">
          완료된 프로젝트만 리뷰할 수 있습니다.
        </div>
      </div>
    );
  }

  const revieweeId = isClient ? c.freelancerId : c.clientId;
  const reviewee = await prisma.user.findUnique({ where: { id: revieweeId } });

  const existing = await prisma.review.findUnique({
    where: {
      projectId_reviewerId_revieweeId: {
        projectId: id,
        reviewerId: user.id,
        revieweeId,
      },
    },
  });

  if (existing) {
    return (
      <div className="container-page max-w-xl">
        <div className="card p-8 text-center">
          <p className="text-lg font-semibold text-gray-800">
            이미 리뷰를 작성하셨습니다
          </p>
          <Link
            href={`/users/${revieweeId}`}
            className="btn-secondary mt-4 inline-flex"
          >
            상대 프로필 보기
          </Link>
        </div>
      </div>
    );
  }

  const tags = isClient
    ? REVIEW_TAGS_CLIENT_TO_FREELANCER
    : REVIEW_TAGS_FREELANCER_TO_CLIENT;

  return (
    <div className="container-page max-w-xl">
      <div className="card p-8">
        <h1 className="text-xl font-bold text-gray-900">리뷰 작성</h1>
        <p className="mt-1 text-sm text-gray-500">
          {reviewee?.name}님과의 <b>{project.title}</b> 프로젝트는 어떠셨나요?
        </p>
        <ReviewForm projectId={id} tags={tags} />
      </div>
    </div>
  );
}
