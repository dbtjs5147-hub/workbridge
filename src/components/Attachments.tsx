// 업로드 파일 표시 (읽기 전용) — 서버/클라이언트 어디서나 사용 가능
// 이미지는 썸네일, PDF는 파일 링크로 보여준다.

export function isPdf(url: string): boolean {
  return url.toLowerCase().split("?")[0].endsWith(".pdf");
}

// /uploads/{uuid}-{원본이름} 형태에서 원본 이름 추출
export function fileLabel(url: string): string {
  const last = url.split("/").pop() ?? url;
  // uuid(36) + "-" 접두 제거
  const m = last.match(/^[0-9a-fA-F-]{36}-(.+)$/);
  return m ? m[1] : last;
}

export function Attachments({
  urls,
  size = 96,
}: {
  urls: string[];
  size?: number;
}) {
  if (!urls || urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url) =>
        isPdf(url) ? (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-brand-300"
          >
            <span className="text-red-500">📄</span>
            <span className="max-w-[160px] truncate">{fileLabel(url)}</span>
            <span className="text-xs text-brand-600">PDF 보기 ↗</span>
          </a>
        ) : (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-lg border border-gray-200 hover:border-brand-300"
            style={{ width: size, height: size }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="첨부 이미지"
              className="h-full w-full object-cover"
            />
          </a>
        )
      )}
    </div>
  );
}
