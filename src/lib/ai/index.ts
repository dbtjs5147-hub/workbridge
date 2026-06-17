import {
  AnalysisInput,
  AnalysisResult,
  AnalysisResultSchema,
} from "./schema";
import { generateMockAnalysis, generateMockFollowups } from "./mock";
import { generateMockPRD, type QA } from "./prd";

export * from "./schema";
export type { QA } from "./prd";

// 사용할 Claude 모델 (환경변수로 변경 가능). 키만 넣으면 mock → 실제 AI로 자동 전환.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
// 사용할 Gemini 모델 (기본 gemini-2.5-flash). AI_PROVIDER="gemini" + GEMINI_API_KEY 설정 시 사용.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const SYSTEM_PROMPT = `너는 한국 개발 외주 시장을 깊이 아는 15년차 시니어 프로덕트 매니저 겸 테크리드다.
개발을 모르는 의뢰인의 모호한 설명을, 개발자가 바로 착수할 수 있는 구조화된 명세로 바꾸는 것이 너의 일이다.

[분석 원칙]
1. MVP 원칙 — 초기 출시에 '정말로' 필요한 것만 MVP_REQUIRED로. 있으면 좋은 기능은 OPTIONAL, 초기에 불필요하면 EXCLUDED로 과감히 분리한다. 기능을 부풀리지 마라(스코프 비대화는 외주 실패의 주원인).
2. 기능 분해 — 보통 5~9개로 나눈다. 각 기능은 무엇을 하는지 한 문장으로 명확히. 모호한 기능명 금지.
3. 견적(estimatedCost, KRW 정수) — 한국 프리랜서 시장 기준으로 현실적으로. 난이도, 작업량, 인증/권한, 외부 연동(결제·알림·지도·소셜 등), 관리자 화면, 데이터 모델 복잡도, 디자인 제공 여부를 종합 고려하고, 그 근거를 rationale에 반드시 적는다.
   참고 앵커(규모에 맞게 조정): 단순 CRUD 화면 50~100만 / 인증·권한 60~120만 / 결제·외부연동 120~250만 / 관리자 대시보드 100~200만 / AI·추천 150~300만.
4. 일정(estimatedDurationWeeks) — 1인 개발 기준 현실적으로. MVP는 보통 4~10주.
5. 마일스톤 — 2~4개. 의존성 순서대로(인증·기반 → 핵심 기능 → 마무리·배포). 각 acceptanceCriteria(검수 기준)는 '측정·검증 가능한' 문장으로 쓴다(예: "환자와 관리자가 각각 로그인할 수 있어야 한다"). 모호한 표현 금지. milestones의 amount 합계는 estimatedTotalCost와 정확히 일치해야 한다.
6. clarifyingQuestions(확인 질문) — 의뢰인이 빠뜨렸을 법한 '가장 영향이 큰' 모호함만 3~5개. 사용자 유형, 핵심 기능 우선순위, 필요한 데이터/외부 연동, 디자인 제공 여부, 규모/트래픽, 예산·일정 제약 중 이 아이디어에 특히 중요한 것을 골라 구체적으로 묻는다. 뻔하고 일반적인 질문은 금지.
7. risks — 이 프로젝트에 실제로 있을 법한 리스크만 구체적으로.
8. 추측이 필요하면 합리적 가정을 하되, 그 가정을 rationale이나 clarifyingQuestions에 드러낸다. 모든 텍스트는 자연스러운 한국어로.

[출력 형식] 설명/마크다운 없이 아래 JSON만 순수하게 출력한다.
{
  "projectSummary": string,
  "userTypes": string[],
  "features": [{ "name": string, "description": string, "priority": "MVP_REQUIRED"|"OPTIONAL"|"EXCLUDED", "estimatedCost": number, "rationale": string }],
  "optionalFeatures": [{ "name": string, "reason": string }],
  "excludedScope": string[],
  "recommendedTechStack": string[],
  "estimatedTotalCost": number,
  "estimatedDurationWeeks": number,
  "milestones": [{ "title": string, "deliverables": string[], "acceptanceCriteria": string[], "amount": number }],
  "risks": string[],
  "clarifyingQuestions": string[],
  "contractScopeDraft": string
}

