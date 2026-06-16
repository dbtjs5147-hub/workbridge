"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Msg = {
  id: string;
  content: string;
  senderId: string;
  mine: boolean;
  createdAt: string;
};

const POLL_INTERVAL = 2000; // 2초마다 새 메시지 확인

export function ChatThread({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  myId: string;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAtRef = useRef<string | null>(
    initialMessages.length > 0
      ? initialMessages[initialMessages.length - 1].createdAt
      : null
  );

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // 폴링: after 이후 새 메시지만 받아 합치기 (내가 보낸 것은 중복 제거)
  useEffect(() => {
    let active = true;
    const tick = async () => {
      const after = lastAtRef.current;
      const url = `/api/conversations/${conversationId}/messages${
        after ? `?after=${encodeURIComponent(after)}` : ""
      }`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (!active || !data.ok) return;
        const incoming: Msg[] = data.data.messages;
        if (incoming.length > 0) {
          setMessages((prev) => {
            const existing = new Set(prev.map((m) => m.id));
            const fresh = incoming.filter((m) => !existing.has(m.id));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
          lastAtRef.current = incoming[incoming.length - 1].createdAt;
        }
      } catch {
        // 네트워크 오류는 다음 주기에 재시도
      }
    };
    const timer = setInterval(tick, POLL_INTERVAL);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [conversationId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.ok) {
        const m: Msg = data.data.message;
        setMessages((prev) =>
          prev.some((x) => x.id === m.id) ? prev : [...prev, m]
        );
        lastAtRef.current = m.createdAt;
      } else {
        setInput(content);
      }
    } catch {
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card flex h-[70vh] flex-col">
      {/* 메시지 영역 */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-gray-400">
            아직 메시지가 없습니다. 먼저 인사를 건네보세요 👋
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                m.mine
                  ? "rounded-br-sm bg-brand-600 text-white"
                  : "rounded-bl-sm bg-gray-100 text-gray-800"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              <p
                className={`mt-0.5 text-[10px] ${
                  m.mine ? "text-brand-100" : "text-gray-400"
                }`}
              >
                {new Date(m.createdAt).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <form
        onSubmit={send}
        className="flex gap-2 border-t border-gray-100 p-3"
      >
        <input
          className="input flex-1"
          placeholder="메시지를 입력하세요"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="btn-primary px-5"
        >
          전송
        </button>
      </form>
    </div>
  );
}
