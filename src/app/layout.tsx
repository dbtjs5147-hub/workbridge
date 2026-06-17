import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Header } from "@/components/Header";

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-gray-800">{title}</p>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={href + label}>
            <Link
              href={href}
              className="text-sm text-gray-500 transition hover:text-brand-600"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://workbridge-mu.vercel.app"
  ),
  title: {
    default: "WorkBridge — AI 개발 외주 매칭 플랫폼",
    template: "%s · WorkBridge",
  },
  description:
    "개발을 몰라도 괜찮아요. 아이디어를 적으면 AI가 요구사항으로 정리하고, 검증된 개발자가 직접 견적을 냅니다. 단계별 안전결제(에스크로)로 안전하게 외주를 맡기세요.",
  keywords: [
    "개발 외주",
    "프리랜서 개발자",
    "외주 매칭",
    "AI 요구사항",
    "앱 개발 외주",
    "웹 개발 외주",
    "에스크로 안전결제",
  ],
  openGraph: {
    title: "WorkBridge — AI 개발 외주 매칭 플랫폼",
    description:
      "아이디어를 정리해, 검증된 개발자에게 맡기세요. AI가 요구사항을 정리하고, 단계별 안전결제로 안전하게 거래합니다.",
    siteName: "WorkBridge",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WorkBridge — AI 개발 외주 매칭 플랫폼",
    description: "아이디어를 정리해, 검증된 개발자에게 맡기세요.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen antialiased">
        <Header />
        <main className="py-8">{children}</main>
        <footer className="mt-20 border-t border-gray-200 bg-white">
          <div className="container-page py-10">
            <div className="flex flex-col gap-8 md:flex-row md:justify-between">
              <div className="max-w-xs">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-black text-white">
                    W
                  </span>
                  <span className="font-extrabold tracking-tight text-gray-900">
                    WorkBridge
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">
                  AI가 아이디어를 개발 명세로 바꾸고, 마일스톤 안전결제로 안전하게
                  거래하는 개발 외주 플랫폼.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
                <FooterCol
                  title="서비스"
                  links={[
                    ["프로젝트 탐색", "/projects"],
                    ["프로젝트 등록", "/projects/new"],
                  ]}
                />
                <FooterCol
                  title="내 정보"
                  links={[
                    ["내 프로필", "/my/profile"],
                    ["메시지", "/messages"],
                    ["알림", "/notifications"],
                  ]}
                />
                <FooterCol
                  title="계정"
                  links={[
                    ["로그인", "/login"],
                    ["회원가입", "/signup"],
                  ]}
                />
                <FooterCol
                  title="정책·정보"
                  links={[
                    ["이용약관", "/terms"],
                    ["개인정보처리방침", "/privacy"],
                    ["사업자정보", "/business"],
                  ]}
                />
              </div>
            </div>
            <div className="mt-8 space-y-1 border-t border-gray-100 pt-6 text-xs text-gray-400">
              <p>
                [회사명] · 대표 [대표자명] · 사업자등록번호 [000-00-00000] ·
                통신판매업 [제0000호] · 문의 [support@example.com]
              </p>
              <p>
                © {new Date().getFullYear()} WorkBridge. 결제는 현재 PG 테스트
                모드이며, 정식 출시 전까지 실제 송금은 이루어지지 않습니다.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
