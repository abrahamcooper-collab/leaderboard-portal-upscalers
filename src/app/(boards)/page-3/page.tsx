import { BoardExitLink } from "@/components/board-exit-link";
import { FullScreenImage } from "@/features/slideshow/full-screen-image";
import { PAGE_3_IMAGE } from "@/features/slideshow/images";
import { requireUser } from "@/lib/auth";

/** Page 3: one picture, full screen. Any signed-in user can open it. */
export default async function Page3() {
  const user = await requireUser();
  return (
    <main className="relative h-dvh flex-1 bg-black">
      <FullScreenImage src={PAGE_3_IMAGE} alt="Creative Giants" />
      <BoardExitLink role={user.role} />
    </main>
  );
}
