import type { AnalysisInput, AnalysisResult } from "./schema";
import type { QA } from "./prd";

// ============================================================
// 키 없이도 동작하는 "가짜 AI 분석 엔진"
// 입력 아이디어의 키워드를 감지해 도메인에 맞는 기능/견적/마일스톤을 생성한다.
// 실제 LLM 응답과 동일한 구조를 반환하므로, 나중에 실제 키를 넣어도 화면은 그대로 동작한다.
// ============================================================

type Feature = AnalysisResult["features"][number];

const won = (n: number) => Math.round(n / 100000) * 100000;

function detectDomain(text: string) {
  const t = text.toLowerCase();
  const has = (...kw: string[]) => kw.some((k) => t.includes(k));
  return {
    booking: has("예약", "예약제", "booking", "스케줄", "appointment"),
    commerce: has("쇼핑", "커머스", "상품", "결제", "주문", "쇼핑몰", "마켓"),
    admin: has("관리자", "백오피스", "대시보드", "admin", "운영"),
    ai: has("ai", "챗봇", "추천", "요약", "gpt", "분석", "검색"),
    automation: has("자동화", "크롤링", "엑셀", "연동", "rpa"),
    community: has("커뮤니티", "게시판", "sns", "피드", "댓글"),
    matching: has("매칭", "중개", "연결"),
    app: has("앱", "모바일", "flutter", "ios", "android", "react native"),
  };
}

// 1차 답변을 본 뒤 던지는 '심화' 후속 질문 (mock). 이미 물은 것과 겹치지 않게 더 깊이 파고든다.
export function generateMockFollowups(
  idea: string,
  analysis: AnalysisResult,
  answers: QA[]
): string[] {
  const text = [idea, analysis.projectSummary].filter(Boolean).join(" ");
  const d = detectDomain(text);
  const answered = answers
    .filter((a) => a.answer && a.answer.trim())
    .map((a) => a.answer)
    .join(" ");
  const out: string[] = [];

  // 도메인별 심화
  if (d.booking)
    out.push("영업시간/예약 가능 시간대와 동시 예약 가능 인원에 제한이 있나요?");
  if (d.commerce)
    out.push("환불·교환 정책과 정산 주기(예: 주 1회)는 어떻게 운영하실 계획인가요?");
  if (d.ai)
    out.push("AI 결과가 부정확할 때 사용자가 수정하거나 피드백할 방법이 필요한가요?");
  if (d.admin || d.booking)
    out.push("관리자 권한을 등급으로 나눠야 하나요? (예: 슈퍼관리자 / 일반 운영자)");
  if (d.community || d.matching)
    out.push("부적절한 사용자·콘텐츠를 신고·차단하는 운영 기능이 필요한가요?");

  // 공통 심화 (중복 없이 최대 3개까지)
  for (const q of [
    answered
      ? "앞서 말씀하신 내용을 반영하면, 출시 직후 가장 먼저 추가하고 싶은 기능은 무엇인가요?"
      : "출시 후 두 번째로 추가하고 싶은 기능은 무엇인가요?",
    "기존에 쓰던 데이터(엑셀·기존 시스템 등)를 옮겨와야 하나요?",
    "오픈 희망 시점이나 꼭 지켜야 하는 마감일이 있나요?",
  ]) {
    if (out.length >= 3) break;
    out.push(q);
  }

  return out.slice(0, 3);
}

