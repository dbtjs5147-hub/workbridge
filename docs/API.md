# WorkBridge API 명세서

WorkBridge의 모든 HTTP API 엔드포인트 정의 문서입니다. (Next.js App Router 라우트 핸들러 기준)

- **Base URL**: 로컬 `http://localhost:3000` · 배포 `https://workbridge-mu.vercel.app`
- 모든 경로는 `/api` 접두사를 가집니다.
- 본 문서의 코드가 단일 출처입니다. 라우트가 바뀌면 이 문서도 갱신하세요.

---

## 1. 공통 규약

### 인증
- 로그인 성공 시 **httpOnly 쿠키 `wb_token`**(JWT, 7일)이 발급됩니다. 이후 요청은 이 쿠키로 인증됩니다.
- 별도 토큰 헤더(Authorization)는 사용하지 않습니다(브라우저 세션 기반).

### 권한 등급(각 엔드포인트의 "인증" 칼럼)
| 표기 | 의미 | 실패 시 |
|---|---|---|
| 공개 | 비로그인 허용 | — |
| 사용자 | 로그인 필요(`requireUser`) | 401 |
| 의뢰인 | `role=CLIENT` 필요(`requireRole`) | 미로그인 401 / 역할불일치 403 |
| 프리랜서 | `role=FREELANCER` 필요 | 미로그인 401 / 역할불일치 403 |

### 응답 형식(공통 봉투)
- 성공: `{ "ok": true, "data": <결과> }`
- 실패: `{ "ok": false, "error": "<메시지>" }` + HTTP 상태코드 (일부는 `retryAfter` 등 추가 필드)

### 상태 코드
| 코드 | 의미 |
|---|---|
| 200 | 성공 |
| 400 | 입력값 오류·상태 충돌 |
| 401 | 미인증 |
| 402 | 결제 승인 실패(토스) |
| 403 | 권한 없음(역할·소유권) |
| 404 | 리소스 없음 |
| 409 | 중복(이미 가입/이미 처리/이미 작성) |
| 429 | 요청 과다(rate limit) — `retryAfter`(초) 포함 |
| 500 | 서버 오류(AI/PRD 생성 실패 등) |

### Rate Limit (IP 기준)
| 엔드포인트 | 한도 |
|---|---|
| `POST /api/auth/login` | 10회 / 5분 |
| `POST /api/auth/signup` | 5회 / 1시간 |
| `POST /api/auth/request-reset` | 5회 / 30분 |
| `POST /api/auth/reset-password` | 10회 / 30분 |
| `POST /api/public/analysis·prd·followup` | 15회 / 10분 |

> 참고: 프로젝트 목록·상세, 마이페이지, 계약 페이지 등 **조회 화면은 서버 컴포넌트가 DB를 직접 읽어** 렌더링하며 별도 REST 조회 API가 없습니다. 아래는 변경(mutation) 및 일부 조회(메시지 폴링) 엔드포인트입니다.

---

## 2. 인증 (Auth)

### POST `/api/auth/signup` — 회원가입
- 인증: 공개 · Rate limit: 5/1시간
- Body: `{ "name": string(1~50), "email": string(email), "password": string(8~128), "role"?: "CLIENT"|"FREELANCER" }`
- 동작: 계정 생성 → 인증 메일 발송(베스트에포트) → 세션 쿠키 발급
- 200: `{ id, role }` · 409: 이미 가입된 이메일

### POST `/api/auth/login` — 로그인
- 인증: 공개 · Rate limit: 10/5분
- Body: `{ "email": string, "password": string }`
- 200: `{ id, role }` · 401: 이메일/비밀번호 불일치

### POST `/api/auth/logout` — 로그아웃
- 인증: 공개(쿠키 삭제) · Body 없음 · 200: `{ success: true }`

### POST `/api/auth/select-role` — 역할 선택(최초 1회)
- 인증: 사용자
- Body: `{ "role": "CLIENT"|"FREELANCER" }`
- 200: `{ role }` · 409: 이미 역할 설정됨

