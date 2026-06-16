import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, fail } from "@/lib/api";
import { AnalysisResultSchema } from "@/lib/ai";
import { stringifyArray } from "@/lib/json";
import { PROJECT_STATUS } from "@/lib/constants";

const schema = z.object({
  title: z.string().min(1, "제목을 입력해 주세요."),
  description: z.string().min(1, "설명을 입력해 주세요."),
  category: z.string().min(1, "카테고리를 선택해 주세요."),
  budget: z.number().int().nonnegative(),
  recruitStartDate: z.string().optional(),
  recruitEndDate: z.string().optional(),
  requiredSkills: z.array(z.string()).default([]),
  analysis: AnalysisResultSchema.optional(),
  prdDocument: z.string().optional(),
  clarifyingAnswers: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .default([]),
});

export async function POST(req: NextRequest) {
  const { user, error } = await requireRole("CLIENT");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
  }
  const d = parsed.data;

  const start = d.recruitStartDate ? new Date(d.recruitStartDate) : new Date();
  const end = d.recruitEndDate ? new Date(d.recruitEndDate) : null;
  const status =
    start.getTime() > Date.now()
      ? PROJECT_STATUS.UPCOMING
      : PROJECT_STATUS.OPEN;

  const project = await prisma.project.create({
    data: {
      clientId: user!.id,
      title: d.title,
      description: d.description,
      category: d.category,
      budget: d.budget,
      recruitStartDate: start,
      recruitEndDate: end,
      requiredSkills: stringifyArray(d.requiredSkills),
      status,
      prdDocument: d.prdDocument ?? null,
      clarifyingAnswers: JSON.stringify(d.clarifyingAnswers),
    },
  });

  // AI 분석 결과가 있으면 함께 저장 (분석 → 기능 → 마일스톤)
  if (d.analysis) {
    const a = d.analysis;
    await prisma.aIAnalysis.create({
      data: {
        projectId: project.id,
        rawInput: d.description,
        projectSummary: a.projectSummary,
        userTypes: stringifyArray(a.userTypes),
        estimatedTotalCost: a.estimatedTotalCost,
        estimatedDurationWeeks: a.estimatedDurationWeeks,
        recommendedTechStack: stringifyArray(a.recommendedTechStack),
        risks: stringifyArray(a.risks),
        clarifyingQuestions: stringifyArray(a.clarifyingQuestions),
        contractScopeDraft: a.contractScopeDraft,
        rawJson: JSON.stringify(a),
      },
    });
    const featureRows = [
      ...a.features.map((f) => ({
        name: f.name,
        description: f.description,
        priority: f.priority,
        estimatedCost: f.estimatedCost,
        rationale: f.rationale,
      })),
      ...a.optionalFeatures.map((o) => ({
        name: o.name,
        description: o.reason,
        priority: "OPTIONAL",
        estimatedCost: 0,
        rationale: o.reason,
      })),
      ...a.excludedScope.map((e) => ({
        name: e,
        description: "초기 범위에서 제외",
        priority: "EXCLUDED",
        estimatedCost: 0,
        rationale: "MVP 이후 고도화 권장",
      })),
    ];
    if (featureRows.length > 0) {
      await prisma.projectFeature.createMany({
        data: featureRows.map((f) => ({ ...f, projectId: project.id })),
      });
    }
    if (a.milestones.length > 0) {
      await prisma.projectMilestone.createMany({
        data: a.milestones.map((m, i) => ({
          projectId: project.id,
          title: m.title,
          deliverables: stringifyArray(m.deliverables),
          acceptanceCriteria: stringifyArray(m.acceptanceCriteria),
          amount: m.amount,
          order: i,
          status: "PENDING",
        })),
      });
    }
  }

  return ok({ id: project.id });
}
