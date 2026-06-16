import Link from "next/link";
import { StatusBadge, Tag } from "./ui";
import { Icon } from "./Icon";
import { formatKRW, daysLeft } from "@/lib/format";
import { parseArray } from "@/lib/json";
import { TRADING_STATUSES } from "@/lib/constants";

type ProjectCardProps = {
  project: {
    id: string;
    title: string;
    description: string;
    category: string;
    budget: number;
    status: string;
    requiredSkills: string;
    recruitEndDate: Date | null;
    client?: { name: string } | null;
  };
  applicantCount?: number;
};

export function ProjectCard({ project, applicantCount }: ProjectCardProps) {
  const skills = parseArray(project.requiredSkills).slice(0, 4);
  const displayStatus = TRADING_STATUSES.includes(
    project.status as (typeof TRADING_STATUSES)[number]
  )
    ? "CLOSED"
    : project.status;
  const dleft = daysLeft(project.recruitEndDate);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="card card-hover flex h-full flex-col gap-3 p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <Tag>{project.category}</Tag>
        <StatusBadge status={displayStatus} />
      </div>
      <h3 className="line-clamp-2 text-base font-bold leading-snug text-gray-900">
        {project.title}
      </h3>
      <p className="line-clamp-2 text-sm leading-relaxed text-gray-500">
        {project.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((s) => (
          <Tag key={s}>{s}</Tag>
        ))}
      </div>
      <div className="mt-auto flex items-end justify-between border-t border-gray-100 pt-3">
        <div>
          {project.budget > 0 ? (
            <>
              <p className="text-[11px] text-gray-400">희망 예산</p>
              <p className="flex items-center gap-1 text-base font-bold text-brand-600">
                <Icon name="won" className="h-4 w-4" />
                {formatKRW(project.budget)}
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] text-gray-400">비용</p>
              <p className="flex items-center gap-1 text-sm font-bold text-brand-600">
                <Icon name="won" className="h-4 w-4" />
                견적 받는 중
              </p>
            </>
          )}
        </div>
        <div className="space-y-0.5 text-right text-xs text-gray-400">
          {project.client && <p>{project.client.name}</p>}
          {applicantCount != null && (
            <p className="flex items-center justify-end gap-1">
              <Icon name="users" className="h-3.5 w-3.5" />
              입찰 {applicantCount}
            </p>
          )}
          {displayStatus === "OPEN" && dleft != null && dleft >= 0 && (
            <p className="flex items-center justify-end gap-1 font-medium text-amber-600">
              <Icon name="clock" className="h-3.5 w-3.5" />
              {dleft === 0 ? "오늘 마감" : `${dleft}일 남음`}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
