import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, ok, fail } from "@/lib/api";
import { tossEnabled, confirmTossPayment, markMilestonePaid } from "@/lib/payments";

const schema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().int().positive(),
});

// 토스 결제창에서 성공 리다이렉트로 받은 결과를 '서버에서' 최종 승인한다.
// orderId 형식: ms_<milestoneId>_<timestamp>
export async function POST(req: NextRequest) {
  const { user, error } = await requireRole("CLIENT");
  if (error) return error;
  if (!tossEnabled()) return fail("결제 연동이 설정되지 않았습니다.", 400);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("결제 정보가 올바르지 않습니다.");
  const { paymentKey, orderId, amount } = parsed.data;

  const milestoneId = orderId.split("_")[1];
  if (!milestoneId) return fail("주문 정보가 올바르지 않습니다.");

  // 1) 토스 승인(서버) — 금액·주문이 토스 원장과 일치해야 통과
  const confirmed = await confirmTossPayment({ paymentKey, orderId, amount });
  if (!confirmed.ok) return fail(confirmed.message, 402);

  // 2) 우리 DB 확정 — 소유권·상태·금액(milestone.amount) 재검증 후 마일스톤 진행
  const result = await markMilestonePaid({
    milestoneId,
    clientId: user!.id,
    pgProvider: "toss",
    pgTransactionId: paymentKey,
    expectedAmount: amount,
  });
  if (!result.ok) return fail(result.error, result.status);
  return ok({ success: true });
}
