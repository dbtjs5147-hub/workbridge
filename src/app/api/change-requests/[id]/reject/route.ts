import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, fail } from "@/lib/api";
import { NOTIFICATION_TYPE } from "@/lib/constants";

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

  await prisma.changeRequest.update({
    where: { id },
    data: { status: "REJECTED" },
  });
  await prisma.notification.create({
    data: {
      userId: cr.requesterId,
      type: NOTIFICATION_TYPE.CHANGE_RESPONDED,
      title: "변경 요청이 거절되었습니다",
      message: "변경 요청이 거절되었습니다. 상대와 협의해 보세요.",
      targetUrl: `/contracts/${cr.contractId}`,
    },
  });

  return ok({ success: true });
}
