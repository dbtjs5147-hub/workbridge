export function formatKRW(amount: number | null | undefined): string {
  if (amount == null) return "-";
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function relativeTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day}일 전`;
  return formatDate(d);
}

// AI 견적 등 기준 금액으로부터 "참고 범위"를 계산 (확정 금액이 아님을 강조하기 위함)
export function refRange(base: number): { min: number; max: number } {
  if (!base || base <= 0) return { min: 0, max: 0 };
  const round = (n: number) => Math.round(n / 100000) * 100000;
  return { min: round(base * 0.85), max: round(base * 1.2) };
}

export function formatRange(base: number): string {
  const { min, max } = refRange(base);
  if (max <= 0) return "-";
  return `${formatKRW(min)} ~ ${formatKRW(max)}`;
}

// 기준 대비 증감률 표시 (예: 예산 대비 -10%)
export function deltaPct(value: number, base: number): string {
  if (!base || base <= 0) return "";
  const pct = Math.round(((value - base) / base) * 100);
  if (pct === 0) return "예산과 동일";
  return pct > 0 ? `예산 대비 +${pct}%` : `예산 대비 ${pct}%`;
}

export function daysLeft(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
