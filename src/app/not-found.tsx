import Link from "next/link";

import { BrandRoot } from "@/components/brand/brand-root";
import { CoreMark, Logo } from "@/components/brand/logo";
import { pill } from "@/components/brand/pill";
import { cn } from "@/lib/utils";

/** Any unknown URL (and every notFound()): Bananasplit's own look, Moonstone. */
export default function NotFound() {
  return (
    <BrandRoot>
      <header className="flex h-[72px] items-center px-4 sm:px-6 lg:px-10">
        <Link href="/" className="logo-lockup" data-plain>
          <Logo />
        </Link>
      </header>
      <main className="relative flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-24 text-center">
        <div
          aria-hidden="true"
          className="hero-light pointer-events-none absolute inset-x-0 -top-[72px] h-[640px]"
        />
        <p
          aria-hidden="true"
          className="numeral relative m-0 flex items-center gap-[0.06em] text-[clamp(96px,22vw,200px)] tracking-[-0.05em]"
        >
          4
          <CoreMark className="size-[0.74em]" />4
        </p>
        <h1 className="display-title relative m-0 text-[clamp(30px,4vw,44px)] tracking-[-0.03em]">
          We couldn&apos;t find that page.
        </h1>
        <p className="text-muted-foreground relative m-0 max-w-[420px] text-[17px] leading-[1.55] text-balance">
          The link may be old, or the page may have moved. Check the address, or start again from
          the home page.
        </p>
        <Link href="/" className={cn(pill(), "relative mt-2 px-6")}>
          Back to the home page
        </Link>
      </main>
    </BrandRoot>
  );
}