[좋은 출력 예시] (의뢰: "동네 병원 온라인 예약 웹앱")
{
  "projectSummary": "동네 병원을 위한 온라인 예약 웹앱 MVP. 환자가 진료를 예약하고 병원 관리자가 예약을 관리한다.",
  "userTypes": ["환자", "병원 관리자"],
  "features": [
    { "name": "회원가입 및 로그인", "description": "환자·관리자가 이메일로 가입/로그인하고 역할에 따라 접근이 분기된다", "priority": "MVP_REQUIRED", "estimatedCost": 800000, "rationale": "인증·권한 분기·기본 보안 처리 필요" },
    { "name": "진료 예약 등록/조회", "description": "환자가 날짜·시간을 선택해 예약하고 본인 예약을 조회한다", "priority": "MVP_REQUIRED", "estimatedCost": 1500000, "rationale": "예약 슬롯 관리·중복 방지·캘린더 UI 필요" },
    { "name": "관리자 예약 관리", "description": "관리자가 들어온 예약을 확인·확정·취소한다", "priority": "MVP_REQUIRED", "estimatedCost": 1200000, "rationale": "운영자 대시보드와 권한 분리 필요" },
    { "name": "카카오 알림톡 연동", "description": "예약 확정 시 환자에게 알림 발송", "priority": "OPTIONAL", "estimatedCost": 0, "rationale": "MVP 이후 알림 고도화로 분리 가능" }
  ],
  "optionalFeatures": [{ "name": "카카오 알림톡 연동", "reason": "MVP 이후 도입해도 무방" }],
  "excludedScope": ["실시간 화상 진료", "보험 청구 연동"],
  "recommendedTechStack": ["Next.js", "TypeScript", "Node.js", "PostgreSQL"],
  "estimatedTotalCost": 3500000,
  "estimatedDurationWeeks": 6,
  "milestones": [
    { "title": "1차: 인증·기본 구조", "deliverables": ["회원가입/로그인", "역할별 접근 분기"], "acceptanceCriteria": ["환자와 관리자가 각각 로그인할 수 있어야 한다", "권한에 따라 접근 가능한 화면이 구분되어야 한다"], "amount": 800000 },
    { "title": "2차: 예약 핵심", "deliverables": ["예약 등록/조회", "관리자 예약 관리"], "acceptanceCriteria": ["환자가 빈 시간에만 예약할 수 있어야 한다", "관리자가 예약을 확정/취소할 수 있어야 한다"], "amount": 2700000 }
  ],
  "risks": ["예약 취소·노쇼 정책이 복잡해지면 일정이 늘 수 있음", "디자인 시안 미제공 시 UI 작업량 증가"],
  "clarifyingQuestions": ["예약 취소는 언제까지 가능하게 할까요? (예: 1시간 전까지)", "관리자는 병원당 한 명인가요, 여러 명인가요?", "디자인 시안을 제공하시나요, 기본 디자인으로 진행할까요?"],
  "contractScopeDraft": "본 계약의 납품 범위는 회원가입/로그인, 예약 등록·조회, 관리자 예약 관리, 기본 배포를 포함한다. 실시간 화상 진료·보험 청구 연동은 제외한다."
}`;

function buildUserPrompt(input: AnalysisInput): string {
  return [
    `프로젝트 아이디어: ${input.idea}`,
    input.category && `희망 카테고리: ${input.category}`,
    input.desiredSchedule && `희망 일정: ${input.desiredSchedule}`,
    input.budgetRange && `예산 범위: ${input.budgetRange}`,
    input.mustHave && `필수 요구사항: ${input.mustHave}`,
    input.referenceUrl && `참고 서비스: ${input.referenceUrl}`,
    input.platform && `원하는 플랫폼: ${input.platform}`,
    input.constraints && `추가 제약사항: ${input.constraints}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJson(text: string): unknown {
  // 코드블록/잡텍스트가 섞여도 첫 { 부터 마지막 } 까지 추출
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("JSON 영역을 찾지 못함");
  return JSON.parse(text.slice(start, end + 1));
}

