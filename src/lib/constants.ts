// ============================================================
// 상태값(enum) 및 도메인 상수 — SQLite는 enum을 지원하지 않으므로 여기서 관리
// ============================================================

export const ROLES = {
  CLIENT: "CLIENT",
  FREELANCER: "FREELANCER",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABEL: Record<string, string> = {
  CLIENT: "의뢰인",
  FREELANCER: "프리랜서",
};

// 프로젝트 상태
export const PROJECT_STATUS = {
  DRAFT: "DRAFT",
  AI_ANALYZED: "AI_ANALYZED",
  UPCOMING: "UPCOMING",
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  CONTRACT_PENDING: "CONTRACT_PENDING",
  SIGNATURE_PENDING: "SIGNATURE_PENDING",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  UNDER_REVIEW: "UNDER_REVIEW",
  COMPLETED: "COMPLETED",
  CANCELED: "CANCELED",
} as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "작성 중",
  AI_ANALYZED: "AI 분석 완료",
  UPCOMING: "모집 예정",
  OPEN: "모집 중",
  CLOSED: "모집 마감",
  CONTRACT_PENDING: "계약 대기",
  SIGNATURE_PENDING: "서명 대기",
  PAYMENT_PENDING: "결제 대기",
  IN_PROGRESS: "작업 중",
  UNDER_REVIEW: "검수 중",
  COMPLETED: "완료",
  CANCELED: "취소됨",
};

// 외부(프리랜서 탐색) 목록에 노출되는 모집 단계 상태
export const RECRUIT_STATUSES = [
  PROJECT_STATUS.OPEN,
  PROJECT_STATUS.UPCOMING,
  PROJECT_STATUS.CLOSED,
];

// 거래 단계로 진입한 상태(외부 목록에서는 "모집 마감"으로 표기)
export const TRADING_STATUSES = [
  PROJECT_STATUS.CONTRACT_PENDING,
  PROJECT_STATUS.SIGNATURE_PENDING,
  PROJECT_STATUS.PAYMENT_PENDING,
  PROJECT_STATUS.IN_PROGRESS,
  PROJECT_STATUS.UNDER_REVIEW,
  PROJECT_STATUS.COMPLETED,
];

// 지원 상태
export const APPLICATION_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  AUTO_REJECTED: "AUTO_REJECTED",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type ApplicationStatus =
  (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  PENDING: "검토 중",
  ACCEPTED: "수락됨",
  REJECTED: "거절됨",
  AUTO_REJECTED: "자동 거절",
  WITHDRAWN: "지원 철회",
};

// 계약 상태
export const CONTRACT_STATUS = {
  DRAFT: "DRAFT",
  WAITING_FREELANCER_AGREEMENT: "WAITING_FREELANCER_AGREEMENT",
  WAITING_SIGNATURE: "WAITING_SIGNATURE",
  SIGNED: "SIGNED",
  CANCELED: "CANCELED",
} as const;
export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "초안",
  WAITING_FREELANCER_AGREEMENT: "프리랜서 동의 대기",
  WAITING_SIGNATURE: "서명 대기",
  SIGNED: "체결 완료",
  CANCELED: "취소됨",
};

// 결제 상태
export const PAYMENT_STATUS = {
  READY: "READY",
  REQUESTED: "REQUESTED",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELED: "CANCELED",
  REFUNDED: "REFUNDED",
} as const;
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  READY: "결제 준비",
  REQUESTED: "결제 요청됨",
  PAID: "결제 완료(예치)",
  FAILED: "결제 실패",
  CANCELED: "결제 취소",
  REFUNDED: "환불됨",
};

// 정산 상태
export const SETTLEMENT_STATUS = {
  NOT_READY: "NOT_READY",
  READY: "READY",
  FEE_DEDUCTED: "FEE_DEDUCTED",
  SETTLED: "SETTLED",
  FAILED: "FAILED",
} as const;
export const SETTLEMENT_STATUS_LABEL: Record<string, string> = {
  NOT_READY: "정산 전",
  READY: "정산 준비",
  FEE_DEDUCTED: "수수료 차감됨",
  SETTLED: "정산 완료",
  FAILED: "정산 실패",
};

