import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, fail } from "@/lib/api";
import {
  PROJECT_STATUS,
  MILESTONE_STATUS,
  PAYMENT_STATUS,
  NOTIFICATION_TYPE,
} from "@/lib/constants";

// PG sandbox 결제 (mock): 실제 키가 있으면 PG 결제창/콜백으로 확장 가능.
// 멱등 처리: 이미 결제된 마일스톤은 중복 결제되지 않는다.
export async function POST(
  _req: NextRequest,
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
    return fail("본인 프로젝트만 결제할 수 있습니다.", 403);
  }
  const contract = milestone.project.contract;
  if (!contract) return fail("계약이 체결되지 않았습니다.");

  // 멱등성: 이미 PAID 결제가 있으면 통과
  const existingPaid = await prisma.payment.findFirst({
    where: { milestoneId: id, status: PAYMENT_STATUS.PAID },
  });
  if (existingPaid) {
    return ok({ alreadyPaid: true });
  }

  if (milestone.status !== MILESTONE_STATUS.PAYMENT_PENDING) {
    return fail("결제 대기 상태의 마일스톤만 결제할 수 있습니다.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        projectId: milestone.projectId,
        contractId: contract.id,
        milestoneId: id,
        clientId: milestone.project.clientId,
        freelancerId: contract.freelancerId,
        amount: milestone.amount,
        pgProvider: process.env.PG_PROVIDER ?? "mock",
        pgTransactionId: `mock_tx_${Date.now()}`,
        status: PAYMENT_STATUS.PAID,
        paidAt: new Date(),
      },
    });
    // 결제 완료 → 에스크로 예치 → 작업 시작
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
        type: NOTIFICATION_TYPE.PAYMENT_COMPLETED,
        title: "에스크로 결제가 완료되었습니다",
        message: `${milestone.title} 작업을 시작할 수 있습니다.`,
        targetUrl: `/contracts/${contract.id}`,
      },
    });
  });

  return ok({ success: true });
}
