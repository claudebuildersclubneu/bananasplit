import Link from "next/link";

import { BrandRoot } from "@/components/brand/brand-root";
import { pill } from "@/components/brand/pill";
import { CoreMark, Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/** Any unknown URL (and every notFound()): Bananasplit's own look. */
export default function NotFound() {
  return (
    <BrandRoot>
      <header className="flex h-[72px] items-center px-6 lg:px-10">
        <Link href="/" className="text-ink" data-plain>
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-24 text-center">
        <p
          aria-hidden="true"
          className="font-heading m-0 flex items-center gap-[0.08em] text-[clamp(96px,22vw,200px)] leading-none tracking-[-0.05em]"
        >
          4
          <CoreMark className="size-[0.78em]" />4
        </p>
        <h1 className="font-heading m-0 text-[clamp(32px,4vw,46px)] leading-[1.05] font-normal tracking-[-0.03em]">
          We couldn&apos;t find that page.
        </h1>
        <p className="text-ink-muted m-0 max-w-[420px] text-[17px] leading-[1.55] text-balance">
          The link may be old, or the page may have moved. Check the address, or start again from
          the home page.
        </p>
        <Link href="/" className={cn(pill({ raised: true }), "mt-2 px-7")}>
          Back to the home page
        </Link>
      </main>
    </BrandRoot>
  );
}