async function callAnthropic(input: AnalysisInput): Promise<unknown> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API 오류: ${res.status}`);
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? "";
  return extractJson(text);
}

async function callOpenAI(input: AnalysisInput): Promise<unknown> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API 오류: ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return extractJson(text);
}

// Gemini 저수준 호출 (system + user → 텍스트). jsonMode면 JSON 출력 모드로 요청.
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
async function callGemini(
  system: string,
  user: string,
  jsonMode: boolean
): Promise<string> {
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      maxOutputTokens: 8192,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  });
  // 일시적 오류(429 한도/5xx 과부하)는 지수 백오프로 재시도. 그 외는 즉시 실패.
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
      },
      body,
    });
    if (res.ok) {
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      const text = parts.map((p: { text?: string }) => p?.text ?? "").join("");
      if (!text.trim()) throw new Error("Gemini 빈 응답");
      return text;
    }
    lastStatus = res.status;
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    break; // 400 등 영구 오류는 재시도 무의미
  }
  throw new Error(`Gemini API 오류: ${lastStatus}`);
}

async function callGeminiAnalysis(input: AnalysisInput): Promise<unknown> {
  const text = await callGemini(SYSTEM_PROMPT, buildUserPrompt(input), true);
  return extractJson(text);
}

// 마일스톤 합계 보정 (검수 기준: 합계 = 총견적)
function reconcile(result: AnalysisResult): AnalysisResult {
  const milestoneSum = result.milestones.reduce((s, m) => s + m.amount, 0);
  if (milestoneSum !== result.estimatedTotalCost && result.milestones.length > 0) {
    const diff = result.estimatedTotalCost - milestoneSum;
    result.milestones[result.milestones.length - 1].amount += diff;
  }
  return result;
}

export type AnalysisOutcome = {
  result: AnalysisResult;
  provider: string;
  usedFallback: boolean;
};

export async function analyzeProject(
  input: AnalysisInput
): Promise<AnalysisOutcome> {
  const provider = process.env.AI_PROVIDER ?? "mock";

  // 실제 LLM 사용 시도 → 실패하면 mock으로 안전 폴백 (RFP: fallback 메시지/재시도)
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    try {
      const raw = await callAnthropic(input);
      const result = reconcile(AnalysisResultSchema.parse(raw));
      return { result, provider: "anthropic", usedFallback: false };
    } catch (e) {
      console.error("[AI] Anthropic 실패, mock으로 폴백:", e);
    }
  }
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    try {
      const raw = await callOpenAI(input);
      const result = reconcile(AnalysisResultSchema.parse(raw));
      return { result, provider: "openai", usedFallback: false };
    } catch (e) {
      console.error("[AI] OpenAI 실패, mock으로 폴백:", e);
    }
  }
  if (provider === "gemini" && process.env.GEMINI_API_KEY) {
    try {
      const raw = await callGeminiAnalysis(input);
      const result = reconcile(AnalysisResultSchema.parse(raw));
      return { result, provider: "gemini", usedFallback: false };
    } catch (e) {
      console.error("[AI] Gemini 실패, mock으로 폴백:", e);
    }
  }

  // mock (키 없거나 폴백)
  const result = reconcile(generateMockAnalysis(input));
  return {
    result,
    provider: "mock",
    usedFallback: provider !== "mock",
  };
}

// ============================================================
// PRD 문서 생성 (아이디어 + AI 분석 + 의뢰인 확인 답변 → 마크다운 PRD)
// ============================================================
const PRD_SYSTEM_PROMPT = `너는 한국 개발 외주 시장을 깊이 아는 15년차 시니어 PM이다. 주어진 정보로 '개발자가 바로 착수할 수 있는' PRD(제품 요구사항 정의서)를 한국어 마크다운으로 작성한다.

