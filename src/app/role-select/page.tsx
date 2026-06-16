import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RoleSelector } from "./RoleSelector";

export default async function RoleSelectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role) redirect("/");

  return (
    <div className="container-page max-w-2xl">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          어떤 목적으로 이용하시나요?
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          역할에 따라 사용할 수 있는 기능이 달라집니다. (가입 후 변경 어려움)
        </p>
      </div>
      <RoleSelector />
    </div>
  );
}
