import { NextRequest } from "next/server";
import { fail } from "./api";

// 간단한 고정 윈도우 rate limiter.
// 주의: 인스턴스(서버) 단위 메모리 기반이라, 서버리스에서 인스턴스가 여러 개면
// 완벽하지 않다. 무차별 대입/스팸/비용 폭탄을 '크게 줄이는' 1차 방어용이며,
// 대규모 운영 시에는 Upstash Redis 등 공유 저장소 기반으로 교체 권장.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  // 가끔(1분마다) 만료된 항목 정리해 메모리 누수 방지
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * 요청을 제한한다. 한도 초과 시 429 응답(fail)을 반환하고, 통과면 null을 반환한다.
 * @param req 요청
 * @param name 버킷 구분용 이름(엔드포인트별로 다르게)
 * @param limit 윈도우당 허용 횟수
 * @param windowMs 윈도우 길이(ms)
 */
export function checkRateLimit(
  req: NextRequest,
  name: string,
  limit: number,
  windowMs: number
): ReturnType<typeof fail> | null {
  const now = Date.now();
  sweep(now);
  const key = `${name}:${getClientIp(req)}`;
  const b = buckets.get(key);

  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (b.count >= limit) {
    const retryAfter = Math.ceil((b.resetAt - now) / 1000);
    return fail(
      `요청이 너무 많습니다. ${retryAfter}초 후 다시 시도해 주세요.`,
      429,
      { retryAfter }
    );
  }
  b.count++;
  return null;
}
