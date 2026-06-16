import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { relativeTime } from "@/lib/format";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ clientId: user.id }, { freelancerId: user.id }] },
    orderBy: { updatedAt: "desc" },
  });

  // 상대방·프로젝트·마지막 메시지·안읽음 일괄 조회
  const otherIds = conversations.map((c) =>
    c.clientId === user.id ? c.freelancerId : c.clientId
  );
  const projectIds = conversations.map((c) => c.projectId);
  const [users, projects] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: otherIds } },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, title: true },
    }),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const projectMap = new Map(projects.map((p) => [p.id, p.title]));

  const enriched = await Promise.all(
    conversations.map(async (c) => {
      const otherId = c.clientId === user.id ? c.freelancerId : c.clientId;
      const last = await prisma.message.findFirst({
        where: { conversationId: c.id },
        orderBy: { createdAt: "desc" },
      });
      const unread = await prisma.message.count({
        where: {
          conversationId: c.id,
          senderId: { not: user.id },
          isRead: false,
        },
      });
      return {
        id: c.id,
        otherName: userMap.get(otherId) ?? "알 수 없음",
        projectTitle: projectMap.get(c.projectId) ?? "(삭제된 프로젝트)",
        lastContent: last?.content ?? "대화를 시작해 보세요.",
        lastAt: last?.createdAt ?? c.createdAt,
        unread,
      };
    })
  );

  return (
    <div className="container-page max-w-2xl">
      <PageHeader title="메시지" description="의뢰인·프리랜서와 실시간으로 소통하세요." />
      {enriched.length === 0 ? (
        <EmptyState
          title="대화가 없습니다"
          description="프로젝트 상세나 지원자 목록에서 '메시지'를 눌러 대화를 시작할 수 있습니다."
          action={
            <Link href="/projects" className="btn-primary">
              프로젝트 탐색
            </Link>
          }
        />
      ) : (
        <div className="card divide-y divide-gray-100">
          {enriched.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-gray-50"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">
                {c.otherName.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-gray-800">
                    {c.otherName}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {relativeTime(c.lastAt)}
                  </span>
                </div>
                <p className="truncate text-xs text-gray-400">{c.projectTitle}</p>
                <p className="truncate text-sm text-gray-500">{c.lastContent}</p>
              </div>
              {c.unread > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {c.unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
