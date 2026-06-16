import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, ok, fail } from "@/lib/api";
import { PROJECT_STATUS } from "@/lib/constants";
import { stringifyArray } from "@/lib/json";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().default(""),
  tags: z.array(z.string()).default([]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { contract: true },
  });
  if (!project) return fail("프로젝트를 찾을 수 없습니다.", 404);
  if (project.status !== PROJECT_STATUS.COMPLETED) {
    return fail("완료된 프로젝트만 리뷰할 수 있습니다.");
  }
  const contract = project.contract;
  if (!contract) return fail("계약 정보를 찾을 수 없습니다.");

  const isClient = user!.id === contract.clientId;
  const isFreelancer = user!.id === contract.freelancerId;
  if (!isClient && !isFreelancer) {
    return fail("거래 당사자만 리뷰할 수 있습니다.", 403);
  }
  const revieweeId = isClient ? contract.freelancerId : contract.clientId;

  const dup = await prisma.review.findUnique({
    where: {
      projectId_reviewerId_revieweeId: {
        projectId: id,
        reviewerId: user!.id,
        revieweeId,
      },
    },
  });
  if (dup) return fail("이미 리뷰를 작성했습니다.", 409);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
  }

  await prisma.review.create({
    data: {
      projectId: id,
      reviewerId: user!.id,
      revieweeId,
      rating: parsed.data.rating,
      content: parsed.data.content,
      tags: stringifyArray(parsed.data.tags),
    },
  });

  return ok({ success: true });
}
