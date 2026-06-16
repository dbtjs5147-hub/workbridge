import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, fail } from "@/lib/api";
import {
  PROJECT_STATUS,
  MILESTONE_STATUS,
  NOTIFICATION_TYPE,
} from "@/lib/constants";
import { stringifyArray } from "@/lib/json";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireRole("FREELANCER");
  if (error) return error;
  const { id } = await params;

  const cr = await prisma.changeRequest.findUnique({ where: { id } });
  if (!cr) return fail("변경 요청을 찾을 수 없습니다.", 404);
  if (cr.status !== "PENDING") return fail("이미 처리된 변경 요청입니다.");

  const contract = await prisma.contract.findUnique({
    where: { id: cr.contractId },
  });
  if (!contract || contract.freelancerId !== user!.id) {
    return fail("담당 프리랜서만 처리할 수 있습니다.", 403);
  }

  await prisma.$transaction(async (tx) => {
    await tx.changeRequest.update({
      where: { id },
      data: { status: "ACCEPTED" },
    });

    // 추가 금액이 있으면 추가 마일스톤 생성 → 기존 에스크로 흐름으로 결제/검수
    if (cr.additionalBudget > 0) {
      const last = await tx.projectMilestone.findFirst({
        where: { projectId: cr.projectId },
        orderBy: { order: "desc" },
      });
      const nextOrder = (last?.order ?? -1) + 1;
      await tx.projectMilestone.create({
        data: {
          projectId: cr.projectId,
          title: `추가 작업: ${cr.description.slice(0, 30)}`,
          description: cr.description,
          deliverables: stringifyArray([cr.description]),
          acceptanceCriteria: stringifyArray(["변경 요청 내용이 반영되어야 한다"]),
          amount: cr.additionalBudget,
          order: nextOrder,
          status: MILESTONE_STATUS.PAYMENT_PENDING,
        },
      });
      // 새 결제가 필요하므로 프로젝트를 결제 대기로
      await tx.project.update({
        where: { id: cr.projectId },
        data: { status: PROJECT_STATUS.PAYMENT_PENDING },
      });
    }

    await tx.notification.create({
      data: {
        userId: cr.requesterId,
        type: NOTIFICATION_TYPE.CHANGE_RESPONDED,
        title: "변경 요청이 수락되었습니다",
        message:
          cr.additionalBudget > 0
            ? `추가 마일스톤(${cr.additionalBudget.toLocaleString()}원)이 생성되었습니다. 결제 후 진행됩니다.`
            : "기존 범위 내에서 반영하기로 했습니다.",
        targetUrl: `/contracts/${cr.contractId}`,
      },
    });
  });

  return ok({ success: true });
}
