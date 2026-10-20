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
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("bg-oat relative overflow-hidden", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover object-left-top" />
      {children}
    </div>
  );
}
