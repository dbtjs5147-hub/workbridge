"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploader } from "@/components/FileUploader";

type Initial = {
  name: string;
  bio: string;
  email: string;
  profileImageUrl: string;
  client: { companyName: string; industry: string; websiteUrl: string };
  freelancer: {
    categories: string[];
    skills: string[];
    experienceYears: number;
    hourlyRate: number;
    portfolioUrl: string;
    githubUrl: string;
    deployedProjectUrl: string;
    projectTypeExperience: string[];
    portfolioImages: string[];
  };
};

export function ProfileForm({
  role,
  initial,
  skillOptions,
  categoryOptions,
}: {
  role: string;
  initial: Initial;
  skillOptions: string[];
  categoryOptions: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio);
  const [profileImageUrl, setProfileImageUrl] = useState(
    initial.profileImageUrl
  );
  const [client, setClient] = useState(initial.client);
  const [freelancer, setFreelancer] = useState(initial.freelancer);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggle(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        bio,
        profileImageUrl,
        ...(role === "CLIENT" ? { client } : { freelancer }),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.ok) {
      setError(data.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {/* 공통 */}
      <div className="card space-y-4 p-6">
        <p className="text-sm font-bold text-gray-800">공통 정보</p>
        <div>
          <label className="label">이름</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">이메일</label>
          <input className="input bg-gray-50" value={initial.email} disabled />
        </div>
        <div>
          <label className="label">자기소개</label>
          <textarea
            className="input min-h-[80px]"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        <div>
          <label className="label">프로필 사진</label>
          <FileUploader
            value={profileImageUrl ? [profileImageUrl] : []}
            onChange={(urls) => setProfileImageUrl(urls[0] ?? "")}
            max={1}
            accept="image/*"
            label="사진 추가"
          />
        </div>
      </div>

      {role === "CLIENT" ? (
        <div className="card space-y-4 p-6">
          <p className="text-sm font-bold text-gray-800">의뢰인 정보</p>
          <div>
            <label className="label">회사명</label>
            <input
              className="input"
              value={client.companyName}
              onChange={(e) =>
                setClient({ ...client, companyName: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">사업 분야</label>
            <input
              className="input"
              value={client.industry}
              onChange={(e) =>
                setClient({ ...client, industry: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">웹사이트</label>
            <input
              className="input"
              value={client.websiteUrl}
              onChange={(e) =>
                setClient({ ...client, websiteUrl: e.target.value })
              }
            />
          </div>
        </div>
      ) : (
        <div className="card space-y-4 p-6">
          <p className="text-sm font-bold text-gray-800">프리랜서 정보</p>
          <div>
            <label className="label">활동 카테고리</label>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setFreelancer({
                      ...freelancer,
                      categories: toggle(freelancer.categories, c),
                    })
                  }
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                    freelancer.categories.includes(c)
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">기술 스택</label>
            <div className="flex flex-wrap gap-2">
              {skillOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setFreelancer({
                      ...freelancer,
                      skills: toggle(freelancer.skills, s),
                    })
                  }
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                    freelancer.skills.includes(s)
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">경력 (년)</label>
              <input
                className="input"
                type="number"
                value={freelancer.experienceYears}
                onChange={(e) =>
                  setFreelancer({
                    ...freelancer,
                    experienceYears: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="label">시간당 단가 (원)</label>
              <input
                className="input"
                type="number"
                value={freelancer.hourlyRate}
                onChange={(e) =>
                  setFreelancer({
                    ...freelancer,
                    hourlyRate: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <div>
            <label className="label">포트폴리오 URL</label>
            <input
              className="input"
              value={freelancer.portfolioUrl}
              onChange={(e) =>
                setFreelancer({ ...freelancer, portfolioUrl: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">GitHub URL</label>
            <input
              className="input"
              value={freelancer.githubUrl}
              onChange={(e) =>
                setFreelancer({ ...freelancer, githubUrl: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">배포 프로젝트 URL</label>
            <input
              className="input"
              value={freelancer.deployedProjectUrl}
              onChange={(e) =>
                setFreelancer({
                  ...freelancer,
                  deployedProjectUrl: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="label">포트폴리오 (이미지/PDF)</label>
            <FileUploader
              value={freelancer.portfolioImages}
              onChange={(urls) =>
                setFreelancer({ ...freelancer, portfolioImages: urls })
              }
              max={8}
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "저장 중..." : "프로필 저장"}
        </button>
        {saved && <span className="text-sm text-emerald-600">✓ 저장되었습니다</span>}
      </div>
    </form>
  );
}
