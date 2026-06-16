"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatKRW } from "@/lib/format";

type CR = {
  id: string;
  description: string;
  reason: string;
  additionalBudget: number;
  status: string;
  aiInScope: boolean | null;
  aiOpinion: string | null;
};

export function ChangeRequests({
  contractId,
  isClient,
  isFreelancer,
  requests,
}: {
  contractId: string;
  isClient: boolean;
  isFreelancer: boolean;
  requests: CR[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    description: "",
    reason: "",
    additionalBudget: 0,
    desiredDueDate: "",
  });

  async function submit() {
    if (!form.description.trim()) {
      setError("변경 요청 내용을 입력해 주세요.");
      return;
    }
    setBusy("create");
    setError("");
    const res = await fetch(`/api/contracts/${contractId}/change-requests`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        additionalBudget: Number(form.additionalBudget) || 0,
        desiredDueDate: form.desiredDueDate || undefined,
      }),
    });
    const data = await res.json();
    setBusy("");
    if (!data.ok) {
      setError(data.error);
      return;
    }
    setShowForm(false);
    setForm({ description: "", reason: "", additionalBudget: 0, desiredDueDate: "" });
    router.refresh();
  }

  async function respond(id: string, action: "accept" | "reject") {
    setBusy(`${action}-${id}`);
    setError("");
    const res = await fetch(`/api/change-requests/${id}/${action}`, {
      method: "POST",
    });
    const data = await res.json();
    setBusy("");
    if (!data.ok) {
      setError(data.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-4 p-6">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <Icon name="alert" className="h-4 w-4 text-brand-600" />
          변경 요청
        </p>
        {isClient && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-secondary text-sm"
          >
            <Icon name="plus" className="h-4 w-4" />
            변경 요청 등록
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500">
        계약 범위 밖의 추가·수정이 필요하면 변경 요청을 남기세요. AI가 기존 범위
        포함 여부를 참고로 알려주고, 추가 금액은 별도 마일스톤으로 안전하게
        처리됩니다.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* 등록 폼 */}
      {showForm && isClient && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div>
            <label className="label">변경 요청 내용 *</label>
            <textarea
              className="input min-h-[70px]"
              placeholder="예) 예약 완료 시 카카오 알림톡도 보내고 싶어요"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">추가 예산 (원, 선택)</label>
              <input
                className="input"
                type="number"
                value={form.additionalBudget}
                onChange={(e) =>
                  setForm({ ...form, additionalBudget: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="label">희망 일정 (선택)</label>
              <input
                className="input"
                type="date"
                value={form.desiredDueDate}
                onChange={(e) =>
                  setForm({ ...form, desiredDueDate: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="label">사유 (선택)</label>
            <input
              className="input"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
          <button
            onClick={submit}
            disabled={busy === "create"}
            className="btn-primary w-full"
          >
            {busy === "create" ? "등록 중 (AI 판단)..." : "변경 요청 보내기"}
          </button>
        </div>
      )}

      {/* 목록 */}
      {requests.length === 0 ? (
        <p className="text-sm text-gray-400">등록된 변경 요청이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((cr) => (
            <div key={cr.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800">
                  {cr.description}
                </p>
                <StatusBadge status={cr.status} />
              </div>
              {cr.reason && (
                <p className="mt-1 text-xs text-gray-500">사유: {cr.reason}</p>
              )}
              {cr.additionalBudget > 0 && (
                <p className="mt-1 text-xs font-medium text-gray-600">
                  추가 예산 제안: {formatKRW(cr.additionalBudget)}
                </p>
              )}
              {cr.aiOpinion && (
                <div
                  className={`mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                    cr.aiInScope
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <Icon name="sparkles" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <b>{cr.aiInScope ? "기존 범위 포함 가능" : "추가 작업으로 판단"}</b>{" "}
                    · {cr.aiOpinion}
                  </span>
                </div>
              )}
              {isFreelancer && cr.status === "PENDING" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => respond(cr.id, "accept")}
                    disabled={!!busy}
                    className="btn-primary flex-1"
                  >
                    {busy === `accept-${cr.id}` ? "처리 중..." : "수락"}
                  </button>
                  <button
                    onClick={() => respond(cr.id, "reject")}
                    disabled={!!busy}
                    className="btn-danger"
                  >
                    거절
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