[작성 원칙]
- 다음 순서의 섹션을 포함한다: 1) 개요 2) 목표·핵심 가치 3) 사용자 유형 4) 핵심 기능 명세(기능별 설명·우선순위·수용 기준) 5) 화면/주요 플로우 6) 비기능 요구사항(성능·보안·반응형) 7) 마일스톤 및 검수 기준 8) 일정(참고용임을 명시) 9) 리스크 10) 제외 범위 11) 계약 범위 초안.
- 개발자가 해석의 여지 없이 구현할 수 있도록 구체적으로 쓴다. 수용 기준은 '측정·검증 가능한' 문장으로(모호한 표현 금지).
- 의뢰인의 확인 답변(Q&A)이 주어지면 반드시 본문 곳곳에 반영하고, 답변으로 해소된 가정은 본문에 명시한다.
- 일정은 확정이 아니라 참고용임을 분명히 적는다. **비용·금액은 본 문서에 적지 않는다** — 가격은 플랫폼이 정하지 않으며 검증된 개발자가 직접 입찰(밀봉)로 제시한다.
- 제목(##)·목록·굵게를 활용해 가독성을 높인다. 과장 없이 실무적으로 작성한다.`;

async function callAnthropicPRD(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      system: PRD_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic PRD 오류: ${res.status}`);
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

async function callGeminiText(prompt: string): Promise<string> {
  return callGemini(PRD_SYSTEM_PROMPT, prompt, false);
}

async function callOpenAIText(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: PRD_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI PRD 오류: ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// 텍스트(마크다운/JSON) 생성용 공급자 라우팅. 설정된 provider로 호출하고,
// 키가 없으면 null을 반환해 호출부에서 mock으로 폴백하게 한다.
async function callProviderText(
  prompt: string
): Promise<{ text: string; provider: string } | null> {
  const provider = process.env.AI_PROVIDER ?? "mock";
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY)
    return { text: await callAnthropicPRD(prompt), provider: "anthropic" };
  if (provider === "gemini" && process.env.GEMINI_API_KEY)
    return { text: await callGeminiText(prompt), provider: "gemini" };
  if (provider === "openai" && process.env.OPENAI_API_KEY)
    return { text: await callOpenAIText(prompt), provider: "openai" };
  return null;
}

// ============================================================
// 변경 요청 범위 판단 (계약 범위 vs 요청 내용 → 참고 의견)
// ============================================================
function mockAssessChange(
  contractScope: string,
  description: string
): { inScope: boolean; opinion: string } {
  const scope = (contractScope ?? "").toLowerCase();
  const words = description
    .toLowerCase()
    .split(/[\s,./]+/)
    .filter((w) => w.length >= 2);
  const overlap = words.filter((w) => scope.includes(w)).length;
  const ratio = words.length ? overlap / words.length : 0;
  const newKeywords = ["추가", "신규", "새로", "연동", "결제", "알림", "확장", "고도화", "다른"];
  const hasNew = newKeywords.some((k) => description.includes(k));
  const inScope = ratio >= 0.4 && !hasNew;
  const opinion = inScope
    ? "요청 내용이 기존 계약 납품 범위와 상당 부분 겹칩니다. 기존 범위 내 조정으로 처리 가능할 수 있으니 세부 사항을 협의해 보세요. (AI 참고 의견)"
    : "요청 내용은 기존 계약 범위를 벗어난 추가 작업으로 보입니다. 추가 금액·일정을 별도 마일스톤으로 협의하는 것을 권장합니다. (AI 참고 의견)";
  return { inScope, opinion };
}

export async function assessChangeRequest(input: {
  contractScope: string;
  description: string;
  reason?: string;
}): Promise<{ inScope: boolean; opinion: string }> {
  try {
    const prompt = [
      `너는 개발 외주 계약 분쟁을 중재하는 시니어 PM이다. 아래 변경 요청이 '기존 계약 납품 범위'에 이미 포함되는지(=무상 처리 대상), 아니면 추가 작업(=별도 견적·일정 협의 대상)인지 판단하라.`,
      `\n[기존 계약 납품 범위]\n${input.contractScope}`,
      `\n[의뢰인의 변경 요청]\n${input.description}`,
      input.reason ? `요청 사유: ${input.reason}` : "",
      `\n[판단 기준] 요청이 기존 범위 문구/기능과 직접 겹치면 inScope=true. 새로운 기능, 외부 연동, 기존에 없던 화면/데이터가 필요하면 inScope=false. opinion에는 양측이 납득할 수 있는 실무적 근거와 다음 행동(예: 추가 마일스톤 협의)을 한두 문장으로 제시하라.`,
      `\n순수 JSON만 출력: {"inScope": boolean, "opinion": "한국어 한두 문장"}`,
    ].join("\n");
    const out = await callProviderText(prompt);
    if (out) {
      const json = extractJson(out.text) as { inScope?: boolean; opinion?: string };
      if (typeof json.inScope === "boolean" && typeof json.opinion === "string") {
        return { inScope: json.inScope, opinion: json.opinion };
      }
    }
  } catch (e) {
    console.error("[변경요청 AI 판단 실패, mock 폴백]", e);
  }
  return mockAssessChange(input.contractScope, input.description);
}

// ============================================================
// 후속(심화) 질문 생성 — 1차 답변을 보고 PRD 정확도를 높일 추가 질문 2~3개
// ============================================================
export async function generateFollowupQuestions(
  idea: string,
  analysis: AnalysisResult,
  answers: QA[]
): Promise<{ questions: string[]; provider: string }> {
  try {
    const prompt = [
      "너는 시니어 PM이다. 아래 프로젝트와 '의뢰인의 1차 답변'을 읽고, PRD를 더 정확히 쓰기 위해 추가로 꼭 필요한 후속 질문 2~3개만 만들어라.",
      "이미 답변된 내용은 다시 묻지 말고, 답변에서 새로 드러난 모호함이나 빠진 핵심(권한·정책·데이터·연동·일정 등)을 구체적으로 물어라. 답변이 충분하면 빈 배열을 반환해도 된다.",
      `\n프로젝트 요약: ${analysis.projectSummary}`,
      `핵심 기능: ${analysis.features.map((f) => f.name).join(", ")}`,
      `\n1차 질문과 답변:\n${answers
        .map((a) => `- Q: ${a.question}\n  A: ${a.answer || "(미응답)"}`)
        .join("\n")}`,
      `\n순수 JSON만 출력: {"questions": string[]}`,
    ].join("\n");
    const out = await callProviderText(prompt);
    if (out) {
      const json = extractJson(out.text) as { questions?: unknown };
      if (Array.isArray(json.questions)) {
        return {
          questions: json.questions.map((q) => String(q)).slice(0, 3),
          provider: out.provider,
        };
      }
    }
  } catch (e) {
    console.error("[후속질문 AI 실패, mock 폴백]", e);
  }
  return {
    questions: generateMockFollowups(idea, analysis, answers),
    provider: "mock",
  };
}

export async function generateProjectPRD(
  idea: string,
  analysis: AnalysisResult,
  answers: QA[],
  title: string
): Promise<{ prd: string; provider: string }> {
  try {
    const prompt = [
      `프로젝트 제목: ${title}`,
      `아이디어: ${idea}`,
      `AI 분석 결과(JSON): ${JSON.stringify(analysis)}`,
      `의뢰인 확인 답변: ${JSON.stringify(answers)}`,
      "위 정보를 바탕으로 개발자에게 전달할 완성된 PRD를 마크다운으로 작성해줘.",
    ].join("\n");
    const out = await callProviderText(prompt);
    if (out && out.text.trim()) return { prd: out.text, provider: out.provider };
  } catch (e) {
    console.error("[PRD] 생성 실패, mock으로 폴백:", e);
  }
  return { prd: generateMockPRD(idea, analysis, answers, title), provider: "mock" };
}
