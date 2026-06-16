"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApplicantActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function act(action: "accept" | "reject") {
    setLoading(action);
    setError("");
    const res = await fetch(`/api/applications/${applicationId}/${action}`, {
      method: "POST",
    });
    const data = await res.json();
    setLoading("");
    if (!data.ok) {
      setError(data.error);
      return;
    }
    if (action === "accept" && data.data.contractId) {
      router.push(`/contracts/${data.data.contractId}`);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => act("accept")}
          disabled={!!loading}
          className="btn-primary flex-1"
        >
          {loading === "accept" ? "처리 중..." : "수락하고 계약 생성"}
        </button>
        <button
          onClick={() => act("reject")}
          disabled={!!loading}
          className="btn-danger"
        >
          거절
        </button>
      </div>
      <p className="text-xs text-gray-400">
        수락 시 다른 대기 지원자는 자동으로 거절됩니다.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
