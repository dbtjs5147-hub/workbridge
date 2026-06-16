import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, fail } from "@/lib/api";
import {
  PROJECT_STATUS,
  MILESTONE_STATUS,
  NOTIFICATION_TYPE,
} from "@/lib/constants";

const schema = z.object({
  reason: z.string().min(1, "수정 요청 사유를 입력해 주세요."),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireRole("CLIENT");
  if (error) return error;
  const { id } = await params;

  const milestone = await prisma.projectMilestone.findUnique({
    where: { id },
    include: { project: { include: { contract: true } } },
  });
  if (!milestone) return fail("마일스톤을 찾을 수 없습니다.", 404);
  if (milestone.project.clientId !== user!.id) {
    return fail("본인 프로젝트만 수정 요청할 수 있습니다.", 403);
  }
  const contract = milestone.project.contract;
  if (!contract) return fail("계약 정보를 찾을 수 없습니다.");
  if (milestone.status !== MILESTONE_STATUS.DELIVERY_REQUESTED) {
    return fail("납품 요청된 마일스톤만 수정 요청할 수 있습니다.");
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "사유를 입력해 주세요.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.delivery.updateMany({
      where: { milestoneId: id, status: "REQUESTED" },
      data: {
        status: "REVISION_REQUESTED",
        revisionNote: parsed.data.reason,
        reviewedAt: new Date(),
      },
    });
    // 다시 작업 중으로 복귀
    await tx.projectMilestone.update({
      where: { id },
      data: { status: MILESTONE_STATUS.IN_PROGRESS },
    });
    await tx.project.update({
      where: { id: milestone.projectId },
      data: { status: PROJECT_STATUS.IN_PROGRESS },
    });
    await tx.notification.create({
      data: {
        userId: contract.freelancerId,
        type: NOTIFICATION_TYPE.REVISION_REQUESTED,
        title: "수정 요청이 도착했습니다",
        message: `${milestone.title}: ${parsed.data.reason}`,
        targetUrl: `/contracts/${contract.id}`,
      },
    });
  });

  return ok({ success: true });
}
