import { parseArray } from "./json";

/**
 * 프리랜서가 입찰(지원)하기 위한 최소 프로필 검증.
 * "검증된 개발자"라는 포지셔닝을 뒷받침하기 위해, 프로필이 비어 있으면 입찰을 막는다.
 * 서버(우회 방지)와 화면에서 동일한 기준을 쓰도록 이 함수를 공용으로 사용한다.
 *
 * 기준(최소):
 *  - 주요 기술 스택 1개 이상
 *  - 포트폴리오 신호 1개 이상 (포트폴리오/GitHub/배포 URL 또는 포트폴리오 이미지)
 *
 * (경력 연차는 신입=0년도 유효해 단독 검증 의미가 없어 제외. 위 두 가지가 실질적 신뢰 신호.)
 */
export type FreelancerProfileLike = {
  skills?: string | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  deployedProjectUrl?: string | null;
  portfolioImages?: string | null;
} | null | undefined;

export function checkFreelancerProfile(fp: FreelancerProfileLike): {
  complete: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  const skills = parseArray(fp?.skills);
  if (skills.length === 0) missing.push("주요 기술 스택 (1개 이상)");

  const hasPortfolio = !!(
    fp?.portfolioUrl ||
    fp?.githubUrl ||
    fp?.deployedProjectUrl ||
    parseArray(fp?.portfolioImages).length > 0
  );
  if (!hasPortfolio)
    missing.push("포트폴리오 (링크 또는 이미지 1개 이상)");

  return { complete: missing.length === 0, missing };
}
