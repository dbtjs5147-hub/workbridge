import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, fail } from "@/lib/api";
import {
  PROJECT_STATUS,
  MILESTONE_STATUS,
  NOTIFICATION_TYPE,
} from "@/lib/constants";
import { stringifyArray } from "@/lib/json";

const schema = z.object({
  deliveryUrl: z.string().optional(),
  description: z.string().min(1, "납품 설명을 입력해 주세요."),
  attachmentUrls: z.array(z.string()).default([]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireRole("FREELANCER");
  if (error) return error;
  const { id } = await params;

  const milestone = await prisma.projectMilestone.findUnique({
    where: { id },
    include: { project: { include: { contract: true } } },
  });
  if (!milestone) return fail("마일스톤을 찾을 수 없습니다.", 404);
  const contract = milestone.project.contract;
  if (!contract || contract.freelancerId !== user!.id) {
    return fail("담당 프리랜서만 납품할 수 있습니다.", 403);
  }
  if (milestone.status !== MILESTONE_STATUS.IN_PROGRESS) {
    return fail("작업 중인 마일스톤만 납품 요청할 수 있습니다.");
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.delivery.create({
      data: {
        projectId: milestone.projectId,
        milestoneId: id,
        freelancerId: user!.id,
        deliveryUrl: parsed.data.deliveryUrl,
        description: parsed.data.description,
        attachmentUrls: stringifyArray(parsed.data.attachmentUrls),
        status: "REQUESTED",
      },
    });
    await tx.projectMilestone.update({
      where: { id },
      data: { status: MILESTONE_STATUS.DELIVERY_REQUESTED },
    });
    await tx.project.update({
      where: { id: milestone.projectId },
      data: { status: PROJECT_STATUS.UNDER_REVIEW },
    });
    await tx.notification.create({
      data: {
        userId: milestone.project.clientId,
        type: NOTIFICATION_TYPE.DELIVERY_REQUESTED,
        title: "납품 요청이 도착했습니다",
        message: `${milestone.title} 결과물을 검수해 주세요.`,
        targetUrl: `/contracts/${contract.id}`,
      },
    });
  });

  return ok({ success: true });
}
