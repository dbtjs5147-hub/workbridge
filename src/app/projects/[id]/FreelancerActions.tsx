"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APPLICATION_STATUS_LABEL } from "@/lib/constants";
import { StartChatButton } from "@/components/StartChatButton";
import { formatKRW } from "@/lib/format";

export function FreelancerActions({
  projectId,
  canApply,
  initialBookmarked,
  existingApplicationStatus,
  matchedSkills,
  totalRequired,
  budget,
  applicantCount,
  profileComplete,
  profileMissing,
}: {
  projectId: string;
  canApply: boolean;
  initialBookmarked: boolean;
  existingApplicationStatus: string | null;
  matchedSkills: string[];
  totalRequired: number;
  budget: number;
  applicantCount: number;
  profileComplete: boolean;
  profileMissing: string[];
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [showApply, setShowApply] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    coverLetter: "",
    proposedAmount: "",
    proposedDuration: "",
    relatedExperience: "",
    proposalText: "",
  });

  async function toggleBookmark() {
    const method = bookmarked ? "DELETE" : "POST";
    const res = await fetch(`/api/projects/${projectId}/bookmark`, { method });
    if (res.ok) setBookmarked(!bookmarked);
  }

  async function submitApply(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch(`/api/projects/${projectId}/applications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        proposedAmount: Number(form.proposedAmount) || 0,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!data.ok) {
      setError(data.error);
      return;
    }
    setShowApply(false);
    router.push("/my/applications");
    router.refresh();
  }

  return (
    <div className="card space-y-3 p-5">
      {/* 기술 매칭 */}
      {totalRequired > 0 && (
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <span className="text-gray-500">내 기술 일치 </span>
          <span className="font-bold text-brand-600">
            {matchedSkills.length}/{totalRequired}
          </span>
          {matchedSkills.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              {matchedSkills.join(", ")}
            </p>
          )}
        </div>
      )}

      {existingApplicationStatus ? (
        <div className="rounded-lg bg-brand-50 px-3 py-3 text-center text-sm">
          <p className="text-gray-500">지원 상태</p>
          <p className="mt-0.5 font-bold text-brand-700">
            {APPLICATION_STATUS_LABEL[existingApplicationStatus]}
          </p>
        </div>
      ) : !canApply ? (
        <button disabled className="btn-secondary w-full">
          모집이 마감되었습니다
        </button>
      ) : !profileComplete ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
          <p className="font-semibold text-amber-800">
            🔒 입찰하려면 프로필을 먼저 완성해 주세요
          </p>
          <p className="text-xs leading-relaxed text-amber-700">
            의뢰인이 믿고 맡길 수 있도록 다음 항목이 필요합니다:
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-700">
            {profileMissing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <Link href="/my/profile" className="btn-primary mt-1 block w-full text-center">
            프로필 작성하러 가기
          </Link>
        </div>
      ) : (
        <button onClick={() => setShowApply(true)} className="btn-primary w-full">
          이 프로젝트에 지원하기
        </button>
      )}

      <button onClick={toggleBookmark} className="btn-secondary w-full">
        {bookmarked ? "★ 북마크 해제" : "☆ 북마크"}
      </button>

      <StartChatButton projectId={projectId} label="의뢰인에게 문의" />

      {/* 지원 모달 */}
      {showApply && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-gray-900">프로젝트 지원 (입찰)</h3>
            <div className="mt-3 rounded-lg bg-brand-50 px-3 py-2.5 text-xs leading-relaxed text-gray-600">
              {budget > 0 ? (
                <div className="flex justify-between">
                  <span>의뢰인 희망 예산</span>
                  <span className="font-semibold text-gray-800">{formatKRW(budget)}</span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span>의뢰인 희망 예산</span>
                  <span className="font-semibold text-gray-800">미정 (개발자 견적 요청)</span>
                </div>
              )}
              <div className="mt-0.5 flex justify-between">
                <span>현재 입찰 수</span>
                <span className="font-semibold text-gray-800">{applicantCount}건</span>
              </div>
              <p className="mt-1.5 text-[11px] text-brand-700">
                🔒 <b>밀봉 입찰</b>입니다. 내 입찰가는 의뢰인에게만 보이며, 다른 지원자의 견적은
                서로 공개되지 않습니다. 포트폴리오·경력을 근거로 제안가를 직접 정하세요.
              </p>
            </div>
            <form onSubmit={submitApply} className="mt-4 space-y-3">
              <div>
                <label className="label">자기소개 *</label>
                <textarea
                  className="input min-h-[80px]"
                  value={form.coverLetter}
                  onChange={(e) =>
                    setForm({ ...form, coverLetter: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">제안가 / 입찰 (원) *</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="예) 5000000"
                    value={form.proposedAmount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        proposedAmount: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="label">예상 기간 *</label>
                  <input
                    className="input"
                    placeholder="예) 6주"
                    value={form.proposedDuration}
                    onChange={(e) =>
                      setForm({ ...form, proposedDuration: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">관련 경험</label>
                <input
                  className="input"
                  value={form.relatedExperience}
                  onChange={(e) =>
                    setForm({ ...form, relatedExperience: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">제안 내용</label>
                <textarea
                  className="input min-h-[60px]"
                  value={form.proposalText}
                  onChange={(e) =>
                    setForm({ ...form, proposalText: e.target.value })
                  }
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApply(false)}
                  className="btn-secondary flex-1"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? "지원 중..." : "지원서 제출"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
