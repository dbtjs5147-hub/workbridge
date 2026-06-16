import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ProjectCard } from "@/components/ProjectCard";
import { Icon, type IconName } from "@/components/Icon";

export default async function HomePage() {
  const user = await getCurrentUser();

  const [openProjects, projectCount, freelancerCount, completedCount] =
    await Promise.all([
      prisma.project.findMany({
        where: { status: "OPEN", isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { client: true, _count: { select: { applications: true } } },
      }),
      prisma.project.count({ where: { isDeleted: false } }),
      prisma.user.count({ where: { role: "FREELANCER", deletedAt: null } }),
      prisma.project.count({ where: { status: "COMPLETED" } }),
    ]);

  const primaryCta =
    user?.role === "CLIENT"
      ? { href: "/projects/new", label: "내 아이디어 분석받기" }
      : user?.role === "FREELANCER"
        ? { href: "/projects", label: "프로젝트 찾기" }
        : { href: "/try", label: "무료로 AI 분석 받기" };

  return (
    <div className="space-y-24">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-100/60 blur-3xl" />
          <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-brand-50 blur-3xl" />
        </div>
        <div className="container-page grid items-center gap-10 pt-8 lg:grid-cols-2">
          <div className="animate-fade-in space-y-6">
            <span className="chip border border-brand-200 bg-brand-50 text-brand-700">
              <Icon name="sparkles" className="mr-1 h-3.5 w-3.5" />
              AI 기반 개발 외주 PM 플랫폼
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.15] text-gray-900 sm:text-5xl">
              막연한 아이디어를,
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                개발 가능한 명세
              </span>
              로.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-gray-600">
              생각을 입력하면 AI가 <b>몇 가지 질문</b>으로 요구사항을 구체화하고,
              기능·일정·마일스톤과 <b>PRD 문서</b>까지 자동으로 만들어줍니다.
              비용은 검증된 개발자가 <b>직접 입찰</b>하고, <b>단계별 안전결제(에스크로)</b>로 거래하세요.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={primaryCta.href} className="btn-primary btn-lg">
                {primaryCta.label}
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
              <Link href="/projects" className="btn-secondary btn-lg">
                프로젝트 둘러보기
              </Link>
            </div>
            <p className="text-xs text-gray-400">
              데모 계정 · 의뢰인 client@test.com / 개발자 dev@test.com (비밀번호
              test1234)
            </p>
          </div>

          {/* AI 흐름 미리보기 카드 */}
          <div className="animate-fade-in">
            <HeroFlowCard />
          </div>
        </div>
      </section>

      {/* ===== 신뢰 지표 ===== */}
      <section className="container-page">
        <div className="card grid grid-cols-3 divide-x divide-gray-100 p-2 shadow-soft">
          <Stat value={`${projectCount}건`} label="등록된 프로젝트" />
          <Stat value={`${freelancerCount}명`} label="활동 개발자" />
          <Stat value={`${completedCount}건`} label="완료된 거래" />
        </div>
      </section>

      {/* ===== 핵심 차별점 ===== */}
      <section className="container-page">
        <SectionHead
          eyebrow="WHY WORKBRIDGE"
          title="외주 실패의 원인을 구조로 없앱니다"
          desc="개발 외주가 어긋나는 건 '좋은 개발자가 없어서'가 아니라, 무엇을·어디까지·얼마에 만들지 합의되지 않아서입니다."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon="document"
            title="AI가 PRD까지 작성"
            desc="아이디어 → 추가 질문 → 답변 → 완성된 요구사항 정의서(PRD). 개발자에게 그대로 전달됩니다."
          />
          <Feature
            icon="shield"
            title="마일스톤 안전결제"
            desc="전체 선결제가 아니라 단계별로 예치·검수·승인 후 지급. 선결제 리스크를 줄입니다."
          />
          <Feature
            icon="scale"
            title="개발자 직접 입찰"
            desc="비용은 AI가 아니라 검증된 개발자가 직접 제안합니다. 입찰가는 의뢰인에게만 공개되며, 경력·포트폴리오와 함께 비교해 선택합니다."
          />
          <Feature
            icon="message"
            title="실시간 소통"
            desc="계약 전 문의부터 작업 중 협업까지, 의뢰인과 개발자가 바로 대화할 수 있습니다."
          />
        </div>
      </section>

      {/* ===== AI PRD 생성 흐름 (강조) ===== */}
      <section className="container-page">
        <div className="overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-8 sm:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <span className="chip bg-brand-100 text-brand-700">핵심 기능</span>
            <h2 className="mt-3 text-3xl font-extrabold text-gray-900">
              개발을 몰라도, 제대로 된 요구사항서가 나옵니다
            </h2>
            <p className="mt-3 text-gray-600">
              막막한 의뢰인과 개발자 사이의 이해 차이를 AI가 메웁니다.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <PrdStep
              n="1"
              icon="lightbulb"
              title="아이디어 입력"
              desc="“병원 예약 앱 만들고 싶어요” 처럼 평범한 말로 적으면 됩니다."
            />
            <PrdStep
              n="2"
              icon="sparkles"
              title="AI의 확인 질문에 답변"
              desc="“주 사용자는 누구인가요?” 같은 질문에 답하면 범위가 또렷해집니다."
            />
            <PrdStep
              n="3"
              icon="document"
              title="완성된 PRD 자동 생성"
              desc="기능·일정·마일스톤·검수 기준이 담긴 문서가 만들어져 개발자에게 전달됩니다."
            />
          </div>
          {user?.role !== "FREELANCER" && (
            <div className="mt-8 text-center">
              <Link
                href={user ? "/projects/new" : "/try"}
                className="btn-primary btn-lg"
              >
                {user ? "지금 내 아이디어로 만들어보기" : "가입 없이 무료로 체험하기"}
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ===== 전체 거래 흐름 ===== */}
      <section className="container-page">
        <SectionHead
          eyebrow="HOW IT WORKS"
          title="등록부터 정산·리뷰까지, 끊김 없이"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["아이디어 → AI 분석", "기능·일정·마일스톤·PRD 자동 생성"],
            ["프로젝트 등록 & 지원", "검증된 개발자가 입찰로 지원"],
            ["계약 & 전자 서명", "납품 범위·검수 기준을 명시한 계약 체결"],
            ["마일스톤 안전결제", "단계 금액을 에스크로로 예치"],
            ["납품 · 검수 · 정산", "승인 시 수수료 차감 후 단계별 지급"],
            ["완료 & 상호 리뷰", "평판이 쌓여 다음 거래로 이어집니다"],
          ].map(([title, desc], i) => (
            <div key={title} className="card card-hover p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="font-bold text-gray-900">{title}</p>
              </div>
              <p className="mt-2 pl-11 text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 모집 중 프로젝트 ===== */}
      {openProjects.length > 0 && (
        <section className="container-page">
          <div className="flex items-end justify-between">
            <SectionHead
              eyebrow="OPEN PROJECTS"
              title="지금 모집 중인 프로젝트"
              noMargin
            />
            <Link
              href="/projects"
              className="btn-ghost shrink-0 whitespace-nowrap"
            >
              전체 보기
              <Icon name="chevron-right" className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {openProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                applicantCount={p._count.applications}
              />
            ))}
          </div>
        </section>
      )}

      {/* ===== 개발자 대상 ===== */}
      <section className="container-page">
        <div className="grid items-center gap-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-soft sm:p-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold tracking-widest text-brand-500">
              FOR DEVELOPERS
            </p>
            <h2 className="mt-1.5 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              개발자세요? 요구사항이
              <br />
              <span className="text-brand-600">PRD로 정리된 프로젝트</span>만
              만나세요
            </h2>
            <p className="mt-3 leading-relaxed text-gray-600">
              "뭘 원하는지 모르는" 의뢰가 아니라, AI가 기능·범위·검수 기준까지
              정리해둔 프로젝트에 지원합니다. 견적·소통 비용은 줄고, 대금은
              마일스톤 에스크로로 안전하게 받습니다.
            </p>
            <div className="mt-6">
              <Link href="/projects" className="btn-primary btn-lg">
                지원할 프로젝트 보기
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="grid gap-3">
            {[
              ["document", "범위가 명확", "PRD·검수 기준이 정해져 있어 분쟁이 적습니다"],
              ["shield", "대금 안전", "마일스톤별 에스크로 예치 후 단계별 지급"],
              ["scale", "내가 제시하는 단가", "포트폴리오·경력 기반으로 직접 입찰"],
            ].map(([icon, title, desc]) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-card">
                  <Icon name={icon as IconName} className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-gray-900">{title}</p>
                  <p className="text-sm text-gray-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 하단 CTA ===== */}
      <section className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-500 px-8 py-14 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <h2 className="text-3xl font-extrabold">
            아이디어는 있는데, 어디서 시작할지 막막하셨다면
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-50">
            WorkBridge가 요구사항 정리부터 안전한 거래까지 함께합니다.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href={primaryCta.href}
              className="btn btn-lg bg-white text-brand-700 hover:bg-brand-50"
            >
              {primaryCta.label}
            </Link>
            <Link
              href="/projects"
              className="btn btn-lg border border-white/40 text-white hover:bg-white/10"
            >
              프로젝트 탐색
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- 보조 컴포넌트 ---------- */

function HeroFlowCard() {
  return (
    <div className="card relative space-y-3 p-6 shadow-lift">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
        <span className="ml-2">WorkBridge · AI 분석</span>
      </div>
      <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
        “동네 병원 온라인 예약 웹앱을 만들고 싶어요”
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-brand-600">
        <Icon name="sparkles" className="h-4 w-4" /> AI가 분석했어요
      </div>
      <div className="space-y-2">
        {[
          ["회원가입·로그인", "MVP 필수"],
          ["예약 등록·조회", "MVP 필수"],
          ["관리자 예약 관리", "MVP 필수"],
        ].map(([name, tag]) => (
          <div
            key={name}
            className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <Icon name="check-circle" className="h-4 w-4 text-brand-500" />
              <span className="text-sm font-medium text-gray-800">{name}</span>
              <span className="chip bg-brand-50 text-[10px] text-brand-700">
                {tag}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-xl bg-brand-600 px-4 py-3 text-white">
        <span className="text-sm">예상 기간 · 약 6주</span>
        <span className="text-sm font-bold">개발자 견적 받기 →</span>
      </div>
      <p className="text-center text-[11px] text-gray-400">
        💡 비용은 AI가 정하지 않습니다. 검증된 개발자들이 직접 입찰합니다.
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-4 py-5 text-center">
      <p className="text-2xl font-extrabold text-brand-600 sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  desc,
  noMargin,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  noMargin?: boolean;
}) {
  return (
    <div className={noMargin ? "" : "mb-8 max-w-2xl"}>
      <p className="text-xs font-bold tracking-widest text-brand-500">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 text-2xl font-extrabold text-gray-900 sm:text-3xl">
        {title}
      </h2>
      {desc && <p className="mt-2 leading-relaxed text-gray-600">{desc}</p>}
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: IconName;
  title: string;
  desc: string;
}) {
  return (
    <div className="card card-hover p-6">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-4 text-base font-bold text-gray-900">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{desc}</p>
    </div>
  );
}

function PrdStep({
  n,
  icon,
  title,
  desc,
}: {
  n: string;
  icon: IconName;
  title: string;
  desc: string;
}) {
  return (
    <div className="relative rounded-2xl border border-white bg-white/80 p-6 shadow-soft backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <span className="text-3xl font-black text-brand-100">{n}</span>
      </div>
      <p className="mt-3 font-bold text-gray-900">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{desc}</p>
    </div>
  );
}
