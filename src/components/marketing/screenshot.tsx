import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * A screenshot of the app (a file in /public/marketing, taken from a demo
 * club), filling its box and cropped from the top left. `className` gives
 * the box its size, radius and border; `children` sit on top (the phone's
 * Dynamic Island). The oat fill shows while the picture loads.
 */
export function Screenshot({
  src,
  alt,
  sizes,
  className,
  children,
  eager = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  children?: React.ReactNode;
  /** Above the fold (the hero): load at once, as the page's largest paint. */
  eager?: boolean;
}) {
  return (
    <div className={cn("bg-oat relative overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        className="object-cover object-left-top"
      />
      {children}
    </div>
  );
}
