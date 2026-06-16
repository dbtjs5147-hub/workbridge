# 🚀 인터넷 배포 가이드 (Vercel + Neon + Vercel Blob)

이 문서는 WorkBridge를 **인터넷에 공개**하는 방법을 비개발자도 따라 할 수 있게 정리한 것입니다.
순서대로 따라 하면 됩니다. 막히면 멈추고 물어보세요.

> 준비물: GitHub 계정(이미 있음), 무료 Neon 계정, 무료 Vercel 계정
> 비용: 데모 규모는 **전부 무료 한도** 안에서 됩니다.
> (DB는 Neon이 아닌 다른 PostgreSQL이어도 동일하게 동작합니다 — 연결 주소만 다를 뿐)

---

## 1단계 — 데이터베이스 만들기 (Neon)

1. https://neon.tech 접속 → **Sign up** → GitHub로 로그인
2. 프로젝트 생성 화면에서
   - Project name: `workbridge`
   - Region: `Asia Pacific (Singapore)` 등 가까운 곳 선택
   - **Create project**
3. 생성되면 바로 **Connection string**(연결 주소)이 화면에 나옵니다. (안 보이면 좌측 **Dashboard** 또는 **Connect** 버튼)
   - 예: `postgresql://[사용자]:[비밀번호]@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
   - **"Pooled connection"(풀러)** 으로 표시된 주소를 복사하세요. (주소에 `-pooler` 가 들어감 → Vercel 같은 서버리스에 안정적)
4. ✅ 이 주소 전체가 `DATABASE_URL` 입니다. (비밀번호가 이미 포함되어 있어 따로 교체할 필요 없음)

> 💡 Neon은 비밀번호가 연결 주소 안에 이미 들어 있습니다. 화면을 닫으면 다시 보기 어려울 수 있으니
> **주소 전체를 안전한 곳에 복사·보관**해 두세요. (분실하면 대시보드에서 재발급 가능)

---

## 2단계 — DB에 표(테이블)와 시연 데이터 채우기

내 컴퓨터에서 한 번만 실행하면, 위 클라우드 DB에 모든 표와 데모 데이터가 들어갑니다.

1. 프로젝트 폴더의 `.env` 파일을 열어 `DATABASE_URL` 을 **1단계에서 만든 주소로 교체**
2. 터미널에서:
   ```bash
   npm run db:push    # 클라우드 DB에 표(테이블) 생성
   npm run db:seed    # 데모 계정·프로젝트 데이터 채우기
   ```
3. Neon 화면 → **Tables**(또는 SQL Editor) 에서 표들이 생겼는지 확인하면 끝.

> ⚠️ 이 작업 이후 로컬 개발도 같은 클라우드 DB를 바라봅니다(SQLite는 더 이상 안 씀).

---

## 3단계 — 파일 저장소 만들기 (나중에, Vercel Blob)

> 4단계(Vercel 배포)를 먼저 해서 프로젝트가 생긴 뒤에 하는 게 편합니다.

1. Vercel 프로젝트 화면 → **Storage** 탭 → **Create Database** → **Blob** 선택 → 생성
2. 생성 후 안내되는 **`BLOB_READ_WRITE_TOKEN`** 값을 복사
3. 5단계의 환경변수에 추가 (없어도 배포는 되지만, 업로드 파일이 안 남습니다)

---

## 4단계 — Vercel에 배포하기

1. https://vercel.com 접속 → **Sign Up** → GitHub로 로그인
2. **Add New… → Project**
3. `dbtjs5147-hub/workbridge` 저장소 옆 **Import** 클릭
4. **Framework Preset**: Next.js (자동 인식됨) — 그대로 둠
5. 아래 **Environment Variables**(환경변수)를 펼쳐 5단계 표대로 입력
6. **Deploy** 클릭 → 2~3분 기다리면 `https://workbridge-xxxx.vercel.app` 주소 생성 🎉

---

## 5단계 — 환경변수 입력 (Vercel)

Vercel의 **Settings → Environment Variables** 에서 아래를 추가합니다.
(값이 있는 것만 넣으면 되고, 나머지는 비워도 데모로 동작합니다.)

| 이름 | 값 | 필수? |
|------|-----|-------|
| `DATABASE_URL` | 1단계의 Neon 주소 | ✅ 필수 |
| `JWT_SECRET` | 아무 긴 랜덤 문자열(32자 이상) | ✅ 필수 |
| `NEXT_PUBLIC_APP_URL` | 배포된 주소 (예: `https://workbridge-xxxx.vercel.app`) | 권장 |
| `BLOB_READ_WRITE_TOKEN` | 3단계의 Blob 토큰 | 업로드 쓰려면 |
| `AI_PROVIDER` | `mock` (또는 실제 키 있으면 `anthropic`) | 선택 |
| `ANTHROPIC_API_KEY` | 실제 Claude 키 | 선택 |

> 환경변수를 **추가/변경한 뒤에는** Vercel의 **Deployments → 점 세 개 → Redeploy** 로 다시 배포해야 반영됩니다.

---

## ✅ 마무리 체크

- [ ] 배포된 주소로 접속해 홈이 뜬다
- [ ] 데모 계정(`client@test.com` / `test1234`)으로 로그인된다
- [ ] 프로젝트 목록에 시드 데이터가 보인다 (← DB 연결 성공 신호)
- [ ] (Blob 설정 시) 프로필에서 이미지 업로드가 된다

---

## 코드를 또 바꾸면?

GitHub `main` 에 새 커밋이 올라가면 **Vercel이 자동으로 다시 배포**합니다.
즉, 앞으로는 "GitHub에 올려줘"만 하면 인터넷 버전도 자동 갱신됩니다.

## 알아둘 한계 (데모이므로)

- 실제 결제·송금 없음(PG sandbox), 전자서명은 체크박스 동의 수준
- 실시간 채팅은 2초 폴링 방식
- Neon 무료 플랜은 일정 시간 미사용 시 절전(scale-to-zero)되어, 첫 접속이 1초 안팎 느릴 수 있음(이후 정상)
