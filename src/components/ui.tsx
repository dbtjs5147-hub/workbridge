import Link from "next/link";
import type { ReactNode } from "react";
import {
  PROJECT_STATUS_LABEL,
  APPLICATION_STATUS_LABEL,
  MILESTONE_STATUS_LABEL,
  FEATURE_PRIORITY_LABEL,
} from "@/lib/constants";

// 상태별 색상 매핑
const STATUS_COLOR: Record<string, string> = {
  // project / shared
  OPEN: "bg-green-100 text-green-700",
  UPCOMING: "bg-amber-100 text-amber-700",
  DRAFT: "bg-gray-100 text-gray-600",
  AI_ANALYZED: "bg-brand-100 text-brand-700",
  CLOSED: "bg-gray-200 text-gray-600",
  CONTRACT_PENDING: "bg-purple-100 text-purple-700",
  SIGNATURE_PENDING: "bg-purple-100 text-purple-700",
  PAYMENT_PENDING: "bg-orange-100 text-orange-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-red-100 text-red-600",
  // application
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-600",
  AUTO_REJECTED: "bg-gray-200 text-gray-600",
  WITHDRAWN: "bg-gray-100 text-gray-500",
  // milestone
  PAID_ESCROW: "bg-green-100 text-green-700",
  DELIVERY_REQUESTED: "bg-blue-100 text-blue-700",
  REVISION_REQUESTED: "bg-orange-100 text-orange-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  SETTLED: "bg-emerald-100 text-emerald-700",
  // priority
  MVP_REQUIRED: "bg-brand-100 text-brand-700",
  OPTIONAL: "bg-amber-100 text-amber-700",
  EXCLUDED: "bg-gray-100 text-gray-500",
};

const ALL_LABELS: Record<string, string> = {
  ...PROJECT_STATUS_LABEL,
  ...APPLICATION_STATUS_LABEL,
  ...MILESTONE_STATUS_LABEL,
  ...FEATURE_PRIORITY_LABEL,
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const color = STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}
    >
      {label ?? ALL_LABELS[status] ?? status}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      {children}
    </span>
  );
}

export function StarRating({
  rating,
  count,
}: {
  rating: number;
  count?: number;
}) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-amber-400">
        {"★".repeat(full)}
        <span className="text-gray-300">{"★".repeat(5 - full)}</span>
      </span>
      <span className="font-semibold text-gray-700">{rating.toFixed(1)}</span>
      {count != null && <span className="text-gray-400">({count})</span>}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-base font-semibold text-gray-700">{title}</p>
      {description && (
        <p className="max-w-md text-sm text-gray-500">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function SectionTitle({
  children,
  desc,
}: {
  children: ReactNode;
  desc?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-bold text-gray-900">{children}</h2>
      {desc && <p className="mt-0.5 text-sm text-gray-500">{desc}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-800">{children}</span>
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const cls =
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
        ? "btn-secondary"
        : "btn-ghost";
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
