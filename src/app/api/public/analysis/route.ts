import { NextRequest } from "next/server";
import { analyzeProject, AnalysisInputSchema } from "@/lib/ai";
import { ok, fail } from "@/lib/api";

// 비로그인 "무료 체험"용 공개 분석 API. DB에 저장하지 않는다.
// (실서비스에서는 IP 기준 rate limit을 권장)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = AnalysisInputSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
  }
  if (parsed.data.idea.length > 2000) {
    return fail("설명이 너무 깁니다. 2000자 이내로 입력해 주세요.");
  }
  try {
    const outcome = await analyzeProject(parsed.data);
    return ok(outcome);
  } catch (e) {
    console.error("[공개 AI 분석 실패]", e);
    return fail(
      "AI 분석에 실패했습니다. 설명을 조금 더 구체적으로 작성한 뒤 다시 시도해 주세요.",
      500
    );
  }
}
