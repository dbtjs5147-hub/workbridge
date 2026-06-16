import { z } from "zod";

// AI 분석 입력값
export const AnalysisInputSchema = z.object({
  idea: z.string().min(10, "프로젝트 설명을 10자 이상 입력해 주세요."),
  category: z.string().optional(),
  desiredSchedule: z.string().optional(),
  budgetRange: z.string().optional(),
  mustHave: z.string().optional(),
  referenceUrl: z.string().optional(),
  platform: z.string().optional(),
  constraints: z.string().optional(),
});
export type AnalysisInput = z.infer<typeof AnalysisInputSchema>;

// AI 분석 출력값 (RFP/PRD 부록 D 구조)
export const FeatureSchema = z.object({
  name: z.string(),
  description: z.string(),
  priority: z.enum(["MVP_REQUIRED", "OPTIONAL", "EXCLUDED"]),
  estimatedCost: z.number(),
  rationale: z.string(),
});

export const MilestoneSchema = z.object({
  title: z.string(),
  deliverables: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  amount: z.number(),
});

export const AnalysisResultSchema = z.object({
  projectSummary: z.string(),
  userTypes: z.array(z.string()),
  features: z.array(FeatureSchema),
  optionalFeatures: z.array(
    z.object({ name: z.string(), reason: z.string() })
  ),
  excludedScope: z.array(z.string()),
  recommendedTechStack: z.array(z.string()),
  estimatedTotalCost: z.number(),
  estimatedDurationWeeks: z.number(),
  milestones: z.array(MilestoneSchema),
  risks: z.array(z.string()),
  clarifyingQuestions: z.array(z.string()),
  contractScopeDraft: z.string(),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
