import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { generateProjectPRD, AnalysisResultSchema } from "@/lib/ai";

const schema = z.object({
  idea: z.string().min(1),
  title: z.string().min(1),
  analysis: AnalysisResultSchema,
  answers: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .default([]),
});

// 비로그인 "무료 체험"용 공개 PRD 생성 API. DB에 저장하지 않는다.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
  }
  try {
    const { idea, title, analysis, answers } = parsed.data;
    const result = await generateProjectPRD(idea, analysis, answers, title);
    return ok(result);
  } catch (e) {
    console.error("[공개 PRD 생성 실패]", e);
    return fail("PRD 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
