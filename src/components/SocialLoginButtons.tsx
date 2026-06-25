"use client";

// 소셜 로그인 버튼(링크). 표시 조건:
//  - 개발 환경: 항상 표시(데모 로그인 가능)
//  - 프로덕션: NEXT_PUBLIC_GOOGLE_ENABLED / NEXT_PUBLIC_KAKAO_ENABLED 가 "1" 일 때만 표시
//    (실제 OAuth 키를 설정한 뒤 이 플래그를 켜세요)
const isDev = process.env.NODE_ENV !== "production";
const showGoogle = isDev || process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "1";
const showKakao = isDev || process.env.NEXT_PUBLIC_KAKAO_ENABLED === "1";

export function SocialLoginButtons({ label = "계속하기" }: { label?: string }) {
  if (!showGoogle && !showKakao) return null;
  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        또는 소셜 계정으로 {label}
        <span className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="space-y-2">
        {showGoogle && (
          <a
            href="/api/auth/oauth/google"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <GoogleIcon />
            Google로 {label}
          </a>
        )}
        {showKakao && (
          <a
            href="/api/auth/oauth/kakao"
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#191600] transition hover:brightness-95"
            style={{ backgroundColor: "#FEE500" }}
          >
            <KakaoIcon />
            카카오로 {label}
          </a>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 34.9 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.4 36 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="#191600">
      <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7-.2.7-.7 2.6-.8 3-.1.5.2.5.4.4.2-.1 2.6-1.8 3.6-2.5.7.1 1.4.2 2.1.2 5.5 0 10-3.6 10-8S17.5 3 12 3z" />
    </svg>
  );
}
