import { AppShell, type NavLink } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";

const ADMIN_LINKS: readonly NavLink[] = [
  { href: "/admin/sales", label: "Sales" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/sales-floor", label: "Sales Floor" },
  { href: "/operations-closeout", label: "Operations Closeout" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  return (
    <AppShell user={user} links={ADMIN_LINKS}>
      {children}
    </AppShell>
  );
}
