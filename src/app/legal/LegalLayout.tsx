import Link from "next/link";

// 법적 문서 공용 레이아웃 + "법무 검토 필요" 안내 배너
export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-400">최종 개정일: {updated}</p>
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        ⚠️ <b>법무 검토 필요</b> — 본 문서는 표준 양식을 기반으로 한 <b>초안(템플릿)</b>입니다.
        정식 서비스 전 <b>변호사·노무·세무 검토</b>와 실제 사업자 정보 기입이 반드시 필요합니다.
        대괄호 <code>[ ]</code> 부분은 실제 값으로 채워야 합니다.
      </div>

      <article className="prose-legal space-y-5 text-sm leading-relaxed text-gray-700">
        {children}
      </article>

      <div className="mt-10 flex gap-4 border-t border-gray-100 pt-6 text-sm">
        <Link href="/terms" className="text-brand-600 hover:underline">
          이용약관
        </Link>
        <Link href="/privacy" className="text-brand-600 hover:underline">
          개인정보처리방침
        </Link>
        <Link href="/business" className="text-brand-600 hover:underline">
          사업자정보
        </Link>
      </div>
    </div>
  );
}

// 섹션 제목 + 본문
export function Section({
  no,
  title,
  children,
}: {
  no: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-base font-bold text-gray-900">
        {no}. {title}
      </h2>
      <div className="space-y-2 text-gray-600">{children}</div>
    </section>
  );
}
