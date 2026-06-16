import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, fail } from "@/lib/api";
import {
  PROJECT_STATUS,
  APPLICATION_STATUS,
  CONTRACT_STATUS,
  NOTIFICATION_TYPE,
} from "@/lib/constants";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireRole("CLIENT");
  if (error) return error;
  const { id } = await params;

  const application = await prisma.application.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!application) return fail("지원서를 찾을 수 없습니다.", 404);
  if (application.project.clientId !== user!.id) {
    return fail("본인 프로젝트만 관리할 수 있습니다.", 403);
  }
  if (application.status !== APPLICATION_STATUS.PENDING) {
    return fail("이미 처리된 지원서입니다.");
  }
  const existingContract = await prisma.contract.findUnique({
    where: { projectId: application.projectId },
  });
  if (existingContract) return fail("이미 계약이 진행 중입니다.");

  const result = await prisma.$transaction(async (tx) => {
    // 1) 수락
    await tx.application.update({
      where: { id },
      data: { status: APPLICATION_STATUS.ACCEPTED, acceptedAt: new Date() },
    });

    // 2) 다른 대기 지원자 자동 거절
    const others = await tx.application.findMany({
      where: {
        projectId: application.projectId,
        id: { not: id },
        status: APPLICATION_STATUS.PENDING,
      },
    });
    if (others.length > 0) {
      await tx.application.updateMany({
        where: { id: { in: others.map((o) => o.id) } },
        data: { status: APPLICATION_STATUS.AUTO_REJECTED, rejectedAt: new Date() },
      });
      await tx.notification.createMany({
        data: others.map((o) => ({
          userId: o.freelancerId,
          type: NOTIFICATION_TYPE.APPLICATION_AUTO_REJECTED,
          title: "다른 지원자가 선정되었습니다",
          message: `${application.project.title} 프로젝트의 다른 지원자가 수락되었습니다.`,
          targetUrl: `/my/applications`,
        })),
      });
    }

    // 3) 계약서 자동 생성 (서명 대기)
    const ai = await tx.aIAnalysis.findUnique({
      where: { projectId: application.projectId },
    });
    const contract = await tx.contract.create({
      data: {
        projectId: application.projectId,
        applicationId: id,
        clientId: user!.id,
        freelancerId: application.freelancerId,
        agreedAmount: application.proposedAmount || application.project.budget,
        contractScope: ai?.contractScopeDraft ?? "",
        excludedScope: "",
        changeRequestPolicy:
          "계약 범위 외 추가 요청은 별도 변경 요청 절차를 통해 처리한다.",
        status: CONTRACT_STATUS.WAITING_SIGNATURE,
        contractBody:
          "본 계약은 WorkBridge MVP의 시연용 계약 템플릿입니다. 납품 범위·제외 범위·마일스톤·검수 기준·지급 조건을 포함합니다.",
      },
    });

    // 3.5) 마일스톤 금액을 '실제 입찰가(계약 금액)'로 재배분
    //  - 에스크로 금액이 AI 추정치가 아니라 프리랜서가 제시한 입찰가가 되도록 한다.
    const agreed = contract.agreedAmount;
    if (agreed > 0) {
      const milestones = await tx.projectMilestone.findMany({
        where: { projectId: application.projectId },
        orderBy: { order: "asc" },
      });
      if (milestones.length > 0) {
        const weightSum = milestones.reduce((s, m) => s + (m.amount || 0), 0);
        let allocated = 0;
        for (let i = 0; i < milestones.length; i++) {
          const m = milestones[i];
          let amt: number;
          if (i === milestones.length - 1) {
            // 마지막 단계는 잔액을 모두 배정해 합계가 정확히 입찰가와 일치하도록
            amt = agreed - allocated;
          } else if (weightSum > 0) {
            // 기존 비중을 유지해 10만원 단위로 배분
            amt = Math.round((agreed * (m.amount || 0)) / weightSum / 100000) * 100000;
          } else {
            // 비중 정보가 없으면 균등 배분
            amt = Math.round(agreed / milestones.length / 100000) * 100000;
          }
          allocated += amt;
          await tx.projectMilestone.update({
            where: { id: m.id },
            data: { amount: amt },
          });
        }
      }
    }

    // 4) 프로젝트 상태 전환
    await tx.project.update({
      where: { id: application.projectId },
      data: { status: PROJECT_STATUS.SIGNATURE_PENDING },
    });

    // 5) 프리랜서에게 알림
    await tx.notification.create({
      data: {
        userId: application.freelancerId,
        type: NOTIFICATION_TYPE.APPLICATION_ACCEPTED,
        title: "지원이 수락되었습니다!",
        message: `${application.project.title} 계약서가 생성되었습니다. 내용을 확인하고 서명해 주세요.`,
        targetUrl: `/contracts/${contract.id}`,
      },
    });

    return contract;
  });

  return ok({ contractId: result.id });
}
