"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

export function StartChatButton({
  projectId,
  freelancerId,
  label = "메시지",
  className = "btn-secondary w-full",
}: {
  projectId: string;
  freelancerId?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId, freelancerId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      setError(data.error);
      return;
    }
    router.push(`/messages/${data.data.id}`);
  }

  return (
    <>
      <button onClick={start} disabled={loading} className={className}>
        <Icon name="message" className="h-4 w-4" />
        {loading ? "여는 중..." : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </>
  );
}
