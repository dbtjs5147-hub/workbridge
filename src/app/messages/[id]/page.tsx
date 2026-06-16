import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChatThread } from "./ChatThread";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (!conv) notFound();
  if (conv.clientId !== user.id && conv.freelancerId !== user.id) {
    return (
      <div className="container-page max-w-xl">
        <div className="card p-8 text-center text-gray-500">
          대화 참여자만 열람할 수 있습니다.
        </div>
      </div>
    );
  }

  const otherId = conv.clientId === user.id ? conv.freelancerId : conv.clientId;
  const [other, project, initialMessages] = await Promise.all([
    prisma.user.findUnique({
      where: { id: otherId },
      select: { id: true, name: true, role: true },
    }),
    prisma.project.findUnique({
      where: { id: conv.projectId },
      select: { id: true, title: true },
    }),
    prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // 진입 시 상대 메시지 읽음 처리
  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, isRead: false },
    data: { isRead: true },
  });

  return (
    <div className="container-page max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-gray-900">
            {other?.name ?? "알 수 없음"}
          </p>
          {project && (
            <Link
              href={`/projects/${project.id}`}
              className="text-xs text-gray-400 hover:text-brand-600"
            >
              📁 {project.title}
            </Link>
          )}
        </div>
        <Link href="/messages" className="btn-ghost text-sm">
          ← 목록
        </Link>
      </div>

      <ChatThread
        conversationId={id}
        myId={user.id}
        initialMessages={initialMessages.map((m) => ({
          id: m.id,
          content: m.content,
          senderId: m.senderId,
          mine: m.senderId === user.id,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
