import { Markdown } from "./Markdown";
import { Icon } from "./Icon";

// PRD 문서를 접었다 펼 수 있는 섹션 (JS 없이 <details> 사용)
export function PrdSection({
  content,
  defaultOpen = false,
  note,
}: {
  content: string;
  defaultOpen?: boolean;
  note?: string;
}) {
  return (
    <details className="card p-6" open={defaultOpen}>
      <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-bold text-gray-800">
        <span className="flex items-center gap-2">
          <Icon name="document" className="h-4 w-4 text-brand-600" />
          PRD 문서 (개발 요구사항 정의서)
        </span>
        <span className="text-xs font-normal text-brand-600">펼치기/접기</span>
      </summary>
      {note && <p className="mt-2 text-xs text-gray-500">{note}</p>}
      <div className="mt-4 max-h-[600px] overflow-y-auto border-t border-gray-100 pt-4">
        <Markdown content={content} />
      </div>
    </details>
  );
}
