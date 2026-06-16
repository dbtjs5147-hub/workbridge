import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, ok, fail } from "@/lib/api";
import { stringifyArray } from "@/lib/json";

const schema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().optional(),
  profileImageUrl: z.string().optional(),
  // 의뢰인 프로필
  client: z
    .object({
      companyName: z.string().optional(),
      industry: z.string().optional(),
      websiteUrl: z.string().optional(),
    })
    .optional(),
  // 프리랜서 프로필
  freelancer: z
    .object({
      categories: z.array(z.string()).optional(),
      skills: z.array(z.string()).optional(),
      experienceYears: z.number().int().nonnegative().optional(),
      hourlyRate: z.number().int().nonnegative().optional(),
      portfolioUrl: z.string().optional(),
      githubUrl: z.string().optional(),
      deployedProjectUrl: z.string().optional(),
      projectTypeExperience: z.array(z.string()).optional(),
      portfolioImages: z.array(z.string()).optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("입력값을 확인해 주세요.");
  const d = parsed.data;

  await prisma.user.update({
    where: { id: user!.id },
    data: {
      ...(d.name !== undefined && { name: d.name }),
      ...(d.bio !== undefined && { bio: d.bio }),
      ...(d.profileImageUrl !== undefined && {
        profileImageUrl: d.profileImageUrl,
      }),
    },
  });

  if (user!.role === "CLIENT" && d.client) {
    await prisma.clientProfile.upsert({
      where: { userId: user!.id },
      create: { userId: user!.id, ...d.client },
      update: d.client,
    });
  }

  if (user!.role === "FREELANCER" && d.freelancer) {
    const f = d.freelancer;
    const data = {
      ...(f.categories !== undefined && {
        categories: stringifyArray(f.categories),
      }),
      ...(f.skills !== undefined && { skills: stringifyArray(f.skills) }),
      ...(f.experienceYears !== undefined && {
        experienceYears: f.experienceYears,
      }),
      ...(f.hourlyRate !== undefined && { hourlyRate: f.hourlyRate }),
      ...(f.portfolioUrl !== undefined && { portfolioUrl: f.portfolioUrl }),
      ...(f.githubUrl !== undefined && { githubUrl: f.githubUrl }),
      ...(f.deployedProjectUrl !== undefined && {
        deployedProjectUrl: f.deployedProjectUrl,
      }),
      ...(f.projectTypeExperience !== undefined && {
        projectTypeExperience: stringifyArray(f.projectTypeExperience),
      }),
      ...(f.portfolioImages !== undefined && {
        portfolioImages: stringifyArray(f.portfolioImages),
      }),
    };
    await prisma.freelancerProfile.upsert({
      where: { userId: user!.id },
      create: { userId: user!.id, ...data },
      update: data,
    });
  }

  return ok({ success: true });
}
