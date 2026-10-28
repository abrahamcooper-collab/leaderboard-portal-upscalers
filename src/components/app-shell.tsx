import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/features/auth/actions";
import type { CurrentUser } from "@/lib/auth";

export type NavLink = { href: string; label: string };

/** Header with navigation and sign-out, used by the admin and closer areas. */
export function AppShell({
  user,
  links,
  children,
}: {
  user: CurrentUser;
  links: readonly NavLink[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <nav className="flex flex-wrap items-center gap-1">
            <span className="mr-3 font-semibold text-slate-900">Sales Portal</span>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <form action={signOut} className="flex items-center gap-3 text-sm text-slate-500">
            {user.fullName}
            <button className="font-medium text-slate-700 hover:text-slate-900">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
