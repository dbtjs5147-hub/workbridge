"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function FailInner() {
  const sp = useSearchParams();
  const reason = sp.get("message") ?? "결제가 취소되었거나 실패했습니다.";
  const contractId = sp.get("contractId");

  return (
    <div className="container-page max-w-md">
      <div className="card p-8 text-center">
        <p className="text-lg font-bold text-red-600">결제가 완료되지 않았습니다</p>
        <p className="mt-2 text-sm text-gray-600">{reason}</p>
        <Link
          href={contractId ? `/contracts/${contractId}` : "/"}
          className="btn-secondary mt-4 inline-block"
        >
          계약으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="container-page max-w-md" />}>
      <FailInner />
    </Suspense>
  );
}
