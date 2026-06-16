import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, ok, fail } from "@/lib/api";
import { generateFollowupQuestions, AnalysisResultSchema } from "@/lib/ai";

const schema = z.object({
  idea: z.string().min(1),
  analysis: AnalysisResultSchema,
  answers: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .default([]),
});

export async function POST(req: NextRequest) {
  const { error } = await requireRole("CLIENT");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
  }
  try {
    const { idea, analysis, answers } = parsed.data;
    const result = await generateFollowupQuestions(idea, analysis, answers);
    return ok(result);
  } catch (e) {
    console.error("[후속 질문 생성 실패]", e);
    // 후속 질문은 부가 기능 → 실패해도 빈 배열로 진행 가능하게
    return ok({ questions: [], provider: "none" });
  }
}
