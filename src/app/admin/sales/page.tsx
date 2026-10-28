import { Card, PageHeader } from "@/components/ui";
import { listRecentSales, listSaleOptions } from "@/features/sales/queries";
import { RecentSalesTable, RecordSaleForm } from "@/features/sales/sale-forms";
import { requireAdmin } from "@/lib/auth";
import { serverEnv } from "@/lib/server-env";

export default async function AdminSalesPage() {
  // Server Actions re-check this too; pages check so data never renders for non-admins.
  await requireAdmin();
  const [teams, sales] = await Promise.all([listSaleOptions(), listRecentSales()]);

  return (
    <>
      <PageHeader title="Sales" />
      <div className="flex flex-col gap-6">
        <Card title="Record a sale" description="The leaderboard celebrates as soon as you save.">
          <RecordSaleForm teams={teams} />
        </Card>
        <Card title="Recent sales" description="The latest 100. Deleting a sale updates every total.">
          <RecentSalesTable sales={sales} timeZone={serverEnv.APP_TIMEZONE} />
        </Card>
      </div>
    </>
  );
}
