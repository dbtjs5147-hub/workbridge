import { prisma } from "./prisma";
import {
  PROJECT_STATUS,
  MILESTONE_STATUS,
  PAYMENT_STATUS,
  NOTIFICATION_TYPE,
} from "./constants";

// ============================================================
// 결제(PG) 추상화 레이어
//  - TOSS_SECRET_KEY 가 있으면 토스페이먼츠 실연동(테스트/실거래),
//    없으면 mock 으로 폴백한다. (AI 공급자와 동일한 패턴)
//  - 보안 핵심: 결제 승인은 반드시 '서버에서' 토스 승인 API로 검증하고,
//    금액은 우리 DB(milestone.amount)와 대조해 위변조를 막는다.
// ============================================================

export function tossEnabled(): boolean {
  return !!process.env.TOSS_SECRET_KEY;
}

// 토스 승인 API 호출 — 결제창에서 받은 paymentKey/orderId/amount를 최종 승인.
export async function confirmTossPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<{ ok: true; raw: unknown } | { ok: false; message: string }> {
  const secret = process.env.TOSS_SECRET_KEY ?? "";
  const auth = Buffer.from(`${secret}:`).toString("base64");
  try {
    const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        message:
          (data as { message?: string })?.message ??
          `토스 결제 승인 실패(${res.status})`,
      };
    }
    return { ok: true, raw: data };
  } catch (e) {
    console.error("[토스 승인 호출 실패]", e);
    return { ok: false, message: "결제 승인 중 오류가 발생했습니다." };
  }
}

type PaidResult =
  | { ok: true; alreadyPaid?: boolean }
  | { ok: false; status: number; error: string };

// 마일스톤 결제 확정 + 다음 단계 전환. mock/toss 양쪽이 공용으로 호출한다.
//  - 소유권(clientId), 계약 존재, 멱등성, 상태(PAYMENT_PENDING), 금액 검증을 모두 수행.
export async function markMilestonePaid(opts: {
  milestoneId: string;
  clientId: string;
  pgProvider: string;
  pgTransactionId: string;
  expectedAmount?: number;
}): Promise<PaidResult> {
  const { milestoneId, clientId, pgProvider, pgTransactionId, expectedAmount } =
    opts;

  const milestone = await prisma.projectMilestone.findUnique({
    where: { id: milestoneId },
    include: { project: { include: { contract: true } } },
  });
  if (!milestone) return { ok: false, status: 404, error: "마일스톤을 찾을 수 없습니다." };
  if (milestone.project.clientId !== clientId) {
    return { ok: false, status: 403, error: "본인 프로젝트만 결제할 수 있습니다." };
  }
  const contract = milestone.project.contract;
  if (!contract) return { ok: false, status: 400, error: "계약이 체결되지 않았습니다." };

  // 금액 위변조 방지: 승인 금액은 반드시 우리 DB 금액과 일치해야 한다.
  if (typeof expectedAmount === "number" && expectedAmount !== milestone.amount) {
    return { ok: false, status: 400, error: "결제 금액이 일치하지 않습니다." };
  }

  // 멱등성: 이미 결제 완료면 통과
  const existingPaid = await prisma.payment.findFirst({
    where: { milestoneId, status: PAYMENT_STATUS.PAID },
  });
  if (existingPaid) return { ok: true, alreadyPaid: true };

  if (milestone.status !== MILESTONE_STATUS.PAYMENT_PENDING) {
    return { ok: false, status: 400, error: "결제 대기 상태의 마일스톤만 결제할 수 있습니다." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        projectId: milestone.projectId,
        contractId: contract.id,
        milestoneId,
        clientId: milestone.project.clientId,
        freelancerId: contract.freelancerId,
        amount: milestone.amount,
        pgProvider,
        pgTransactionId,
        status: PAYMENT_STATUS.PAID,
        paidAt: new Date(),
      },
    });
    await tx.projectMilestone.update({
      where: { id: milestoneId },
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

  return { ok: true };
}
