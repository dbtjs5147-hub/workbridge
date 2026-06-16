"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AnalysisResult } from "@/lib/ai";
import { FEATURE_PRIORITY_LABEL } from "@/lib/constants";
import { Markdown } from "@/components/Markdown";
import { Icon } from "@/components/Icon";

type Step =
  | "input"
  | "analyzing"
  | "questions"
  | "followup"
  | "result";
const TRIAL_KEY = "wb_trial";

export function NewProjectWizard({
  categories,
  trial = false,
}: {
  categories: string[];
  trial?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const analysisEndpoint = trial
    ? "/api/public/analysis"
    : "/api/ai/project-analysis";
  const prdEndpoint = trial ? "/api/public/prd" : "/api/ai/generate-prd";

  const [input, setInput] = useState({
    idea: "",
    category: categories[0],
    budgetRange: "",
    desiredSchedule: "",
    mustHave: "",
  });

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [provider, setProvider] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([]);
  const [followupAnswers, setFollowupAnswers] = useState<string[]>([]);
  const [fetchingFollowup, setFetchingFollowup] = useState(false);
  const [generatingPrd, setGeneratingPrd] = useState(false);
  const [prd, setPrd] = useState("");
  const [edit, setEdit] = useState({
    title: "",
    category: categories[0],
    budget: 0,
    recruitEndDate: "",
    skills: "",
  });

  const followupEndpoint = trial ? "/api/public/followup" : "/api/ai/followup";

  // 1차 질문만 (후속 질문 생성 입력용)
  function initialQaList() {
    if (!analysis) return [];
    return analysis.clarifyingQuestions.map((q, i) => ({
      question: q,
      answer: answers[i] ?? "",
    }));
  }

  // 1차 + 후속 전체 Q&A (PRD 생성 입력용)
  function qaList() {
    return [
      ...initialQaList(),
      ...followupQuestions.map((q, i) => ({
        question: q,
        answer: followupAnswers[i] ?? "",
      })),
    ];
  }

  // 비로그인 체험에서 넘어온 결과가 있으면 복원해 바로 등록 단계로 (가입 → 등록 핸드오프)
  useEffect(() => {
    if (trial) return;
    try {
      const raw = sessionStorage.getItem(TRIAL_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      sessionStorage.removeItem(TRIAL_KEY);
      if (saved.input) setInput(saved.input);
      if (saved.analysis) setAnalysis(saved.analysis);
      if (saved.answers) setAnswers(saved.answers);
      if (saved.followupQuestions) setFollowupQuestions(saved.followupQuestions);
      if (saved.followupAnswers) setFollowupAnswers(saved.followupAnswers);
      if (saved.prd) setPrd(saved.prd);
      if (saved.edit) setEdit(saved.edit);
      if (saved.analysis && saved.prd) setStep("result");
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 체험 → 가입 핸드오프: 결과를 저장하고 회원가입으로 이동
  function goSignupWithResult() {
    try {
      sessionStorage.setItem(
        TRIAL_KEY,
        JSON.stringify({
          input,
          analysis,
          answers,
          followupQuestions,
          followupAnswers,
          prd,
          edit,
        })
      );
    } catch {
      /* ignore */
    }
    router.push("/signup?from=trial");
  }

  async function runAnalysis() {
    if (input.idea.trim().length < 10) {
      setError("프로젝트 설명을 10자 이상 입력해 주세요.");
      return;
    }
    setError("");
    setStep("analyzing");
    const res = await fetch(analysisEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error);
      setStep("input");
      return;
    }
    const result: AnalysisResult = data.data.result;
    setAnalysis(result);
    setProvider(data.data.provider);
    setAnswers(new Array(result.clarifyingQuestions.length).fill(""));
    const defaultEnd = new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .slice(0, 10);
    setEdit({
      title:
        result.projectSummary.split("—")[0].trim().slice(0, 50) ||
        input.idea.slice(0, 30),
      category: input.category,
      budget: 0, // 의뢰인이 선택 입력. 0이면 '견적 받음(미정)'
      recruitEndDate: defaultEnd,
      skills: result.recommendedTechStack.join(", "),
    });
    setStep("questions");
  }

  // 1차 답변 → AI 후속(심화) 질문 요청
  async function fetchFollowups() {
    setError("");
    setFetchingFollowup(true);
    try {
      const res = await fetch(followupEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idea: input.idea,
          analysis,
          answers: initialQaList(),
        }),
      });
      const data = await res.json();
      const qs: string[] = data.ok ? data.data.questions ?? [] : [];
      if (qs.length > 0) {
        setFollowupQuestions(qs);
        setFollowupAnswers(new Array(qs.length).fill(""));
        setStep("followup");
      } else {
        await generatePRD();
      }
    } finally {
      setFetchingFollowup(false);
    }
  }

  async function generatePRD() {
    setError("");
    setGeneratingPrd(true);
    try {
      const res = await fetch(prdEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idea: input.idea,
          title: edit.title,
          analysis,
          answers: qaList(),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error);
        return;
      }
      setPrd(data.data.prd);
      setStep("result");
    } finally {
      setGeneratingPrd(false);
    }
  }

  async function register() {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: edit.title,
        description: input.idea,
        category: edit.category,
        budget: Number(edit.budget) || 0,
        recruitEndDate: edit.recruitEndDate
          ? new Date(edit.recruitEndDate).toISOString()
          : undefined,
        requiredSkills: edit.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        analysis,
        prdDocument: prd,
        clarifyingAnswers: qaList(),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!data.ok) {
      setError(data.error);
      return;
    }
    router.push(`/projects/${data.data.id}`);
    router.refresh();
  }

  // ===== STEP: 입력 =====
  if (step === "input" || step === "analyzing") {
    const analyzing = step === "analyzing";
    return (
      <div className="space-y-6">
        <StepIndicator step={1} />
        <div className="card p-6">
          <h1 className="text-xl font-bold text-gray-900">
            어떤 서비스를 만들고 싶으신가요?
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            완벽하게 정리할 필요 없습니다. 떠오르는 대로 적어주시면 AI가
            기능·견적·일정·마일스톤으로 구조화합니다.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">프로젝트 아이디어 *</label>
              <textarea
                className="input min-h-[120px]"
                placeholder="예) 동네 병원에서 환자가 진료를 온라인으로 예약하고, 관리자는 예약 현황을 관리하는 웹 서비스를 만들고 싶어요."
                value={input.idea}
                onChange={(e) => setInput({ ...input, idea: e.target.value })}
                disabled={analyzing}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">희망 카테고리</label>
                <select
                  className="input"
                  value={input.category}
                  onChange={(e) =>
                    setInput({ ...input, category: e.target.value })
                  }
                  disabled={analyzing}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">예산 범위 (선택)</label>
                <input
                  className="input"
                  placeholder="예) 500만원 내외"
                  value={input.budgetRange}
                  onChange={(e) =>
                    setInput({ ...input, budgetRange: e.target.value })
                  }
                  disabled={analyzing}
                />
              </div>
              <div>
                <label className="label">희망 일정 (선택)</label>
                <input
                  className="input"
                  placeholder="예) 2개월 내"
                  value={input.desiredSchedule}
                  onChange={(e) =>
                    setInput({ ...input, desiredSchedule: e.target.value })
                  }
                  disabled={analyzing}
                />
              </div>
              <div>
                <label className="label">꼭 필요한 기능 (선택)</label>
                <input
                  className="input"
                  placeholder="예) 카카오 알림, 결제"
                  value={input.mustHave}
                  onChange={(e) =>
                    setInput({ ...input, mustHave: e.target.value })
                  }
                  disabled={analyzing}
                />
              </div>
            </div>
          </div>
          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="btn-primary mt-6 w-full py-3 text-base"
          >
            {analyzing ? (
              "AI가 분석 중입니다..."
            ) : (
              <>
                <Icon name="sparkles" className="h-5 w-5" />
                AI 분석 요청하기
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const a = analysis!;
  const mvp = a.features.filter((f) => f.priority === "MVP_REQUIRED");

  // ===== STEP: 분석 검토 + 확인 질문 답변 =====
  if (step === "questions") {
    const generating = fetchingFollowup;
    return (
      <div className="space-y-6">
        <StepIndicator step={2} />

        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            AI 기능 분석·일정은 <b>참고용 가이드</b>입니다. 비용은 개발자가 직접 입찰합니다.
            {provider === "mock" &&
              " (데모 분석 엔진 — 실제 AI 키를 넣으면 자동 전환됩니다)"}
          </span>
        </div>

        {/* 분석 요약 */}
        <div className="card space-y-5 p-6">
          <div>
            <p className="text-xs font-semibold text-brand-600">AI 프로젝트 분석</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">
              {a.projectSummary}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="예상 기간" value={`약 ${a.estimatedDurationWeeks}주`} />
            <Stat label="MVP 핵심 기능" value={`${mvp.length}개`} />
          </div>
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            💡 비용은 AI가 정하지 않습니다. 등록 후 <b>검증된 개발자들이 직접 견적을 제시</b>합니다.
          </p>
          <div>
            <p className="mb-2 text-sm font-bold text-gray-800">기능 분해</p>
            <div className="space-y-2">
              {a.features.map((f, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {f.name}
                      </span>
                      <PriorityBadge priority={f.priority} />
                    </div>
                    <p className="text-xs text-gray-500">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-gray-800">마일스톤</p>
            <div className="space-y-2">
              {a.milestones.map((m, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">
                      {m.title}
                    </span>
                    <span className="text-xs text-gray-400">{i + 1}단계</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    검수 기준: {m.acceptanceCriteria.join(" / ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 확인 질문 답변 */}
        <div className="card space-y-4 p-6">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Icon name="sparkles" className="h-5 w-5 text-brand-600" />
              개발자에게 전달할 PRD를 위해 몇 가지만 확인할게요
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              답변해 주시면 더 정확한 PRD 문서가 만들어집니다. (비워두셔도 됩니다)
            </p>
          </div>

          <div>
            <label className="label">프로젝트 제목</label>
            <input
              className="input"
              value={edit.title}
              onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              disabled={generating}
            />
          </div>

          {a.clarifyingQuestions.map((q, i) => (
            <div key={i}>
              <label className="label">
                Q{i + 1}. {q}
              </label>
              <textarea
                className="input min-h-[60px]"
                placeholder="답변 (선택)"
                value={answers[i] ?? ""}
                onChange={(e) => {
                  const next = [...answers];
                  next[i] = e.target.value;
                  setAnswers(next);
                }}
                disabled={generating}
              />
            </div>
          ))}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("input")}
              disabled={generating}
              className="btn-secondary flex-1"
            >
              ← 다시 분석
            </button>
            <button
              onClick={fetchFollowups}
              disabled={generating}
              className="btn-primary flex-[2] py-3"
            >
              {generating ? (
                "AI가 답변을 검토 중..."
              ) : (
                <>
                  다음
                  <Icon name="arrow-right" className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== STEP: 후속(심화) 질문 =====
  if (step === "followup") {
    return (
      <div className="space-y-6">
        <StepIndicator step={2} />
        <div className="card space-y-4 p-6">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Icon name="sparkles" className="h-5 w-5 text-brand-600" />
              답변을 보고 몇 가지만 더 여쭤볼게요
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              조금만 더 답해주시면 PRD가 훨씬 정확해집니다. (비워두셔도 됩니다)
            </p>
          </div>

          {followupQuestions.map((q, i) => (
            <div key={i}>
              <label className="label">
                Q{i + 1}. {q}
              </label>
              <textarea
                className="input min-h-[60px]"
                placeholder="답변 (선택)"
                value={followupAnswers[i] ?? ""}
                onChange={(e) => {
                  const next = [...followupAnswers];
                  next[i] = e.target.value;
                  setFollowupAnswers(next);
                }}
                disabled={generatingPrd}
              />
            </div>
          ))}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("questions")}
              disabled={generatingPrd}
              className="btn-secondary flex-1"
            >
              ← 이전
            </button>
            <button
              onClick={generatePRD}
              disabled={generatingPrd}
              className="btn-primary flex-[2] py-3"
            >
              {generatingPrd ? (
                "PRD 문서 생성 중..."
              ) : (
                <>
                  <Icon name="document" className="h-5 w-5" />
                  PRD 초안 생성하기
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== STEP: PRD 미리보기 + 등록 =====
  return (
    <div className="space-y-6">
      <StepIndicator step={3} />

      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          PRD 초안이 생성되었습니다. 이 문서는 <b>계약된 개발자에게 전달</b>되어
          의뢰인·개발자 간 이해 차이를 줄여줍니다. 등록 후에도 확인할 수 있습니다.
        </span>
      </div>

      {/* PRD 미리보기 */}
      <div className="card p-6">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
          <Icon name="document" className="h-4 w-4 text-brand-600" />
          PRD 문서 미리보기
        </p>
        <div className="max-h-[480px] overflow-y-auto rounded-lg border border-gray-100 bg-white p-4">
          <Markdown content={prd} />
        </div>
      </div>

      {/* 체험 모드: 가입 유도 CTA */}
      {trial && (
        <div className="card space-y-4 p-6 text-center">
          <h3 className="text-lg font-bold text-gray-900">마음에 드시나요?</h3>
          <p className="mx-auto max-w-md text-sm text-gray-500">
            회원가입하면 이 PRD 그대로 프로젝트를 등록하고, 검증된 개발자의
            지원을 받을 수 있어요. 지금까지 만든 내용은 <b>그대로 이어집니다.</b>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button onClick={goSignupWithResult} className="btn-primary btn-lg">
              회원가입하고 이 PRD로 시작하기
              <Icon name="arrow-right" className="h-4 w-4" />
            </button>
            <Link href="/login?from=trial" className="btn-secondary btn-lg">
              이미 계정이 있어요
            </Link>
          </div>
          <button
            onClick={() => setStep("questions")}
            className="btn-ghost text-sm"
          >
            ← 답변 수정
          </button>
        </div>
      )}

      {/* 등록 정보 보완 (로그인 의뢰인) */}
      {!trial && (
      <div className="card space-y-4 p-6">
        <h3 className="text-base font-bold text-gray-900">등록 정보 보완</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">프로젝트 제목</label>
            <input
              className="input"
              value={edit.title}
              onChange={(e) => setEdit({ ...edit, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">카테고리</label>
            <select
              className="input"
              value={edit.category}
              onChange={(e) => setEdit({ ...edit, category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">희망 예산 (선택)</label>
            <input
              className="input"
              type="number"
              placeholder="비워두면 개발자 견적을 받습니다"
              value={edit.budget || ""}
              onChange={(e) =>
                setEdit({ ...edit, budget: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="label">입찰(견적) 마감일</label>
            <input
              className="input"
              type="date"
              value={edit.recruitEndDate}
              onChange={(e) =>
                setEdit({ ...edit, recruitEndDate: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">필요 기술 (쉼표로 구분)</label>
            <input
              className="input"
              value={edit.skills}
              onChange={(e) => setEdit({ ...edit, skills: e.target.value })}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setStep("questions")}
            className="btn-secondary flex-1"
          >
            ← 답변 수정
          </button>
          <button
            onClick={register}
            disabled={submitting}
            className="btn-primary flex-[2] py-3"
          >
            {submitting ? "등록 중..." : "이대로 프로젝트 등록하기"}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  const steps = ["아이디어 입력", "분석 검토 & 질문 답변", "PRD 확인 & 등록"];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span
            className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
              i + 1 <= step ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500"
            }`}
          >
            {i + 1}
          </span>
          <span
            className={`text-sm ${i + 1 <= step ? "font-semibold text-gray-800" : "text-gray-400"}`}
          >
            {s}
          </span>
          {i < steps.length - 1 && <span className="text-gray-300">›</span>}
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-brand-50 px-4 py-3">
      <p className="text-xs text-brand-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-brand-700">{value}</p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const color =
    priority === "MVP_REQUIRED"
      ? "bg-brand-100 text-brand-700"
      : priority === "OPTIONAL"
        ? "bg-amber-100 text-amber-700"
        : "bg-gray-100 text-gray-500";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${color}`}>
      {FEATURE_PRIORITY_LABEL[priority]}
    </span>
  );
}
