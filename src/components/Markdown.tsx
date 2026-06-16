import { Fragment, type ReactNode } from "react";

// 외부 라이브러리 없는 경량 마크다운 렌더러
// 지원: # ## ### 제목, > 인용, - 목록(들여쓰기), **굵게**, 빈 줄 단락
function renderInline(text: string): ReactNode {
  // **bold** 처리
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: { text: string; indent: number }[] = [];

  const flushList = (key: string) => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={key} className="my-2 space-y-1">
        {listItems.map((li, i) => (
          <li
            key={i}
            className="text-sm leading-relaxed text-gray-700"
            style={{ marginLeft: li.indent * 16 }}
          >
            <span className="mr-1.5 text-gray-400">•</span>
            {renderInline(li.text)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.replace(/\s+$/, "");
    const key = `b-${idx}`;

    // 목록 항목
    const listMatch = raw.match(/^(\s*)-\s+(.*)$/);
    if (listMatch) {
      const indent = Math.floor(listMatch[1].length / 2);
      listItems.push({ text: listMatch[2], indent });
      return;
    }
    flushList(key + "-list");

    if (line.trim() === "") return;

    if (line.startsWith("### ")) {
      blocks.push(
        <h4 key={key} className="mt-4 mb-1 text-sm font-bold text-gray-900">
          {renderInline(line.slice(4))}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      blocks.push(
        <h3 key={key} className="mt-5 mb-2 border-b border-gray-100 pb-1 text-base font-bold text-gray-900">
          {renderInline(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith("# ")) {
      blocks.push(
        <h2 key={key} className="mb-2 text-lg font-extrabold text-gray-900">
          {renderInline(line.slice(2))}
        </h2>
      );
    } else if (line.startsWith("> ")) {
      blocks.push(
        <blockquote key={key} className="my-2 border-l-2 border-brand-300 bg-brand-50 px-3 py-1.5 text-sm text-gray-600">
          {renderInline(line.slice(2))}
        </blockquote>
      );
    } else {
      blocks.push(
        <p key={key} className="my-1.5 text-sm leading-relaxed text-gray-700">
          {renderInline(line)}
        </p>
      );
    }
  });
  flushList("b-final-list");

  return <div className="prd-markdown">{blocks}</div>;
}
