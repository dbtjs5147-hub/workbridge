import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, fail } from "@/lib/api";
import { PROJECT_STATUS, NOTIFICATION_TYPE } from "@/lib/constants";
import { checkFreelancerProfile } from "@/lib/profile";

const schema = z.object({
  coverLetter: z.string().min(1, "자기소개를 입력해 주세요."),
  proposedAmount: z.number().int().nonnegative(),
  proposedDuration: z.string().min(1, "예상 기간을 입력해 주세요."),
  relatedExperience: z.string().default(""),
  proposalText: z.string().default(""),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireRole("FREELANCER");
  if (error) return error;
  const { id } = await params;

  // 입찰 자격: 최소 프로필(기술·포트폴리오) 검증 — 화면뿐 아니라 서버에서도 막아 우회 방지
  const profile = await prisma.freelancerProfile.findUnique({
    where: { userId: user!.id },
  });
  const { complete, missing } = checkFreelancerProfile(profile);
  if (!complete) {
    return fail(
      `입찰하려면 프로필을 먼저 완성해 주세요. 누락: ${missing.join(", ")}`,
      403
    );
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.isDeleted) return fail("프로젝트를 찾을 수 없습니다.", 404);
  if (project.status !== PROJECT_STATUS.OPEN) {
    return fail("모집 중인 프로젝트에만 지원할 수 있습니다.");
  }

  const dup = await prisma.application.findUnique({
    where: { projectId_freelancerId: { projectId: id, freelancerId: user!.id } },
  });
  if (dup) return fail("이미 지원한 프로젝트입니다.", 409);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
  }

  await prisma.application.create({
    data: {
      projectId: id,
      freelancerId: user!.id,
      ...parsed.data,
      status: "PENDING",
    },
  });

  // 의뢰인에게 알림
  await prisma.notification.create({
    data: {
      userId: project.clientId,
      type: NOTIFICATION_TYPE.APPLICATION_RECEIVED,
      title: "새 지원자가 있습니다",
      message: `${project.title}에 ${user!.name}님이 지원했습니다.`,
      targetUrl: `/projects/${id}/applicants`,
    },
  });

  return ok({ success: true });
}
