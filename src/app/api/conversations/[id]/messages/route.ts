import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, ok, fail } from "@/lib/api";

async function getParticipantConversation(convId: string, userId: string) {
  const conv = await prisma.conversation.findUnique({ where: { id: convId } });
  if (!conv) return null;
  if (conv.clientId !== userId && conv.freelancerId !== userId) return null;
  return conv;
}

// 메시지 조회 (폴링용). after=ISO 가 있으면 그 이후 메시지만 반환.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const conv = await getParticipantConversation(id, user!.id);
  if (!conv) return fail("대화방을 찾을 수 없습니다.", 404);

  const after = req.nextUrl.searchParams.get("after");
  const where: { conversationId: string; createdAt?: { gt: Date } } = {
    conversationId: id,
  };
  if (after) {
    const d = new Date(after);
    if (!isNaN(d.getTime())) where.createdAt = { gt: d };
  }

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  // 상대방이 보낸 안 읽은 메시지를 읽음 처리
  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: user!.id }, isRead: false },
    data: { isRead: true },
  });

  return ok({
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId,
      mine: m.senderId === user!.id,
      createdAt: m.createdAt,
    })),
  });
}

const sendSchema = z.object({ content: z.string().trim().min(1).max(2000) });

// 메시지 전송
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const conv = await getParticipantConversation(id, user!.id);
  if (!conv) return fail("대화방을 찾을 수 없습니다.", 404);

  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return fail("메시지를 입력해 주세요.");

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: user!.id,
      content: parsed.data.content,
    },
  });
  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return ok({
    message: {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      mine: true,
      createdAt: message.createdAt,
    },
  });
}
