import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateMockAnalysis } from "../src/lib/ai/mock";
import { generateMockPRD } from "../src/lib/ai/prd";

const prisma = new PrismaClient();
const J = (arr: unknown[]) => JSON.stringify(arr);
const PASSWORD = "test1234";

async function main() {
  console.log("🌱 시드 데이터 초기화...");

  // 기존 데이터 정리 (의존성 역순)
  await prisma.review.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.contractSignature.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.application.deleteMany();
  await prisma.projectMilestone.deleteMany();
  await prisma.projectFeature.deleteMany();
  await prisma.aIAnalysis.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.project.deleteMany();
  await prisma.freelancerProfile.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash(PASSWORD, 10);

  // --- 의뢰인 ---
  const client1 = await prisma.user.create({
    data: {
      name: "김의뢰",
      email: "client@test.com",
      passwordHash: hash,
      role: "CLIENT",
      bio: "헬스케어 분야 예비창업자입니다.",
      clientProfile: {
        create: {
          companyName: "헬스링크",
          industry: "헬스케어",
          websiteUrl: "https://healthlink.example.com",
        },
      },
    },
  });
  const client2 = await prisma.user.create({
    data: {
      name: "박대표",
      email: "client2@test.com",
      passwordHash: hash,
      role: "CLIENT",
      bio: "소상공인 커머스 운영 중입니다.",
      clientProfile: {
        create: { companyName: "마켓플러스", industry: "리테일" },
      },
    },
  });

  // --- 프리랜서 ---
  const dev1 = await prisma.user.create({
    data: {
      name: "이개발",
      email: "dev@test.com",
      passwordHash: hash,
      role: "FREELANCER",
      bio: "웹/앱 풀스택 8년차. 예약·커머스 서비스 다수 경험.",
      freelancerProfile: {
        create: {
          categories: J(["웹 MVP 개발", "앱 MVP 개발"]),
          skills: J(["Next.js", "TypeScript", "Node.js", "PostgreSQL", "React Native"]),
          experienceYears: 8,
          hourlyRate: 60000,
          portfolioUrl: "https://portfolio.example.com/lee",
          githubUrl: "https://github.com/lee-dev",
          deployedProjectUrl: "https://demo.example.com",
          projectTypeExperience: J(["예약", "커머스", "SaaS"]),
        },
      },
    },
  });
  const dev2 = await prisma.user.create({
    data: {
      name: "최풀스택",
      email: "dev2@test.com",
      passwordHash: hash,
      role: "FREELANCER",
      bio: "백엔드 중심 풀스택 6년차.",
      freelancerProfile: {
        create: {
          categories: J(["SaaS 개발", "AI 기능 도입"]),
          skills: J(["Python", "Django/FastAPI", "React", "AWS", "OpenAI API"]),
          experienceYears: 6,
          hourlyRate: 55000,
          portfolioUrl: "https://portfolio.example.com/choi",
          githubUrl: "https://github.com/choi-dev",
          projectTypeExperience: J(["SaaS", "AI", "관리자"]),
        },
      },
    },
  });
  const dev3 = await prisma.user.create({
    data: {
      name: "정프론트",
      email: "dev3@test.com",
      passwordHash: hash,
      role: "FREELANCER",
      bio: "프론트엔드 전문 4년차.",
      freelancerProfile: {
        create: {
          categories: J(["웹 MVP 개발"]),
          skills: J(["React", "Next.js", "TypeScript", "Figma"]),
          experienceYears: 4,
          hourlyRate: 45000,
          projectTypeExperience: J(["커뮤니티", "랜딩"]),
        },
      },
    },
  });

  // AI 분석 결과로 프로젝트를 생성하는 헬퍼
  async function createAnalyzedProject(opts: {
    clientId: string;
    idea: string;
    category: string;
    title: string;
    status: string;
    daysFromNow: { start: number; end: number };
  }) {
    const analysis = generateMockAnalysis({
      idea: opts.idea,
      category: opts.category,
    });
    const prd = generateMockPRD(opts.idea, analysis, [], opts.title);
    const now = Date.now();
    const project = await prisma.project.create({
      data: {
        clientId: opts.clientId,
        title: opts.title,
        description: opts.idea,
        category: opts.category,
        budget: analysis.estimatedTotalCost,
        recruitStartDate: new Date(now + opts.daysFromNow.start * 86400000),
        recruitEndDate: new Date(now + opts.daysFromNow.end * 86400000),
        requiredSkills: J(analysis.recommendedTechStack),
        status: opts.status,
        prdDocument: prd,
        aiAnalysis: {
          create: {
            rawInput: opts.idea,
            projectSummary: analysis.projectSummary,
            userTypes: J(analysis.userTypes),
            estimatedTotalCost: analysis.estimatedTotalCost,
            estimatedDurationWeeks: analysis.estimatedDurationWeeks,
            recommendedTechStack: J(analysis.recommendedTechStack),
            risks: J(analysis.risks),
            clarifyingQuestions: J(analysis.clarifyingQuestions),
            contractScopeDraft: analysis.contractScopeDraft,
            rawJson: JSON.stringify(analysis),
          },
        },
      },
    });

    // 기능 (필수 + 선택 + 제외)
    const featureRows = [
      ...analysis.features.map((f) => ({
        name: f.name,
        description: f.description,
        priority: f.priority,
        estimatedCost: f.estimatedCost,
        rationale: f.rationale,
      })),
      ...analysis.optionalFeatures.map((o) => ({
        name: o.name,
        description: o.reason,
        priority: "OPTIONAL",
        estimatedCost: 0,
        rationale: o.reason,
      })),
      ...analysis.excludedScope.map((e) => ({
        name: e,
        description: "초기 범위에서 제외",
        priority: "EXCLUDED",
        estimatedCost: 0,
        rationale: "MVP 이후 고도화 권장",
      })),
    ];
    await prisma.projectFeature.createMany({
      data: featureRows.map((f) => ({ ...f, projectId: project.id })),
    });

    // 마일스톤
    await prisma.projectMilestone.createMany({
      data: analysis.milestones.map((m, i) => ({
        projectId: project.id,
        title: m.title,
        description: "",
        deliverables: J(m.deliverables),
        acceptanceCriteria: J(m.acceptanceCriteria),
        amount: m.amount,
        order: i,
        status: "PENDING",
      })),
    });

    return project;
  }

  // 1) 모집 중 — 병원 예약 웹앱
  const proj1 = await createAnalyzedProject({
    clientId: client1.id,
    idea: "동네 병원에서 환자가 진료를 온라인으로 예약하고, 병원 관리자는 예약 현황을 관리하는 웹 서비스를 만들고 싶어요.",
    category: "웹 MVP 개발",
    title: "병원 예약 웹앱 MVP",
    status: "OPEN",
    daysFromNow: { start: -2, end: 14 },
  });

  // 2) 모집 중 — 커머스 관리자
  const proj2 = await createAnalyzedProject({
    clientId: client2.id,
    idea: "온라인 쇼핑몰의 상품 등록, 주문 관리, 매출 통계를 볼 수 있는 관리자 백오피스가 필요합니다.",
    category: "관리자/백오피스 개발",
    title: "쇼핑몰 운영 관리자 페이지",
    status: "OPEN",
    daysFromNow: { start: 0, end: 20 },
  });

  // 3) 작업 중 — AI 문서요약 SaaS (계약/결제까지 진행된 상태)
  const proj3 = await createAnalyzedProject({
    clientId: client1.id,
    idea: "업로드한 문서를 AI가 자동 요약해주고, 팀원과 공유하는 SaaS 대시보드를 만들고 싶습니다.",
    category: "SaaS 개발",
    title: "AI 문서요약 SaaS",
    status: "IN_PROGRESS",
    daysFromNow: { start: -20, end: -5 },
  });

  // 4) 완료됨 — 맛집 커뮤니티 (리뷰 작성됨)
  const proj4 = await createAnalyzedProject({
    clientId: client2.id,
    idea: "지역 맛집을 추천하고 사용자들이 후기를 남기는 커뮤니티 앱을 만들고 싶어요.",
    category: "앱 MVP 개발",
    title: "맛집 커뮤니티 앱",
    status: "COMPLETED",
    daysFromNow: { start: -40, end: -25 },
  });

  // --- 지원서 ---
  // proj1: dev1, dev2 지원 (검토 중)
  await prisma.application.create({
    data: {
      projectId: proj1.id,
      freelancerId: dev1.id,
      coverLetter: "예약 서비스를 3건 이상 개발한 경험이 있습니다.",
      proposedAmount: proj1.budget,
      proposedDuration: "6주",
      relatedExperience: "병원/미용실 예약 시스템 구축",
      proposalText: "1차에 인증/예약 핵심을 빠르게 완성하겠습니다.",
      status: "PENDING",
    },
  });
  await prisma.application.create({
    data: {
      projectId: proj1.id,
      freelancerId: dev2.id,
      coverLetter: "백엔드 안정성에 강점이 있습니다.",
      proposedAmount: Math.round(proj1.budget * 0.95),
      proposedDuration: "7주",
      relatedExperience: "SaaS 결제/구독 시스템",
      proposalText: "확장성을 고려한 설계로 진행하겠습니다.",
      status: "PENDING",
    },
  });
  // proj2: dev3 지원
  await prisma.application.create({
    data: {
      projectId: proj2.id,
      freelancerId: dev3.id,
      coverLetter: "관리자 화면 UI/UX에 자신 있습니다.",
      proposedAmount: proj2.budget,
      proposedDuration: "5주",
      relatedExperience: "운영 대시보드 다수",
      proposalText: "사용성 높은 관리자 화면을 만들겠습니다.",
      status: "PENDING",
    },
  });

  // proj3: dev1 수락됨 + 계약 + 결제 (작업 중)
  const app3 = await prisma.application.create({
    data: {
      projectId: proj3.id,
      freelancerId: dev1.id,
      coverLetter: "AI 연동 SaaS 경험이 있습니다.",
      proposedAmount: proj3.budget,
      proposedDuration: "6주",
      relatedExperience: "LLM 기반 요약 서비스",
      proposalText: "안정적인 AI 파이프라인을 구축하겠습니다.",
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });
  const ai3 = await prisma.aIAnalysis.findUnique({
    where: { projectId: proj3.id },
  });
  const contract3 = await prisma.contract.create({
    data: {
      projectId: proj3.id,
      applicationId: app3.id,
      clientId: client1.id,
      freelancerId: dev1.id,
      agreedAmount: proj3.budget,
      contractScope: ai3?.contractScopeDraft ?? "",
      excludedScope: "외부 정산/세무 시스템 연동, 다국어 지원",
      changeRequestPolicy: "계약 범위 외 추가 요청은 변경 요청 절차를 통해 처리한다.",
      status: "SIGNED",
      contractBody: "본 계약은 WorkBridge MVP 데모용 계약 템플릿입니다.",
    },
  });
  await prisma.contractSignature.createMany({
    data: [
      { contractId: contract3.id, userId: client1.id, signatureType: "checkbox" },
      { contractId: contract3.id, userId: dev1.id, signatureType: "checkbox" },
    ],
  });
  // proj3 1차 마일스톤 결제 완료 → 작업 중
  const ms3 = await prisma.projectMilestone.findMany({
    where: { projectId: proj3.id },
    orderBy: { order: "asc" },
  });
  if (ms3[0]) {
    await prisma.projectMilestone.update({
      where: { id: ms3[0].id },
      data: { status: "IN_PROGRESS" },
    });
    await prisma.payment.create({
      data: {
        projectId: proj3.id,
        contractId: contract3.id,
        milestoneId: ms3[0].id,
        clientId: client1.id,
        freelancerId: dev1.id,
        amount: ms3[0].amount,
        pgProvider: "mock",
        pgTransactionId: "mock_tx_seed_3",
        status: "PAID",
        paidAt: new Date(),
      },
    });
  }

  // proj4: dev1 완료 + 모든 마일스톤 정산 + 상호 리뷰
  const app4 = await prisma.application.create({
    data: {
      projectId: proj4.id,
      freelancerId: dev1.id,
      coverLetter: "커뮤니티 앱 경험 다수.",
      proposedAmount: proj4.budget,
      proposedDuration: "5주",
      relatedExperience: "맛집/여행 커뮤니티",
      proposalText: "완성도 높게 마무리하겠습니다.",
      status: "ACCEPTED",
      acceptedAt: new Date(Date.now() - 30 * 86400000),
    },
  });
  const contract4 = await prisma.contract.create({
    data: {
      projectId: proj4.id,
      applicationId: app4.id,
      clientId: client2.id,
      freelancerId: dev1.id,
      agreedAmount: proj4.budget,
      contractScope: "맛집 등록, 후기, 추천 기능 포함",
      excludedScope: "실시간 채팅",
      changeRequestPolicy: "변경 요청 절차 준수",
      status: "SIGNED",
      contractBody: "WorkBridge MVP 데모용 계약 템플릿",
    },
  });
  await prisma.contractSignature.createMany({
    data: [
      { contractId: contract4.id, userId: client2.id, signatureType: "checkbox" },
      { contractId: contract4.id, userId: dev1.id, signatureType: "checkbox" },
    ],
  });
  const ms4 = await prisma.projectMilestone.findMany({
    where: { projectId: proj4.id },
    orderBy: { order: "asc" },
  });
  for (const m of ms4) {
    const pay = await prisma.payment.create({
      data: {
        projectId: proj4.id,
        contractId: contract4.id,
        milestoneId: m.id,
        clientId: client2.id,
        freelancerId: dev1.id,
        amount: m.amount,
        pgProvider: "mock",
        pgTransactionId: `mock_tx_seed_4_${m.order}`,
        status: "PAID",
        paidAt: new Date(Date.now() - 28 * 86400000),
      },
    });
    const fee = Math.round(m.amount * 0.1);
    await prisma.settlement.create({
      data: {
        paymentId: pay.id,
        milestoneId: m.id,
        grossAmount: m.amount,
        platformFee: fee,
        freelancerPayoutAmount: m.amount - fee,
        status: "SETTLED",
        settledAt: new Date(Date.now() - 26 * 86400000),
      },
    });
    await prisma.projectMilestone.update({
      where: { id: m.id },
      data: { status: "SETTLED" },
    });
  }
  // 상호 리뷰
  await prisma.review.create({
    data: {
      projectId: proj4.id,
      reviewerId: client2.id,
      revieweeId: dev1.id,
      rating: 5,
      content: "요구사항 이해가 빠르고 일정도 잘 지켰습니다. 추천합니다!",
      tags: J(["기술력 우수", "일정 준수", "커뮤니케이션 원활"]),
    },
  });
  await prisma.review.create({
    data: {
      projectId: proj4.id,
      reviewerId: dev1.id,
      revieweeId: client2.id,
      rating: 5,
      content: "피드백이 명확하고 결제도 신뢰할 수 있었습니다.",
      tags: J(["요구사항 명확", "결제 신뢰", "협업 태도 우수"]),
    },
  });

  // --- 북마크 & 알림 ---
  await prisma.bookmark.create({
    data: { projectId: proj2.id, freelancerId: dev1.id },
  });
  await prisma.notification.createMany({
    data: [
      {
        userId: client1.id,
        type: "APPLICATION_RECEIVED",
        title: "새 지원자가 있습니다",
        message: "병원 예약 웹앱 MVP에 이개발님이 지원했습니다.",
        targetUrl: `/projects/${proj1.id}/applicants`,
      },
      {
        userId: dev1.id,
        type: "REVIEW_REQUESTED",
        title: "리뷰가 도착했습니다",
        message: "맛집 커뮤니티 앱 프로젝트의 리뷰를 확인하세요.",
        targetUrl: `/projects/${proj4.id}`,
        isRead: true,
        readAt: new Date(),
      },
    ],
  });

  // --- 샘플 대화(채팅) ---
  const convo = await prisma.conversation.create({
    data: {
      projectId: proj1.id,
      clientId: client1.id,
      freelancerId: dev1.id,
    },
  });
  await prisma.message.createMany({
    data: [
      {
        conversationId: convo.id,
        senderId: dev1.id,
        content: "안녕하세요! 병원 예약 웹앱 프로젝트에 관심이 있어 문의드립니다.",
        isRead: true,
      },
      {
        conversationId: convo.id,
        senderId: client1.id,
        content: "네 안녕하세요. 예약 변경/취소 정책도 포함될 수 있을까요?",
        isRead: true,
      },
      {
        conversationId: convo.id,
        senderId: dev1.id,
        content: "물론입니다. 취소 가능 시간 제한도 설정할 수 있게 구현하겠습니다.",
        isRead: false,
      },
    ],
  });

  console.log("✅ 시드 완료");
  console.log("\n데모 계정 (비밀번호: test1234)");
  console.log("  의뢰인   : client@test.com / client2@test.com");
  console.log("  프리랜서 : dev@test.com / dev2@test.com / dev3@test.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
