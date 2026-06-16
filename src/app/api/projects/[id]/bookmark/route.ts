import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, fail } from "@/lib/api";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireRole("FREELANCER");
  if (error) return error;
  const { id } = await params;

  await prisma.bookmark.upsert({
    where: { projectId_freelancerId: { projectId: id, freelancerId: user!.id } },
    create: { projectId: id, freelancerId: user!.id },
    update: {},
  });
  return ok({ bookmarked: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireRole("FREELANCER");
  if (error) return error;
  const { id } = await params;

  await prisma.bookmark.deleteMany({
    where: { projectId: id, freelancerId: user!.id },
  });
  return ok({ bookmarked: false });
}
