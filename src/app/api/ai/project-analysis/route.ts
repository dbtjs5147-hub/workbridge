import { NextRequest } from "next/server";
import { analyzeProject, AnalysisInputSchema } from "@/lib/ai";
import { requireRole } from "@/lib/api";
import { ok, fail } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { error } = await requireRole("CLIENT");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = AnalysisInputSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
  }

  try {
    const outcome = await analyzeProject(parsed.data);
    return ok(outcome);
  } catch (e) {
    console.error("[AI 분석 실패]", e);
    return fail(
      "AI 분석에 실패했습니다. 프로젝트 설명을 조금 더 구체적으로 작성한 뒤 다시 시도해 주세요.",
      500
    );
  }
}
