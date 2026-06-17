"use client";

import { useState } from "react";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";
import { formatKRW } from "@/lib/format";

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

// 토스 결제창을 열어 결제를 요청한다. 성공 시 /payments/success 로 리다이렉트되어
// 서버에서 최종 승인(confirm)된다. 키가 없으면 이 컴포넌트는 렌더되지 않는다.
export function TossPayButton({
  milestoneId,
  amount,
  orderName,
  contractId,
}: {
  milestoneId: string;
  amount: number;
  orderName: string;
  contractId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function pay() {
    if (!CLIENT_KEY) return;
    setLoading(true);
    setErr("");
    try {
      const toss = await loadTossPayments(CLIENT_KEY);
      const payment = toss.payment({ customerKey: ANONYMOUS });
      const origin = window.location.origin;
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: amount },
        orderId: `ms_${milestoneId}_${Date.now()}`,
        orderName: orderName.slice(0, 90),
        successUrl: `${origin}/payments/success?contractId=${contractId}`,
        failUrl: `${origin}/payments/fail?contractId=${contractId}`,
      });
      // requestPayment 는 결제창으로 이동하므로 이 아래는 보통 실행되지 않는다.
    } catch (e) {
      // 사용자가 결제창을 닫은 경우(USER_CANCEL)는 오류로 표시하지 않는다.
      const code = (e as { code?: string })?.code;
      if (code !== "USER_CANCEL") {
        setErr("결제를 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      }
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={pay} disabled={loading} className="btn-primary w-full">
        {loading ? "결제창 여는 중..." : `${formatKRW(amount)} 에스크로 결제하기`}
      </button>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