export function generateMockAnalysis(input: AnalysisInput): AnalysisResult {
  const text = [
    input.idea,
    input.mustHave,
    input.platform,
    input.category,
  ]
    .filter(Boolean)
    .join(" ");
  const d = detectDomain(text);
  const isApp = d.app;
  const platformWord = isApp ? "앱" : "웹";

  // --- 공통 기능 ---
  const features: Feature[] = [
    {
      name: "회원가입 및 로그인",
      description: "이메일 기반 가입/로그인과 사용자 권한 분기 처리",
      priority: "MVP_REQUIRED",
      estimatedCost: won(800000),
      rationale: "인증, 권한 분기, 기본 보안 처리가 필요함",
    },
    {
      name: "사용자 프로필 관리",
      description: "프로필 정보 입력/수정 및 공개 프로필 표시",
      priority: "MVP_REQUIRED",
      estimatedCost: won(600000),
      rationale: "기본 사용자 정보 관리 및 신뢰 정보 노출",
    },
  ];

  if (d.booking) {
    features.push(
      {
        name: "예약 등록 및 조회",
        description: "사용자가 날짜/시간을 선택해 예약을 생성하고 조회",
        priority: "MVP_REQUIRED",
        estimatedCost: won(1500000),
        rationale: "예약 슬롯 관리, 중복 방지, 캘린더 UI 필요",
      },
      {
        name: "예약 변경 및 취소",
        description: "예약 상태 변경과 취소 정책 처리",
        priority: "MVP_REQUIRED",
        estimatedCost: won(900000),
        rationale: "상태 전환과 취소 가능 시간 정책 필요",
      },
      {
        name: "관리자 예약 관리",
        description: "운영자가 예약 현황을 확인하고 처리",
        priority: "MVP_REQUIRED",
        estimatedCost: won(1200000),
        rationale: "운영자 대시보드와 권한 분리 필요",
      }
    );
  }
  if (d.commerce) {
    features.push(
      {
        name: "상품 등록 및 목록",
        description: "상품 CRUD, 카테고리, 검색/필터",
        priority: "MVP_REQUIRED",
        estimatedCost: won(1600000),
        rationale: "상품 데이터 모델과 이미지 업로드 필요",
      },
      {
        name: "장바구니 및 주문",
        description: "장바구니 담기, 주문 생성, 주문 내역",
        priority: "MVP_REQUIRED",
        estimatedCost: won(1800000),
        rationale: "주문 상태 관리와 재고 처리 필요",
      },
      {
        name: "결제 연동",
        description: "PG 결제 연동 및 결제 결과 처리",
        priority: "MVP_REQUIRED",
        estimatedCost: won(1400000),
        rationale: "결제 콜백 검증과 멱등 처리 필요",
      }
    );
  }
  if (d.community || d.matching) {
    features.push(
      {
        name: d.matching ? "매칭/연결 기능" : "게시글 작성 및 피드",
        description: d.matching
          ? "조건 기반으로 사용자를 서로 연결"
          : "글 작성/조회/목록과 피드 노출",
        priority: "MVP_REQUIRED",
        estimatedCost: won(1500000),
        rationale: "핵심 상호작용 로직과 목록 성능 고려 필요",
      },
      {
        name: "댓글 및 알림",
        description: "댓글 작성과 인앱 알림",
        priority: "OPTIONAL",
        estimatedCost: won(900000),
        rationale: "MVP 이후 참여 강화 기능으로 분리 가능",
      }
    );
  }
  if (d.ai) {
    features.push({
      name: "AI 기능 연동",
      description: "LLM API를 활용한 추천/요약/챗봇 등 AI 기능",
      priority: "MVP_REQUIRED",
      estimatedCost: won(1700000),
      rationale: "프롬프트 설계, 응답 파싱, 비용/지연 처리 필요",
    });
  }
  if (d.automation) {
    features.push({
      name: "업무 자동화 파이프라인",
      description: "데이터 수집/가공/연동 자동화",
      priority: "MVP_REQUIRED",
      estimatedCost: won(1400000),
      rationale: "외부 연동과 스케줄링, 예외 처리 필요",
    });
  }
  if (d.admin && !d.booking) {
    features.push({
      name: "운영 관리자 대시보드",
      description: "주요 데이터 조회/관리 및 통계",
      priority: "MVP_REQUIRED",
      estimatedCost: won(1300000),
      rationale: "권한 분리와 데이터 집계 화면 필요",
    });
  }

  // 도메인 특화 기능이 거의 없으면 기본 핵심 기능 추가
  if (features.length <= 3) {
    features.push({
      name: "핵심 데이터 등록/조회",
      description: "서비스의 주요 데이터를 생성/조회/수정",
      priority: "MVP_REQUIRED",
      estimatedCost: won(1500000),
      rationale: "서비스의 핵심 CRUD 로직 필요",
    });
  }

  features.push({
    name: "기본 배포 및 반응형 UI",
    description: "배포 환경 구성과 모바일/PC 반응형 화면",
    priority: "MVP_REQUIRED",
    estimatedCost: won(700000),
    rationale: "배포 자동화와 반응형 레이아웃 필요",
  });

  // --- 선택/제외 기능 ---
  const optionalFeatures = [
    { name: "푸시/카카오 알림 연동", reason: "MVP 이후 리텐션 강화 기능으로 분리 가능" },
    { name: "통계/리포트 고도화", reason: "초기 데이터 축적 후 도입 권장" },
  ];
  const excludedScope = [
    d.commerce ? "실시간 재고 동기화" : "실시간 채팅",
    "외부 정산/세무 시스템 연동",
    isApp ? "네이티브 앱 스토어 배포" : "다국어 지원",
  ];

  // --- 기술 스택 ---
  const recommendedTechStack = [
    isApp ? "React Native" : "Next.js",
    "TypeScript",
    "Node.js",
    "PostgreSQL",
    d.ai ? "OpenAI API" : "REST API",
    "AWS",
  ];

  const mvpFeatures = features.filter((f) => f.priority === "MVP_REQUIRED");
  const estimatedTotalCost = mvpFeatures.reduce(
    (sum, f) => sum + f.estimatedCost,
    0
  );
  const estimatedDurationWeeks = Math.max(
    4,
    Math.min(12, Math.round(estimatedTotalCost / 1300000))
  );

  // --- 마일스톤 분할 (MVP 기능을 3단계로 ) ---
  const milestones = buildMilestones(mvpFeatures, platformWord);

  // --- 리스크/질문 ---
  const risks = [
    "요구사항이 구체화되면서 일정/견적이 변동될 수 있음",
    d.ai ? "AI 응답 품질과 비용은 사용량에 따라 달라질 수 있음" : "외부 API 연동 여부에 따라 난이도가 달라질 수 있음",
    "디자인 시안 제공 여부에 따라 작업 범위가 달라질 수 있음",
  ];
  // 아이디어에 맞춘 '고영향' 확인 질문 (3~5개)
  const clarifyingQuestions: string[] = [
    `${platformWord} 서비스의 주 사용자는 누구이고 역할 구분이 필요한가요? (예: 일반 사용자 / 관리자 / 공급자)`,
  ];
  if (d.booking)
    clarifyingQuestions.push(
      "예약 취소·변경은 언제까지 허용하고, 노쇼(no-show)는 어떻게 처리할까요?"
    );
  if (d.commerce)
    clarifyingQuestions.push(
      "결제 수단(카드/간편결제)과 배송·재고 관리는 어디까지 필요한가요?"
    );
  if (d.ai)
    clarifyingQuestions.push(
      "AI 기능의 입력과 기대 출력은 무엇이며, 어떤 결과가 나오면 '성공'이라고 보시나요?"
    );
  if (d.automation)
    clarifyingQuestions.push(
      "자동화할 데이터의 출처(엑셀/외부 서비스 등)와 실행 주기는 어떻게 되나요?"
    );
  if (d.matching)
    clarifyingQuestions.push(
      "양측을 연결하는 매칭 기준(지역·조건·가격 등)은 무엇인가요?"
    );
  if (d.community)
    clarifyingQuestions.push(
      "게시글·댓글 외에 신고/차단 등 운영 관리 기능이 필요한가요?"
    );
  // 공통 고영향 질문으로 3~5개까지 채움 (중복 없이)
  for (const q of [
    "초기 출시에 반드시 있어야 하는 기능 1~2개와, 나중으로 미뤄도 되는 기능을 구분해 주실 수 있나요?",
    "디자인 시안(피그마 등)을 제공하시나요, 아니면 기본 디자인으로 진행할까요?",
    "예상 사용자 규모나 동시 접속 수에 대한 기준이 있나요?",
  ]) {
    if (clarifyingQuestions.length >= 5) break;
    clarifyingQuestions.push(q);
  }

  const contractScopeDraft = `본 계약의 납품 범위는 ${mvpFeatures
    .map((f) => f.name)
    .join(", ")}를 포함하며, ${excludedScope.join(
    ", "
  )} 등은 제외 범위로 한다. 모든 산출물은 배포 가능한 형태로 전달한다.`;

  const userTypes = buildUserTypes(d);

  return {
    projectSummary: buildSummary(input, platformWord, d),
    userTypes,
    features,
    optionalFeatures,
    excludedScope,
    recommendedTechStack,
    estimatedTotalCost,
    estimatedDurationWeeks,
    milestones,
    risks,
    clarifyingQuestions,
    contractScopeDraft,
  };
}

