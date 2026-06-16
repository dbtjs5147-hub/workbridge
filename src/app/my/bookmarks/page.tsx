import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { ProjectCard } from "@/components/ProjectCard";

export default async function MyBookmarksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "FREELANCER") redirect("/");

  const bookmarks = await prisma.bookmark.findMany({
    where: { freelancerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { project: { include: { client: true } } },
  });
  const projects = bookmarks
    .map((b) => b.project)
    .filter((p) => !p.isDeleted);

  return (
    <div className="container-page max-w-4xl">
      <PageHeader title="내 북마크" description="관심 표시한 프로젝트입니다." />
      {projects.length === 0 ? (
        <EmptyState
          title="북마크한 프로젝트가 없습니다"
          action={
            <Link href="/projects" className="btn-primary">
              프로젝트 탐색
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
