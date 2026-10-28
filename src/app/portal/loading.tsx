import { PageSkeleton } from "@/components/page-skeleton";

export default function PortalLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <PageSkeleton />
    </main>
  );
}
