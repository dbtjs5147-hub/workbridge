"use client";

import { useRouter } from "next/navigation";
import { relativeTime } from "@/lib/format";

type Notif = {
  id: string;
  title: string;
  message: string;
  targetUrl: string | null;
  isRead: boolean;
  createdAt: Date;
};

export function NotificationList({
  notifications,
}: {
  notifications: Notif[];
}) {
  const router = useRouter();

  async function readAll() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    router.refresh();
  }

  async function open(n: Notif) {
    if (!n.isRead) {
      await fetch(`/api/notifications/${n.id}/read`, { method: "POST" });
    }
    if (n.targetUrl) router.push(n.targetUrl);
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={readAll} className="btn-ghost text-sm">
          모두 읽음 처리
        </button>
      </div>
      <div className="card divide-y divide-gray-100">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => open(n)}
            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
              n.isRead ? "" : "bg-brand-50/40"
            }`}
          >
            {!n.isRead && (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
            )}
            <div className={n.isRead ? "ml-5" : ""}>
              <p className="text-sm font-semibold text-gray-800">{n.title}</p>
              <p className="text-sm text-gray-500">{n.message}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {relativeTime(n.createdAt)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
