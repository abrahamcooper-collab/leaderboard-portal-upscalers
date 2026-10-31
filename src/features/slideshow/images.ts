// The picture screens' images, from public/images. Static imports, so a
// missing file fails the build and Next.js serves sizes to fit the screen.
import page3Image from "../../../public/images/Page3/image.jpeg";
import page4First from "../../../public/images/page4/1.jpeg";
import page4Second from "../../../public/images/page4/2.jpeg";

export const PAGE_3_IMAGE = page3Image;

/** Page 4 alternates between these, one per visit. */
export const PAGE_4_IMAGES = [page4First, page4Second] as const;
