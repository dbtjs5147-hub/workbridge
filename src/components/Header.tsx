import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/constants";
import { getUnreadMessageCount } from "@/lib/chat";
import { Icon } from "./Icon";
import { LogoutButton } from "./LogoutButton";

export async function Header() {
  const user = await getCurrentUser();
  const unread = user
    ? await prisma.notification.count({
        where: { userId: user.id, isRead: false },
      })
    : 0;
  const unreadMessages = user ? await getUnreadMessageCount(user.id) : 0;

  const isClient = user?.role === "CLIENT";
  const isFreelancer = user?.role === "FREELANCER";

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-black text-white shadow-sm">
              W
            </span>
            <span className="text-lg font-extrabold tracking-tight text-gray-900">
              Work<span className="text-brand-600">Bridge</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex">
            <NavLink href="/projects">프로젝트 탐색</NavLink>
            {!user && (
              <Link
                href="/try"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50"
              >
                무료 AI 체험
              </Link>
            )}
            {isClient && <NavLink href="/projects/new">프로젝트 등록</NavLink>}
            {isClient && <NavLink href="/my/projects">내 프로젝트</NavLink>}
            {isFreelancer && (
              <NavLink href="/my/applications">내 지원 현황</NavLink>
            )}
            {isFreelancer && <NavLink href="/my/bookmarks">북마크</NavLink>}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          {user ? (
            <>
              <IconLink href="/messages" label="메시지" badge={unreadMessages}>
                <Icon name="message" className="h-5 w-5" />
              </IconLink>
              <IconLink href="/notifications" label="알림" badge={unread}>
                <Icon name="bell" className="h-5 w-5" />
              </IconLink>
              <Link
                href="/my/profile"
                className="ml-1 flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-gray-100"
              >
                {user.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.profileImageUrl}
                    alt={user.name}
                    className="h-7 w-7 rounded-full border border-gray-200 object-cover"
                  />
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {user.name.slice(0, 1)}
                  </span>
                )}
                <span className="hidden text-sm font-semibold text-gray-700 sm:inline">
                  {user.name}
                </span>
                {user.role && (
                  <span className="hidden rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500 sm:inline">
                    {ROLE_LABEL[user.role]}
                  </span>
                )}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                로그인
              </Link>
              <Link href="/signup" className="btn-primary">
                무료로 시작
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
    >
      {children}
    </Link>
  );
}

function IconLink({
  href,
  label,
  badge,
  children,
}: {
  href: string;
  label: string;
  badge: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative grid h-9 w-9 place-items-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
    >
      {children}
      {badge > 0 && (
        <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}