### GET `/api/auth/verify-email?token=...` — 이메일 인증
- 인증: 공개(토큰 기반) · 동작: 토큰 검증 → 인증 완료 처리
- 응답: `/login?verify=success` 또는 `/login?verify=invalid` 로 **리다이렉트(307)**

### POST `/api/auth/request-reset` — 비밀번호 재설정 메일 요청
- 인증: 공개 · Rate limit: 5/30분
- Body: `{ "email": string }`
- 200: `{ sent: true }` (계정 존재 여부 비노출 — 항상 동일 응답)

### POST `/api/auth/reset-password` — 비밀번호 변경
- 인증: 공개(토큰 기반) · Rate limit: 10/30분
- Body: `{ "token": string, "password": string(8~128) }`
- 200: `{ success: true }` · 400: 토큰 만료/무효

### GET `/api/auth/oauth/{provider}` — 소셜 로그인 시작
- 인증: 공개 · `provider` = `google` | `kakao`
- 동작: 키 설정 시 공급자 인증 URL로 **리다이렉트**(state 쿠키 발급). 미설정 시 개발=데모 로그인 / 운영=`/login?error=oauth_unavailable`

### GET `/api/auth/oauth/{provider}/callback` — 소셜 로그인 콜백
- 인증: 공개(공급자 리다이렉트) · Query: `code`, `state`
- 동작: state(CSRF) 검증 → 토큰 교환 → 프로필 조회 → 이메일로 계정 매칭/생성 → 세션 발급
- 응답: 역할 있으면 `/`, 없으면 `/role-select` 로 리다이렉트. 실패 시 `/login?error=...`

---

## 3. 사용자 / 업로드

### PATCH `/api/users/me` — 내 프로필 수정
- 인증: 사용자
- Body(모두 선택): `{ name?, bio?, profileImageUrl?, client?: { companyName?, industry?, websiteUrl? }, freelancer?: { categories?: string[], skills?: string[], experienceYears?: number, hourlyRate?: number, portfolioUrl?, githubUrl?, deployedProjectUrl?, projectTypeExperience?: string[], portfolioImages?: string[] } }`
- 동작: 역할에 맞는 프로필을 upsert · 200: `{ success: true }`

### POST `/api/upload` — 파일 업로드
- 인증: 사용자 · Content-Type: `multipart/form-data`
- Form field: `file` (이미지 jpg/png/webp/gif 또는 PDF, 10MB 이하)
- 동작: `BLOB_READ_WRITE_TOKEN` 있으면 Vercel Blob, 없으면 로컬 `public/uploads`
- 200: `{ url, name, kind: "image"|"pdf" }` · 400: 형식/크기 오류

---

## 4. AI (인증)

> 가격은 산정하지 않으며, 분석 결과는 참고용입니다. 공급자: `AI_PROVIDER`(gemini/anthropic/openai), 키 없으면 mock 폴백.

### POST `/api/ai/project-analysis` — 아이디어 분석
- 인증: 의뢰인
- Body: `AnalysisInput` = `{ "idea": string(10자 이상, 필수), category?, desiredSchedule?, budgetRange?, mustHave?, referenceUrl?, platform?, constraints? }`
- 200: `{ result: AnalysisResult, provider: string, usedFallback: boolean }` · 500: 분석 실패
- `AnalysisResult` 주요 필드: `projectSummary, userTypes[], features[], optionalFeatures[], excludedScope[], recommendedTechStack[], estimatedDurationWeeks, milestones[], risks[], clarifyingQuestions[], contractScopeDraft` (※ 비용 관련 필드는 내부 보관, UI 비노출)

### POST `/api/ai/followup` — 후속(심화) 질문 생성
- 인증: 의뢰인
- Body: `{ "idea": string, "analysis": AnalysisResult, "answers": [{ question, answer }] }`
- 200: `{ questions: string[], provider }` (실패해도 빈 배열로 진행 가능)

### POST `/api/ai/generate-prd` — PRD 문서 생성
- 인증: 의뢰인
- Body: `{ "idea": string, "title": string, "analysis": AnalysisResult, "answers": [{ question, answer }] }`
- 200: `{ prd: string(markdown), provider }` · 500: 생성 실패

---

## 5. AI (공개 — 비로그인 체험)

