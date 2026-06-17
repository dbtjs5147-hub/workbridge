"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui";
import { formatKRW } from "@/lib/format";
import { CONTRACT_STATUS, MILESTONE_STATUS } from "@/lib/constants";
import { FileUploader } from "@/components/FileUploader";
import { Attachments } from "@/components/Attachments";
import { TossPayButton } from "@/components/TossPayButton";

const TOSS_ENABLED = !!process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

type Milestone = {
  id: string;
  title: string;
  amount: number;
  status: string;
  order: number;
  deliverables: string[];
  acceptanceCriteria: string[];
  settlement: { platformFee: number; freelancerPayoutAmount: number } | null;
  delivery: {
    description: string;
    deliveryUrl: string | null;
    status: string;
    revisionNote: string | null;
    attachmentUrls: string[];
  } | null;
};

export function ContractFlow({
  contractId,
  contractStatus,
  isClient,
  isFreelancer,
  mySigned,
  milestones,
}: {
  contractId: string;
  contractStatus: string;
  projectStatus: string;
  isClient: boolean;
  isFreelancer: boolean;
  mySigned: boolean;
  milestones: Milestone[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  // 납품/수정요청 모달
  const [deliverFor, setDeliverFor] = useState<string | null>(null);
  const [revisionFor, setRevisionFor] = useState<string | null>(null);
  const [deliverForm, setDeliverForm] = useState<{
    description: string;
    deliveryUrl: string;
    attachmentUrls: string[];
  }>({ description: "", deliveryUrl: "", attachmentUrls: [] });
  const [revisionReason, setRevisionReason] = useState("");

  async function call(url: string, body?: object, key?: string) {
    setBusy(key ?? url);
    setError("");
    const res = await fetch(url, {
      method: "POST",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    setBusy("");
    if (!data.ok) {
      setError(data.error);
      return false;
    }
    router.refresh();
    return true;
  }

  const signed = contractStatus === CONTRACT_STATUS.SIGNED;
  const canSign = contractStatus === CONTRACT_STATUS.WAITING_SIGNATURE && !mySigned;

  return (
    <div className="card space-y-4 p-6">
      <p className="text-sm font-bold text-gray-800">거래 진행</p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* 서명 */}
      {!signed && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
          {canSign ? (
            <>
              <p className="text-sm text-gray-700">
                본인은 위 계약 내용, 납품 범위, 제외 범위, 마일스톤, 검수 기준,
                지급 조건을 확인했으며 WorkBridge MVP의 전자 서명 방식에
                동의합니다.
              </p>
              <button
                onClick={() => call(`/api/contracts/${contractId}/sign`, undefined, "sign")}
                disabled={!!busy}
                className="btn-primary mt-3"
              >
                {busy === "sign" ? "서명 중..." : "✓ 동의하고 전자 서명"}
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              내 서명은 완료되었습니다. 상대방 서명을 기다리고 있습니다.
            </p>
          )}
        </div>
      )}

      {/* 마일스톤 */}
      <div className="space-y-3">
        {milestones.map((m) => (
          <div key={m.id} className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800">
                {m.order + 1}. {m.title}
              </span>
              <div className="flex items-center gap-2">
                <StatusBadge status={m.status} />
                <span className="text-sm font-bold text-brand-600">
                  {formatKRW(m.amount)}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              납품물: {m.deliverables.join(", ")}
            </p>
            <p className="text-xs text-gray-500">
              검수 기준: {m.acceptanceCriteria.join(" / ")}
            </p>

            {/* 납품 내용 표시 */}
            {m.delivery && (
              <div className="mt-2 rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600">
                <p className="font-semibold text-gray-700">제출된 납품물</p>
                <p>{m.delivery.description}</p>
                {m.delivery.deliveryUrl && (
                  <a
                    href={m.delivery.deliveryUrl}
                    target="_blank"
                    className="text-brand-600 hover:underline"
                  >
                    {m.delivery.deliveryUrl}
                  </a>
                )}
                {m.delivery.attachmentUrls.length > 0 && (
                  <div className="mt-2">
                    <Attachments urls={m.delivery.attachmentUrls} size={72} />
                  </div>
                )}
                {m.delivery.revisionNote && (
                  <p className="mt-1 text-orange-600">
                    수정 요청: {m.delivery.revisionNote}
                  </p>
                )}
              </div>
            )}

            {/* 정산 표시 */}
            {m.settlement && (
              <div className="mt-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700">
                정산 완료 · 프리랜서 지급{" "}
                <b>{formatKRW(m.settlement.freelancerPayoutAmount)}</b> (수수료{" "}
                {formatKRW(m.settlement.platformFee)} 차감)
              </div>
            )}

            {/* 액션 */}
            {signed && (
              <div className="mt-3">
                {m.status === MILESTONE_STATUS.PAYMENT_PENDING && isClient &&
                  (TOSS_ENABLED ? (
                    <TossPayButton
                      milestoneId={m.id}
                      amount={m.amount}
                      orderName={`${m.order + 1}. ${m.title}`}
                      contractId={contractId}
                    />
                  ) : (
                    <button
                      onClick={() => call(`/api/milestones/${m.id}/pay`, undefined, `pay-${m.id}`)}
                      disabled={!!busy}
                      className="btn-primary w-full"
                    >
                      {busy === `pay-${m.id}`
                        ? "결제 중..."
                        : `${formatKRW(m.amount)} 에스크로 결제하기 (sandbox)`}
                    </button>
                  ))}
                {m.status === MILESTONE_STATUS.PAYMENT_PENDING && isFreelancer && (
                  <p className="text-center text-sm text-gray-400">
                    의뢰인의 결제를 기다리고 있습니다.
                  </p>
                )}
                {m.status === MILESTONE_STATUS.IN_PROGRESS && isFreelancer && (
                  <button
                    onClick={() => setDeliverFor(m.id)}
                    className="btn-primary w-full"
                  >
                    납품 요청하기
                  </button>
                )}
                {m.status === MILESTONE_STATUS.IN_PROGRESS && isClient && (
                  <p className="text-center text-sm text-gray-400">
                    프리랜서가 작업 중입니다.
                  </p>
                )}
                {m.status === MILESTONE_STATUS.DELIVERY_REQUESTED && isClient && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => call(`/api/milestones/${m.id}/approve`, undefined, `app-${m.id}`)}
                      disabled={!!busy}
                      className="btn-primary flex-1"
                    >
                      {busy === `app-${m.id}` ? "처리 중..." : "승인 (정산 처리)"}
                    </button>
                    <button
                      onClick={() => setRevisionFor(m.id)}
                      className="btn-danger"
                    >
                      수정 요청
                    </button>
                  </div>
                )}
                {m.status === MILESTONE_STATUS.DELIVERY_REQUESTED && isFreelancer && (
                  <p className="text-center text-sm text-gray-400">
                    의뢰인의 검수를 기다리고 있습니다.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 납품 모달 */}
      {deliverFor && (
        <Modal title="납품 요청" onClose={() => setDeliverFor(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">결과물 설명 *</label>
              <textarea
                className="input min-h-[80px]"
                value={deliverForm.description}
                onChange={(e) =>
                  setDeliverForm({ ...deliverForm, description: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">결과물/배포 URL</label>
              <input
                className="input"
                placeholder="https://..."
                value={deliverForm.deliveryUrl}
                onChange={(e) =>
                  setDeliverForm({ ...deliverForm, deliveryUrl: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">결과물 첨부 (이미지/PDF)</label>
              <FileUploader
                value={deliverForm.attachmentUrls}
                onChange={(urls) =>
                  setDeliverForm({ ...deliverForm, attachmentUrls: urls })
                }
                max={8}
              />
            </div>
            <button
              onClick={async () => {
                const okRes = await call(
                  `/api/milestones/${deliverFor}/delivery-request`,
                  deliverForm,
                  "deliver"
                );
                if (okRes) {
                  setDeliverFor(null);
                  setDeliverForm({
                    description: "",
                    deliveryUrl: "",
                    attachmentUrls: [],
                  });
                }
              }}
              disabled={busy === "deliver"}
              className="btn-primary w-full"
            >
              {busy === "deliver" ? "제출 중..." : "납품 제출"}
            </button>
          </div>
        </Modal>
      )}

      {/* 수정 요청 모달 */}
      {revisionFor && (
        <Modal title="수정 요청" onClose={() => setRevisionFor(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">수정 요청 사유 *</label>
              <textarea
                className="input min-h-[80px]"
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
              />
            </div>
            <button
              onClick={async () => {
                const okRes = await call(
                  `/api/milestones/${revisionFor}/revision-request`,
                  { reason: revisionReason },
                  "revision"
                );
                if (okRes) {
                  setRevisionFor(null);
                  setRevisionReason("");
                }
              }}
              disabled={busy === "revision"}
              className="btn-primary w-full"
            >
              {busy === "revision" ? "전송 중..." : "수정 요청 보내기"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
