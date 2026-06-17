"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function SuccessInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<"confirming" | "done" | "error">(
    "confirming"
  );
  const [msg, setMsg] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // 중복 호출 방지
    ran.current = true;

    const paymentKey = sp.get("paymentKey");
    const orderId = sp.get("orderId");
    const amount = Number(sp.get("amount"));
    const contractId = sp.get("contractId");

    if (!paymentKey || !orderId || !amount) {
      setState("error");
      setMsg("결제 정보가 올바르지 않습니다.");
      return;
    }

    fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setState("done");
          setTimeout(
            () => router.push(contractId ? `/contracts/${contractId}` : "/"),
            1500
          );
        } else {
          setState("error");
          setMsg(d.error ?? "결제 확정에 실패했습니다.");
        }
      })
      .catch(() => {
        setState("error");
        setMsg("결제 확정 중 오류가 발생했습니다.");
      });
  }, [sp, router]);

  return (
    <div className="container-page max-w-md">
      <div className="card p-8 text-center">
        {state === "confirming" && (
          <>
            <p className="text-lg font-bold text-gray-900">결제 확인 중…</p>
            <p className="mt-2 text-sm text-gray-500">
              안전하게 결제를 승인하고 있습니다. 창을 닫지 말아 주세요.
            </p>
          </>
        )}
        {state === "done" && (
          <>
            <p className="text-lg font-bold text-emerald-600">
              ✓ 에스크로 결제가 완료되었습니다
            </p>
            <p className="mt-2 text-sm text-gray-500">
              계약 페이지로 이동합니다…
            </p>
          </>
        )}
        {state === "error" && (
          <>
            <p className="text-lg font-bold text-red-600">결제 확정 실패</p>
            <p className="mt-2 text-sm text-gray-600">{msg}</p>
            <Link href="/" className="btn-secondary mt-4 inline-block">
              홈으로
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="container-page max-w-md" />}>
      <SuccessInner />
    </Suspense>
  );
}
