import "../rsvp.css";

import Link from "next/link";

import { BrandRoot } from "@/components/brand/brand-root";
import { Logo } from "@/components/brand/logo";
import { pill } from "@/components/brand/pill";

/** An RSVP page whose code matches nothing live: a missing, switched-off or removed event. */
export default function EventNotFound() {
  return (
    <BrandRoot>
      <div className="rsvp-page rsvp-bg-banana flex min-h-svh flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <Logo size={32} textSize={22} />
        <h1 className="font-heading text-[40px] leading-[1.05] tracking-[-0.03em]">
          This event isn&apos;t here
        </h1>
        <p className="text-muted-foreground max-w-[420px] text-[16px]">
          The link may be mistyped, or the host turned off sign-ups or removed the event. Ask
          whoever sent it for a new one.
        </p>
        <Link href="/" className={pill({ size: "md" })}>
          Go to Bananasplit
        </Link>
      </div>
    </BrandRoot>
  );
}
