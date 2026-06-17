import { NextRequest } from "next/server";
import { requireRole, ok, fail } from "@/lib/api";
import { tossEnabled, markMilestonePaid } from "@/lib/payments";

// 결제 처리.
//  - 토스 연동(TOSS_SECRET_KEY)이 켜져 있으면 이 mock 경로는 막고, 클라이언트는
//    토스 결제창 → /api/payments/confirm 경로로 진행한다(우회 결제 방지).
//  - 키가 없으면(데모) 기존처럼 즉시 결제 완료 처리한다.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireRole("CLIENT");
  if (error) return error;
  const { id } = await params;

  if (tossEnabled()) {
    return fail("실제 결제(토스)로 진행해 주세요.", 400);
  }

  const result = await markMilestonePaid({
    milestoneId: id,
    clientId: user!.id,
    pgProvider: "mock",
    pgTransactionId: `mock_tx_${Date.now()}`,
  });
  if (!result.ok) return fail(result.error, result.status);
  return ok(result.alreadyPaid ? { alreadyPaid: true } : { success: true });
}
