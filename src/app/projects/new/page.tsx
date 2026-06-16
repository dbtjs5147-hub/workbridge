import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import { NewProjectWizard } from "./NewProjectWizard";

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.role) redirect("/role-select");
  if (user.role !== "CLIENT") {
    return (
      <div className="container-page max-w-xl">
        <div className="card p-8 text-center">
          <p className="text-lg font-semibold text-gray-800">
            프로젝트 등록은 의뢰인만 가능합니다
          </p>
          <p className="mt-2 text-sm text-gray-500">
            현재 프리랜서 계정으로 로그인되어 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page max-w-3xl">
      <NewProjectWizard categories={[...CATEGORIES]} />
    </div>
  );
}
