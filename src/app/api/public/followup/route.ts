import { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api";
import { generateFollowupQuestions, AnalysisResultSchema } from "@/lib/ai";

const schema = z.object({
  idea: z.string().min(1),
  analysis: AnalysisResultSchema,
  answers: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .default([]),
});

// 비로그인 체험용 후속 질문 (DB 저장 없음)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return ok({ questions: [], provider: "none" });
  try {
    const { idea, analysis, answers } = parsed.data;
    const result = await generateFollowupQuestions(idea, analysis, answers);
    return ok(result);
  } catch (e) {
    console.error("[공개 후속 질문 실패]", e);
    return ok({ questions: [], provider: "none" });
  }
}