function buildSummary(
  input: AnalysisInput,
  platformWord: string,
  d: ReturnType<typeof detectDomain>
): string {
  const domainWord = d.booking
    ? "예약"
    : d.commerce
      ? "커머스"
      : d.ai
        ? "AI 기반"
        : d.automation
          ? "업무 자동화"
          : d.matching
            ? "매칭"
            : d.community
              ? "커뮤니티"
              : "";
  const head = input.idea.trim().slice(0, 40).replace(/\s+/g, " ");
  return `${domainWord ? domainWord + " " : ""}${platformWord} MVP 개발 프로젝트 — "${head}${input.idea.length > 40 ? "…" : ""}"`;
}

function buildUserTypes(d: ReturnType<typeof detectDomain>): string[] {
  const types = ["일반 사용자"];
  if (d.booking) types.push("예약 고객", "운영 관리자");
  else if (d.commerce) types.push("구매자", "판매/운영 관리자");
  else if (d.matching) types.push("요청자", "공급자");
  else types.push("운영 관리자");
  types.push("플랫폼 관리자");
  return Array.from(new Set(types));
}

function buildMilestones(
  mvpFeatures: Feature[],
  platformWord: string
): AnalysisResult["milestones"] {
  const total = mvpFeatures.reduce((s, f) => s + f.estimatedCost, 0);
  const third = Math.ceil(mvpFeatures.length / 3);
  const groups = [
    mvpFeatures.slice(0, third),
    mvpFeatures.slice(third, third * 2),
    mvpFeatures.slice(third * 2),
  ].filter((g) => g.length > 0);

  const titles = [
    "1차: 인증 및 기본 구조",
    "2차: 핵심 기능 구현",
    "3차: 마무리 및 배포",
  ];

  return groups.map((group, i) => {
    const amount = group.reduce((s, f) => s + f.estimatedCost, 0);
    // 마지막 마일스톤이 총액과 맞도록 보정
    const isLast = i === groups.length - 1;
    const fixedAmount = isLast
      ? total - groups.slice(0, i).reduce((s, g) => s + g.reduce((a, f) => a + f.estimatedCost, 0), 0)
      : amount;
    return {
      title: titles[i] ?? `${i + 1}차 작업`,
      deliverables: group.map((f) => f.name),
      acceptanceCriteria: group.map(
        (f) => `${f.name} 기능이 ${platformWord} 화면에서 정상 동작해야 한다`
      ),
      amount: fixedAmount,
    };
  });
}
