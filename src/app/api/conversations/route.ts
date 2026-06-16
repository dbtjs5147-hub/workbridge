import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, ok, fail } from "@/lib/api";

const schema = z.object({
  projectId: z.string().min(1),
  freelancerId: z.string().optional(),
});

// 대화방 찾기 또는 생성 (find-or-create)
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("잘못된 요청입니다.");
  const { projectId } = parsed.data;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.isDeleted) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  let clientId: string;
  let freelancerId: string;

  if (user!.role === "FREELANCER") {
    clientId = project.clientId;
    freelancerId = user!.id;
  } else if (user!.role === "CLIENT") {
    if (project.clientId !== user!.id) {
      return fail("본인 프로젝트에서만 대화를 시작할 수 있습니다.", 403);
    }
    if (!parsed.data.freelancerId) {
      return fail("대화 상대(프리랜서)를 지정해 주세요.");
    }
    clientId = user!.id;
    freelancerId = parsed.data.freelancerId;
  } else {
    return fail("역할이 필요합니다.", 403);
  }

  const conversation = await prisma.conversation.upsert({
    where: {
      projectId_clientId_freelancerId: { projectId, clientId, freelancerId },
    },
    create: { projectId, clientId, freelancerId },
    update: {},
  });

  return ok({ id: conversation.id });
}
