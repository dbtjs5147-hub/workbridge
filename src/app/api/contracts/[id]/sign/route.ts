import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, ok, fail } from "@/lib/api";
import {
  PROJECT_STATUS,
  CONTRACT_STATUS,
  MILESTONE_STATUS,
  NOTIFICATION_TYPE,
} from "@/lib/constants";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { signatures: true },
  });
  if (!contract) return fail("계약서를 찾을 수 없습니다.", 404);

  const isParty =
    user!.id === contract.clientId || user!.id === contract.freelancerId;
  if (!isParty) return fail("계약 당사자만 서명할 수 있습니다.", 403);
  if (contract.status === CONTRACT_STATUS.SIGNED) {
    return fail("이미 체결된 계약입니다.");
  }

  // 이미 서명했는지 확인 (멱등)
  const already = contract.signatures.find((s) => s.userId === user!.id);
  if (!already) {
    await prisma.contractSignature.create({
      data: {
        contractId: id,
        userId: user!.id,
        signatureType: "checkbox",
        ipAddress:
          req.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    });
  }

  // 양측 서명 완료 확인
  const sigCount = await prisma.contractSignature.count({
    where: { contractId: id },
  });
  const bothSigned = sigCount >= 2;

  if (bothSigned) {
    await prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id },
        data: { status: CONTRACT_STATUS.SIGNED },
      });
      await tx.project.update({
        where: { id: contract.projectId },
        data: { status: PROJECT_STATUS.PAYMENT_PENDING },
      });
      // 첫 마일스톤 결제 대기로 전환
      const first = await tx.projectMilestone.findFirst({
        where: { projectId: contract.projectId },
        orderBy: { order: "asc" },
      });
      if (first) {
        await tx.projectMilestone.update({
          where: { id: first.id },
          data: { status: MILESTONE_STATUS.PAYMENT_PENDING },
        });
      }
    });
    // 상대방에게 알림
    const other =
      user!.id === contract.clientId
        ? contract.freelancerId
        : contract.clientId;
    await prisma.notification.create({
      data: {
        userId: other,
        type: NOTIFICATION_TYPE.SIGNATURE_COMPLETED,
        title: "양측 전자 서명이 완료되었습니다",
        message: "계약이 체결되었습니다. 결제 단계로 진행할 수 있습니다.",
        targetUrl: `/contracts/${id}`,
      },
    });
  }

  return ok({ bothSigned });
}
