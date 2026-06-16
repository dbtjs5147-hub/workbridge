import type { AnalysisResult } from "./schema";

export type QA = { question: string; answer: string };

const PRIORITY_LABEL: Record<string, string> = {
  MVP_REQUIRED: "MVP 필수",
  OPTIONAL: "선택",
  EXCLUDED: "제외/고도화",
};

// 키 없이 동작하는 PRD 문서 생성기. 마크다운 문자열을 반환한다.
export function generateMockPRD(
  idea: string,
  analysis: AnalysisResult,
  answers: QA[],
  title: string
): string {
  const today = new Date().toLocaleDateString("ko-KR");
  const mvp = analysis.features.filter((f) => f.priority === "MVP_REQUIRED");
  const optional = analysis.features.filter((f) => f.priority === "OPTIONAL");

  const answeredQA = answers.filter((qa) => qa.answer && qa.answer.trim());

  const lines: string[] = [];
  lines.push(`# ${title} — 제품 요구사항 정의서 (PRD)`);
  lines.push("");
  lines.push(`> 생성일: ${today} · 상태: 초안 · 본 문서는 AI가 생성한 초안이며 견적·일정은 참고용입니다.`);
  lines.push("");

  lines.push("## 1. 프로젝트 개요");
  lines.push(analysis.projectSummary);
  lines.push("");
  lines.push(`**의뢰인 원문 요청**`);
  lines.push(`> ${idea.replace(/\n/g, " ")}`);
  lines.push("");

  lines.push("## 2. 목표 사용자");
  analysis.userTypes.forEach((u) => lines.push(`- ${u}`));
  lines.push("");

  lines.push("## 3. 핵심 기능 명세 (MVP 필수)");
  mvp.forEach((f, i) => {
    lines.push(`### 3.${i + 1} ${f.name}`);
    lines.push(`- 설명: ${f.description}`);
    lines.push(`- 우선순위: ${PRIORITY_LABEL[f.priority]}`);
    lines.push(`- 산정 근거: ${f.rationale}`);
    lines.push("");
  });

  if (optional.length > 0) {
    lines.push("## 4. 선택 기능 (예산·일정 여유 시)");
    optional.forEach((f) => lines.push(`- **${f.name}**: ${f.description}`));
    lines.push("");
  }

  if (analysis.excludedScope.length > 0) {
    lines.push("## 5. 제외 범위 (이번 개발에 포함하지 않음)");
    analysis.excludedScope.forEach((e) => lines.push(`- ${e}`));
    lines.push("");
  }

  if (answeredQA.length > 0) {
    lines.push("## 6. 의뢰인 확인 사항 (Q&A)");
    answeredQA.forEach((qa) => {
      lines.push(`**Q. ${qa.question}**`);
      lines.push(`A. ${qa.answer}`);
      lines.push("");
    });
  }

  lines.push("## 7. 마일스톤 및 검수 기준");
  analysis.milestones.forEach((m, i) => {
    lines.push(`### 7.${i + 1} ${m.title}`);
    lines.push(`- 납품물: ${m.deliverables.join(", ")}`);
    lines.push(`- 검수 기준:`);
    m.acceptanceCriteria.forEach((c) => lines.push(`  - ${c}`));
    lines.push("");
  });

  lines.push("## 8. 권장 기술 스택");
  lines.push(analysis.recommendedTechStack.join(", "));
  lines.push("");

  lines.push("## 9. 비기능 요구사항");
  lines.push("- 반응형 웹 (PC/모바일 대응)");
  lines.push("- 비밀번호 해싱 등 기본 보안 처리");
  lines.push("- 주요 입력값 서버 측 유효성 검증");
  lines.push("- 배포 가능한 형태로 인도, 오류·로딩 상태 처리");
  lines.push("");

  lines.push("## 10. 일정 및 대금 (참고용)");
  lines.push(`- 예상 개발 기간: 약 ${analysis.estimatedDurationWeeks}주`);
  lines.push(`- 비용: 본 플랫폼은 금액을 산정하지 않습니다. 검증된 개발자가 직접 입찰가를 제시하며, 입찰가는 의뢰인에게만 공개됩니다.`);
  lines.push(`- 대금 지급: 마일스톤 단위 에스크로 (단계별 검수·승인 후 지급, 플랫폼 수수료 10%)`);
  lines.push("");

  if (analysis.risks.length > 0) {
    lines.push("## 11. 리스크 및 유의사항");
    analysis.risks.forEach((r) => lines.push(`- ${r}`));
    lines.push("");
  }

  lines.push("## 12. 계약 범위 (초안)");
  lines.push(analysis.contractScopeDraft);
  lines.push("");

  return lines.join("\n");
}