// 마일스톤 상태
export const MILESTONE_STATUS = {
  PENDING: "PENDING",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAID_ESCROW: "PAID_ESCROW",
  IN_PROGRESS: "IN_PROGRESS",
  DELIVERY_REQUESTED: "DELIVERY_REQUESTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  APPROVED: "APPROVED",
  SETTLED: "SETTLED",
  CANCELED: "CANCELED",
} as const;
export type MilestoneStatus =
  (typeof MILESTONE_STATUS)[keyof typeof MILESTONE_STATUS];
export const MILESTONE_STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  PAYMENT_PENDING: "결제 대기",
  PAID_ESCROW: "결제 완료(예치)",
  IN_PROGRESS: "작업 중",
  DELIVERY_REQUESTED: "납품 요청됨",
  UNDER_REVIEW: "검수 중",
  REVISION_REQUESTED: "수정 요청됨",
  APPROVED: "승인됨",
  SETTLED: "정산 완료",
  CANCELED: "취소됨",
};

// 기능 우선순위
export const FEATURE_PRIORITY = {
  MVP_REQUIRED: "MVP_REQUIRED",
  OPTIONAL: "OPTIONAL",
  EXCLUDED: "EXCLUDED",
} as const;
export const FEATURE_PRIORITY_LABEL: Record<string, string> = {
  MVP_REQUIRED: "MVP 필수",
  OPTIONAL: "선택 기능",
  EXCLUDED: "제외/고도화",
};

// 프로젝트 카테고리
export const CATEGORIES = [
  "웹 MVP 개발",
  "앱 MVP 개발",
  "관리자/백오피스 개발",
  "업무 자동화",
  "커머스 개발",
  "SaaS 개발",
  "AI 기능 도입",
  "API 연동/내부 툴",
] as const;

// 기술 스택 옵션
export const SKILL_OPTIONS = [
  "HTML/CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Vue",
  "Node.js",
  "Java",
  "Spring",
  "Python",
  "Django/FastAPI",
  "PHP",
  "WordPress",
  "SQL",
  "NoSQL",
  "AWS",
  "Docker",
  "Flutter",
  "React Native",
  "Supabase",
  "Firebase",
  "OpenAI API",
  "REST API",
  "GraphQL",
  "Figma",
  "GitHub",
] as const;

// 리뷰 태그
export const REVIEW_TAGS_CLIENT_TO_FREELANCER = [
  "기술력 우수",
  "일정 준수",
  "커뮤니케이션 원활",
  "문제 해결력 우수",
  "요구사항 이해도 높음",
  "코드 품질 만족",
  "배포 대응 우수",
  "유지보수 대응 우수",
];
export const REVIEW_TAGS_FREELANCER_TO_CLIENT = [
  "요구사항 명확",
  "피드백 신속",
  "의사결정 빠름",
  "커뮤니케이션 원활",
  "일정 협의 합리적",
  "결제 신뢰",
  "변경 요청 합리적",
  "협업 태도 우수",
];

// 알림 타입
export const NOTIFICATION_TYPE = {
  APPLICATION_RECEIVED: "APPLICATION_RECEIVED",
  APPLICATION_ACCEPTED: "APPLICATION_ACCEPTED",
  APPLICATION_AUTO_REJECTED: "APPLICATION_AUTO_REJECTED",
  APPLICATION_REJECTED: "APPLICATION_REJECTED",
  PROJECT_CLOSED: "PROJECT_CLOSED",
  TERMS_PROPOSED: "TERMS_PROPOSED",
  CONTRACT_CREATED: "CONTRACT_CREATED",
  SIGNATURE_COMPLETED: "SIGNATURE_COMPLETED",
  PAYMENT_COMPLETED: "PAYMENT_COMPLETED",
  DELIVERY_REQUESTED: "DELIVERY_REQUESTED",
  MILESTONE_APPROVED: "MILESTONE_APPROVED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  REVIEW_REQUESTED: "REVIEW_REQUESTED",
  CHANGE_REQUESTED: "CHANGE_REQUESTED",
  CHANGE_RESPONDED: "CHANGE_RESPONDED",
} as const;

export const CHANGE_REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING: "검토 대기",
  ACCEPTED: "수락됨",
  REJECTED: "거절됨",
};

export const PLATFORM_FEE_RATE = Number(
  process.env.PLATFORM_FEE_RATE ?? "0.1"
);
