import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, fail } from "@/lib/api";
import { APPLICATION_STATUS, NOTIFICATION_TYPE } from "@/lib/constants";

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

  await prisma.application.update({
    where: { id },
    data: { status: APPLICATION_STATUS.REJECTED, rejectedAt: new Date() },
  });
  await prisma.notification.create({
    data: {
      userId: application.freelancerId,
      type: NOTIFICATION_TYPE.APPLICATION_REJECTED,
      title: "지원 결과 안내",
      message: `${application.project.title} 프로젝트 지원이 거절되었습니다.`,
      targetUrl: `/my/applications`,
    },
  });

  return ok({ success: true });
}
