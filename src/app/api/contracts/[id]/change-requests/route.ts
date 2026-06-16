import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, fail } from "@/lib/api";
import { assessChangeRequest } from "@/lib/ai";
import { CONTRACT_STATUS, NOTIFICATION_TYPE } from "@/lib/constants";

const schema = z.object({
  description: z.string().min(1, "변경 요청 내용을 입력해 주세요."),
  reason: z.string().default(""),
  additionalBudget: z.number().int().nonnegative().default(0),
  desiredDueDate: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireRole("CLIENT");
  if (error) return error;
  const { id } = await params;

  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) return fail("계약을 찾을 수 없습니다.", 404);
  if (contract.clientId !== user!.id) {
    return fail("본인 계약만 변경 요청할 수 있습니다.", 403);
  }
  if (contract.status !== CONTRACT_STATUS.SIGNED) {
    return fail("계약 체결 후에만 변경 요청을 등록할 수 있습니다.");
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
  }
  const d = parsed.data;

  // AI가 기존 계약 범위 포함 여부 참고 의견 제시
  let aiInScope: boolean | null = null;
  let aiOpinion: string | null = null;
  try {
    const assessment = await assessChangeRequest({
      contractScope: contract.contractScope,
      description: d.description,
      reason: d.reason,
    });
    aiInScope = assessment.inScope;
    aiOpinion = assessment.opinion;
  } catch {
    /* AI 실패해도 변경 요청 자체는 등록 */
  }

  const cr = await prisma.changeRequest.create({
    data: {
      projectId: contract.projectId,
      contractId: id,
      requesterId: user!.id,
      description: d.description,
      reason: d.reason,
      additionalBudget: d.additionalBudget,
      desiredDueDate: d.desiredDueDate ? new Date(d.desiredDueDate) : null,
      status: "PENDING",
      aiInScope,
      aiOpinion,
    },
  });

  await prisma.notification.create({
    data: {
      userId: contract.freelancerId,
      type: NOTIFICATION_TYPE.CHANGE_REQUESTED,
      title: "변경 요청이 도착했습니다",
      message: d.description.slice(0, 60),
      targetUrl: `/contracts/${id}`,
    },
  });

  return ok({ id: cr.id, aiInScope, aiOpinion });
}