> DB에 저장하지 않음. Rate limit 15/10분(IP). 본문 스키마는 4번과 동일.

| 엔드포인트 | Body | 응답 |
|---|---|---|
| `POST /api/public/analysis` | `AnalysisInput` (idea ≤ 2000자) | `{ result, provider, usedFallback }` |
| `POST /api/public/followup` | `{ idea, analysis, answers }` | `{ questions, provider }` |
| `POST /api/public/prd` | `{ idea, title, analysis, answers }` | `{ prd, provider }` |

---

## 6. 프로젝트

### POST `/api/projects` — 프로젝트 등록
- 인증: 의뢰인
- Body: `{ "title": string, "description": string, "category": string, "budget": number(≥0), recruitStartDate?: string, recruitEndDate?: string, requiredSkills?: string[], analysis?: AnalysisResult, prdDocument?: string, clarifyingAnswers?: [{question, answer}] }`
- 동작: 프로젝트 + (분석 있으면) 기능·마일스톤 생성. `budget=0`이면 "개발자 견적 받는 중"으로 표시.
- 200: `{ id }`

### POST `/api/projects/{id}/applications` — 프로젝트 입찰(지원)
- 인증: 프리랜서
- 사전조건: **최소 프로필(기술 1+ · 포트폴리오 1+)** 충족해야 함(미충족 시 403, 누락 항목 안내)
- Body: `{ "coverLetter": string, "proposedAmount": number(≥0), "proposedDuration": string, "relatedExperience"?: string, "proposalText"?: string }`
- 200: `{ success: true }` · 403: 프로필 미완성 · 409: 이미 지원 · 400: 모집중 아님

### POST `/api/projects/{id}/bookmark` — 북마크 추가
- 인증: 프리랜서 · Body 없음 · 200: `{ bookmarked: true }`

### DELETE `/api/projects/{id}/bookmark` — 북마크 해제
- 인증: 프리랜서 · 200: `{ bookmarked: false }`

### POST `/api/projects/{id}/reviews` — 리뷰 작성
- 인증: 사용자(거래 당사자) · 사전조건: 프로젝트 `COMPLETED`
- Body: `{ "rating": number(1~5), "content"?: string, "tags"?: string[] }`
- 200: `{ success: true }` · 409: 이미 작성 · 403: 당사자 아님

---

## 7. 지원 / 계약 / 변경요청

### POST `/api/applications/{id}/accept` — 입찰 수락
- 인증: 의뢰인(본인 프로젝트)
- 동작: 지원 수락 → 다른 지원자 자동 거절 → 계약서(서명 대기) 자동 생성 → **입찰가를 마일스톤에 배분**(에스크로 금액=입찰가) → 알림
- 200: `{ contractId }` · 400: 이미 처리/계약 존재

### POST `/api/applications/{id}/reject` — 입찰 거절
- 인증: 의뢰인(본인 프로젝트) · 200: `{ success: true }`

### POST `/api/contracts/{id}/sign` — 전자 서명
- 인증: 사용자(계약 당사자) · 방식: 체크박스 동의(서명 IP/UA 기록, 멱등)
- 동작: 양측 서명 완료 시 계약 `SIGNED` → 프로젝트 결제 대기 → 1차 마일스톤 결제 대기 전환 → 상대 알림
- 200: `{ bothSigned: boolean }` · 403: 당사자 아님

### POST `/api/contracts/{id}/change-requests` — 변경 요청 등록
- 인증: 의뢰인(본인 계약) · 사전조건: 계약 `SIGNED`
- Body: `{ "description": string, "reason"?: string, "additionalBudget"?: number(≥0), "desiredDueDate"?: string }`
- 동작: AI가 기존 범위 포함 여부 참고 의견 생성 → 변경요청 저장 → 프리랜서 알림
- 200: `{ id, aiInScope: boolean|null, aiOpinion: string|null }`

### POST `/api/change-requests/{id}/accept` — 변경 요청 수락
- 인증: 프리랜서(담당) · 동작: `additionalBudget>0`이면 추가 마일스톤(결제 대기) 생성 → 의뢰인 알림
- 200: `{ success: true }`

