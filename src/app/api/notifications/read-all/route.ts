import { prisma } from "@/lib/prisma";
import { requireUser, ok } from "@/lib/api";

export async function POST() {
  const { user, error } = await requireUser();
  if (error) return error;
  await prisma.notification.updateMany({
    where: { userId: user!.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return ok({ success: true });
}
