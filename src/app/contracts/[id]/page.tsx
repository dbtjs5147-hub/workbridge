import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseArray } from "@/lib/json";
import { formatKRW, formatDateTime } from "@/lib/format";
import { StatusBadge, InfoRow } from "@/components/ui";
import {
  CONTRACT_STATUS_LABEL,
  PROJECT_STATUS,
  ROLE_LABEL,
} from "@/lib/constants";
import { ContractFlow } from "./ContractFlow";
import { ChangeRequests } from "./ChangeRequests";
import { PrdSection } from "@/components/PrdSection";
import { CONTRACT_STATUS } from "@/lib/constants";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          milestones: { orderBy: { order: "asc" } },
          client: true,
        },
      },
      signatures: { include: { user: true } },
    },
  });
  if (!contract) notFound();

  const isClient = user.id === contract.clientId;
  const isFreelancer = user.id === contract.freelancerId;
  if (!isClient && !isFreelancer) {
    return (
      <div className="container-page max-w-xl">
        <div className="card p-8 text-center text-gray-500">
          계약 당사자만 열람할 수 있습니다.
        </div>
      </div>
    );
  }

  const freelancer = await prisma.user.findUnique({
    where: { id: contract.freelancerId },
  });

  // 마일스톤별 정산/납품 정보
  const settlements = await prisma.settlement.findMany({
    where: { milestoneId: { in: contract.project.milestones.map((m) => m.id) } },
  });
  const deliveries = await prisma.delivery.findMany({
    where: { milestoneId: { in: contract.project.milestones.map((m) => m.id) } },
    orderBy: { createdAt: "desc" },
  });
  const changeRequests = await prisma.changeRequest.findMany({
    where: { contractId: contract.id },
    orderBy: { createdAt: "desc" },
  });

  const mySigned = contract.signatures.some((s) => s.userId === user.id);
  const project = contract.project;
  const isCompleted = project.status === PROJECT_STATUS.COMPLETED;

  return (
    <div className="container-page max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/projects/${project.id}`} className="btn-ghost text-sm">
          ← {project.title}
        </Link>
        <StatusBadge status={contract.status} label={CONTRACT_STATUS_LABEL[contract.status]} />
      </div>

      {/* 계약서 핵심 요약 */}
      <div className="card p-6">
        <h1 className="text-xl font-bold text-gray-900">계약서</h1>
        <p className="mt-1 text-sm text-gray-500">{project.title}</p>

        <div className="mt-4 divide-y divide-gray-100">
          <InfoRow label="의뢰인">{contract.project.client.name}</InfoRow>
          <InfoRow label="프리랜서">{freelancer?.name ?? "-"}</InfoRow>
          <InfoRow label="합의 금액">{formatKRW(contract.agreedAmount)}</InfoRow>
          <InfoRow label="플랫폼 수수료">승인 금액의 10%</InfoRow>
          <InfoRow label="대금 지급 방식">
            마일스톤 단위 에스크로 (단계별 예치·검수·승인)
          </InfoRow>
        </div>

        {contract.contractScope && (
          <div className="mt-4">
            <p className="text-sm font-bold text-gray-800">납품 범위</p>
            <p className="mt-1 text-sm text-gray-600">{contract.contractScope}</p>
          </div>
        )}
        {contract.changeRequestPolicy && (
          <div className="mt-3">
            <p className="text-sm font-bold text-gray-800">변경 요청 처리 원칙</p>
            <p className="mt-1 text-sm text-gray-600">
              {contract.changeRequestPolicy}
            </p>
          </div>
        )}
      </div>

      {/* PRD 문서 — 계약된 개발자에게 전달 */}
      {project.prdDocument && (
        <PrdSection
          content={project.prdDocument}
          note="의뢰인의 아이디어를 AI가 정리한 개발 요구사항 정의서입니다. 작업 범위·검수 기준의 기준 문서로 활용하세요."
        />
      )}

      {/* 전자 서명 */}
      <div className="card p-6">
        <p className="text-sm font-bold text-gray-800">전자 서명 상태</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            { uid: contract.clientId, role: "CLIENT" },
            { uid: contract.freelancerId, role: "FREELANCER" },
          ].map(({ uid, role }) => {
            const sig = contract.signatures.find((s) => s.userId === uid);
            return (
              <div
                key={uid}
                className={`rounded-xl border p-3 text-center ${
                  sig ? "border-emerald-200 bg-emerald-50" : "border-gray-200"
                }`}
              >
                <p className="text-xs text-gray-500">{ROLE_LABEL[role]}</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-800">
                  {sig ? "✓ 서명 완료" : "서명 대기"}
                </p>
                {sig && (
                  <p className="text-xs text-gray-400">
                    {formatDateTime(sig.signedAt)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 거래 진행 (서명/결제/납품/검수) */}
      <ContractFlow
        contractId={contract.id}
        contractStatus={contract.status}
        projectStatus={project.status}
        isClient={isClient}
        isFreelancer={isFreelancer}
        mySigned={mySigned}
        milestones={project.milestones.map((m) => {
          const st = settlements.find((s) => s.milestoneId === m.id);
          const dv = deliveries.find((d) => d.milestoneId === m.id);
          return {
            id: m.id,
            title: m.title,
            amount: m.amount,
            status: m.status,
            order: m.order,
            deliverables: parseArray(m.deliverables),
            acceptanceCriteria: parseArray(m.acceptanceCriteria),
            settlement: st
              ? {
                  platformFee: st.platformFee,
                  freelancerPayoutAmount: st.freelancerPayoutAmount,
                }
              : null,
            delivery: dv
              ? {
                  description: dv.description,
                  deliveryUrl: dv.deliveryUrl,
                  status: dv.status,
                  revisionNote: dv.revisionNote,
                  attachmentUrls: parseArray(dv.attachmentUrls),
                }
              : null,
          };
        })}
      />

      {/* 변경 요청 (계약 체결 후) */}
      {contract.status === CONTRACT_STATUS.SIGNED && (
        <ChangeRequests
          contractId={contract.id}
          isClient={isClient}
          isFreelancer={isFreelancer}
          requests={changeRequests.map((cr) => ({
            id: cr.id,
            description: cr.description,
            reason: cr.reason,
            additionalBudget: cr.additionalBudget,
            status: cr.status,
            aiInScope: cr.aiInScope,
            aiOpinion: cr.aiOpinion,
          }))}
        />
      )}

      {/* 완료 시 리뷰 */}
      {isCompleted && (
        <div className="card flex items-center justify-between p-6">
          <div>
            <p className="font-bold text-gray-900">프로젝트가 완료되었습니다 🎉</p>
            <p className="text-sm text-gray-500">
              거래 상대에게 리뷰를 남겨주세요.
            </p>
          </div>
          <Link href={`/projects/${project.id}/review`} className="btn-primary">
            리뷰 작성
          </Link>
        </div>
      )}
    </div>
  );
}