### POST `/api/change-requests/{id}/reject` — 변경 요청 거절
- 인증: 프리랜서(담당) · 200: `{ success: true }`

---

## 8. 마일스톤 / 결제

### POST `/api/milestones/{id}/pay` — 마일스톤 결제(mock)
- 인증: 의뢰인(본인 프로젝트)
- 동작: **토스 미설정 시에만 동작**(mock 즉시 결제 처리). 토스 설정 시 400 반환(결제창 흐름 사용). 멱등 처리.
- 200: `{ success: true }` 또는 `{ alreadyPaid: true }` · 400: 토스 활성 시/상태 불일치

### POST `/api/payments/confirm` — 토스 결제 승인(서버 검증)
- 인증: 의뢰인 · 사전조건: 토스 설정됨(`TOSS_SECRET_KEY`)
- Body: `{ "paymentKey": string, "orderId": string(형식 ms_<milestoneId>_<ts>), "amount": number(>0) }`
- 동작: 토스 승인 API 호출 → 금액 위변조 검증(DB 마일스톤 금액과 대조) → 결제 확정 + 작업 시작 전환
- 200: `{ success: true }` · 402: 토스 승인 실패 · 400: 금액 불일치/상태 오류

### POST `/api/milestones/{id}/delivery-request` — 납품 요청
- 인증: 프리랜서(담당) · 사전조건: 마일스톤 `IN_PROGRESS`
- Body: `{ "description": string, "deliveryUrl"?: string, "attachmentUrls"?: string[] }`
- 200: `{ success: true }`

### POST `/api/milestones/{id}/revision-request` — 수정 요청
- 인증: 의뢰인(본인 프로젝트) · 사전조건: 마일스톤 `DELIVERY_REQUESTED`
- Body: `{ "reason": string }` · 동작: 다시 작업 중으로 복귀 + 프리랜서 알림
- 200: `{ success: true }`

### POST `/api/milestones/{id}/approve` — 검수 승인 + 정산
- 인증: 의뢰인(본인 프로젝트) · 사전조건: 마일스톤 `DELIVERY_REQUESTED`
- 동작: 마일스톤 정산(수수료 `PLATFORM_FEE_RATE` 차감) → 다음 마일스톤 결제 대기 전환 또는 전체 완료 시 프로젝트 `COMPLETED` + 상호 리뷰 알림
- 200: `{ completed: boolean }`

---

## 9. 메시지 / 알림

### POST `/api/conversations` — 대화방 찾기/생성
- 인증: 사용자(역할 필요)
- Body: `{ "projectId": string, "freelancerId"?: string }` (의뢰인이 시작할 땐 freelancerId 필수)
- 200: `{ id }` (대화방 ID, find-or-create)

### GET `/api/conversations/{id}/messages?after=ISO` — 메시지 조회(폴링)
- 인증: 사용자(대화 참여자) · Query: `after`(선택, 이 시각 이후만)
- 동작: 메시지 반환 + 상대 메시지 읽음 처리
- 200: `{ messages: [{ id, content, senderId, mine, createdAt }] }`

### POST `/api/conversations/{id}/messages` — 메시지 전송
- 인증: 사용자(대화 참여자)
- Body: `{ "content": string(1~2000) }`
- 200: `{ message: { id, content, senderId, mine: true, createdAt } }`

### POST `/api/notifications/{id}/read` — 알림 읽음
- 인증: 사용자 · 200: `{ success: true }`

### POST `/api/notifications/read-all` — 모든 알림 읽음
- 인증: 사용자 · 200: `{ success: true }`

---

## 부록: 상태값 흐름 (참고)

- **프로젝트**: OPEN → SIGNATURE_PENDING → PAYMENT_PENDING → IN_PROGRESS → UNDER_REVIEW → (반복) → COMPLETED
- **마일스톤**: PENDING → PAYMENT_PENDING → IN_PROGRESS → DELIVERY_REQUESTED → SETTLED
- **계약**: WAITING_SIGNATURE → SIGNED
- **지원**: PENDING → ACCEPTED / REJECTED / AUTO_REJECTED

정확한 상수·라벨은 `src/lib/constants.ts` 참고.
