import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { NotificationList } from "./NotificationList";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="container-page max-w-2xl">
      <PageHeader title="알림" />
      {notifications.length === 0 ? (
        <EmptyState title="알림이 없습니다" />
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </div>
  );
}
