import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import { NewProjectWizard } from "../projects/new/NewProjectWizard";
import { Icon } from "@/components/Icon";

export const metadata = {
  title: "무료 AI 분석 체험 — WorkBridge",
  description:
    "아이디어만 입력하면 AI가 기능·견적·일정·PRD까지 무료로 만들어 드립니다. 가입 없이 바로 체험하세요.",
};

export default async function TryPage() {
  // 로그인한 의뢰인은 실제 등록 화면으로
  const user = await getCurrentUser();
  if (user?.role === "CLIENT") redirect("/projects/new");

  return (
    <div className="container-page max-w-3xl">
      <div className="mb-8 text-center">
        <span className="chip border border-brand-200 bg-brand-50 text-brand-700">
          <Icon name="sparkles" className="mr-1 h-3.5 w-3.5" />
          가입 없이 무료 체험
        </span>
        <h1 className="mt-3 text-3xl font-extrabold text-gray-900">
          아이디어만 있으면, AI가 PRD까지 만들어 드려요
        </h1>
        <p className="mt-2 text-gray-600">
          개발을 몰라도 괜찮습니다. 떠오르는 대로 적으면 기능·일정·요구사항
          정의서(PRD)가 자동으로 나옵니다.
        </p>
      </div>
      <NewProjectWizard categories={[...CATEGORIES]} trial />
    </div>
  );
}
