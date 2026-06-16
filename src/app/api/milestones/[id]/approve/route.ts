import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, fail } from "@/lib/api";
import {
  PROJECT_STATUS,
  MILESTONE_STATUS,
  SETTLEMENT_STATUS,
  PLATFORM_FEE_RATE,
  NOTIFICATION_TYPE,
} from "@/lib/constants";

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
    return fail("본인 프로젝트만 승인할 수 있습니다.", 403);
  }
  const contract = milestone.project.contract;
  if (!contract) return fail("계약 정보를 찾을 수 없습니다.");
  if (milestone.status !== MILESTONE_STATUS.DELIVERY_REQUESTED) {
    return fail("납품 요청된 마일스톤만 승인할 수 있습니다.");
  }

  const payment = await prisma.payment.findFirst({
    where: { milestoneId: id, status: "PAID" },
  });

  const fee = Math.round(milestone.amount * PLATFORM_FEE_RATE);
  const payout = milestone.amount - fee;

  const completed = await prisma.$transaction(async (tx) => {
    // 1) 마일스톤 승인 → 정산 완료
    await tx.projectMilestone.update({
      where: { id },
      data: { status: MILESTONE_STATUS.SETTLED },
    });
    // 2) 납품 승인 처리
    await tx.delivery.updateMany({
      where: { milestoneId: id, status: "REQUESTED" },
      data: { status: "APPROVED", reviewedAt: new Date() },
    });
    // 3) 정산 생성 (수수료 차감)
    if (payment) {
      const exists = await tx.settlement.findUnique({
        where: { milestoneId: id },
      });
      if (!exists) {
        await tx.settlement.create({
          data: {
            paymentId: payment.id,
            milestoneId: id,
            grossAmount: milestone.amount,
            platformFee: fee,
            freelancerPayoutAmount: payout,
            status: SETTLEMENT_STATUS.SETTLED,
            settledAt: new Date(),
          },
        });
      }
    }

    // 4) 다음 마일스톤 결제 대기 전환 / 전체 완료 판단
    const all = await tx.projectMilestone.findMany({
      where: { projectId: milestone.projectId },
      orderBy: { order: "asc" },
    });
    const next = all.find(
      (m) => m.id !== id && m.status === MILESTONE_STATUS.PENDING
    );
    const allSettled = all.every(
      (m) => m.id === id || m.status === MILESTONE_STATUS.SETTLED
    );

    if (allSettled) {
      await tx.project.update({
        where: { id: milestone.projectId },
        data: { status: PROJECT_STATUS.COMPLETED },
      });
      // 양측 리뷰 요청 알림
      await tx.notification.createMany({
        data: [contract.clientId, contract.freelancerId].map((uid) => ({
          userId: uid,
          type: NOTIFICATION_TYPE.REVIEW_REQUESTED,
          title: "프로젝트가 완료되었습니다 🎉",
          message: `${milestone.project.title} 거래 상대에게 리뷰를 남겨주세요.`,
          targetUrl: `/projects/${milestone.projectId}/review`,
        })),
      });
      return true;
    } else {
      if (next) {
        await tx.projectMilestone.update({
          where: { id: next.id },
          data: { status: MILESTONE_STATUS.PAYMENT_PENDING },
        });
      }
      await tx.project.update({
        where: { id: milestone.projectId },
        data: { status: PROJECT_STATUS.PAYMENT_PENDING },
      });
      // 프리랜서에게 승인/정산 알림
      await tx.notification.create({
        data: {
          userId: contract.freelancerId,
          type: NOTIFICATION_TYPE.MILESTONE_APPROVED,
          title: "마일스톤이 승인되었습니다",
          message: `${milestone.title} 승인 완료 (정산 ${payout.toLocaleString()}원, 수수료 ${fee.toLocaleString()}원 차감)`,
          targetUrl: `/contracts/${contract.id}`,
        },
      });
      return false;
    }
  });

  return ok({ completed });
}
