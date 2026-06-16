"use client";

import { useRef, useState } from "react";
import { isPdf, fileLabel } from "./Attachments";

export function FileUploader({
  value,
  onChange,
  max = 8,
  accept = "image/*,application/pdf",
  label = "이미지 또는 PDF 추가",
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  accept?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);
    const next = [...value];
    for (const file of Array.from(files)) {
      if (next.length >= max) break;
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok) next.push(data.data.url);
        else setError(data.error);
      } catch {
        setError("업로드 중 오류가 발생했습니다.");
      }
    }
    onChange(next);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="relative">
            {isPdf(url) ? (
              <div className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 text-center">
                <span className="text-2xl">📄</span>
                <span className="line-clamp-2 text-[10px] text-gray-500">
                  {fileLabel(url)}
                </span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt="첨부"
                className="h-24 w-24 rounded-lg border border-gray-200 object-cover"
              />
            )}
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gray-800 text-xs text-white hover:bg-red-600"
              aria-label="삭제"
            >
              ×
            </button>
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-brand-400 hover:text-brand-500"
          >
            {uploading ? (
              <span className="text-xs">업로드 중...</span>
            ) : (
              <>
                <span className="text-xl">＋</span>
                <span className="px-1 text-[10px] leading-tight">{label}</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={max > 1}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <p className="mt-1 text-[11px] text-gray-400">
        이미지(jpg·png·webp) 또는 PDF, 최대 {max}개 · 10MB 이하
      </p>
    </div>
  );
}
