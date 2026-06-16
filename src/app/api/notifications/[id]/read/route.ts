import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, ok } from "@/lib/api";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  await prisma.notification.updateMany({
    where: { id, userId: user!.id },
    data: { isRead: true, readAt: new Date() },
  });
  return ok({ success: true });
}
