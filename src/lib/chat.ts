import { prisma } from "./prisma";

// 사용자가 참여한 대화방 id 목록
export async function getUserConversationIds(userId: string): Promise<string[]> {
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ clientId: userId }, { freelancerId: userId }] },
    select: { id: true },
  });
  return convs.map((c) => c.id);
}

// 안 읽은 메시지 총 개수 (헤더 배지용)
export async function getUnreadMessageCount(userId: string): Promise<number> {
  const ids = await getUserConversationIds(userId);
  if (ids.length === 0) return 0;
  return prisma.message.count({
    where: {
      conversationId: { in: ids },
      senderId: { not: userId },
      isRead: false,
    },
  });
}
