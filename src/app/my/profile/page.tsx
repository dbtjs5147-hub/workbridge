import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { parseArray } from "@/lib/json";
import { ROLE_LABEL, CATEGORIES, SKILL_OPTIONS } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import { ProfileForm } from "./ProfileForm";

export default async function MyProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.role) redirect("/role-select");

  return (
    <div className="container-page max-w-2xl">
      <PageHeader
        title="내 프로필"
        description={`${ROLE_LABEL[user.role]} 계정`}
        action={
          <Link href={`/users/${user.id}`} className="btn-secondary">
            공개 프로필 보기
          </Link>
        }
      />
      <ProfileForm
        role={user.role}
        skillOptions={[...SKILL_OPTIONS]}
        categoryOptions={[...CATEGORIES]}
        initial={{
          name: user.name,
          bio: user.bio ?? "",
          email: user.email,
          profileImageUrl: user.profileImageUrl ?? "",
          client: {
            companyName: user.clientProfile?.companyName ?? "",
            industry: user.clientProfile?.industry ?? "",
            websiteUrl: user.clientProfile?.websiteUrl ?? "",
          },
          freelancer: {
            categories: parseArray(user.freelancerProfile?.categories),
            skills: parseArray(user.freelancerProfile?.skills),
            experienceYears: user.freelancerProfile?.experienceYears ?? 0,
            hourlyRate: user.freelancerProfile?.hourlyRate ?? 0,
            portfolioUrl: user.freelancerProfile?.portfolioUrl ?? "",
            githubUrl: user.freelancerProfile?.githubUrl ?? "",
            deployedProjectUrl: user.freelancerProfile?.deployedProjectUrl ?? "",
            projectTypeExperience: parseArray(
              user.freelancerProfile?.projectTypeExperience
            ),
            portfolioImages: parseArray(user.freelancerProfile?.portfolioImages),
          },
        }}
      />
    </div>
  );
}
