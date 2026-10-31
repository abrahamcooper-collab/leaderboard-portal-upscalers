import { AppShell, BOARD_LINKS, type NavLink } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";

const ADMIN_LINKS: readonly NavLink[] = [
  { href: "/admin/sales", label: "Sales" },
  { href: "/admin/teams", label: "Teams" },
  ...BOARD_LINKS,
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  return (
    <AppShell user={user} links={ADMIN_LINKS}>
      {children}
    </AppShell>
  );
}
