import Image from "next/image";

import { cn } from "@/lib/utils";

/** The label chip's three sizes in the design: the desktop frame, a tile, the phone. */
const CHIP = {
  lg: "px-2.5 py-1.5 text-[12px]",
  md: "px-[9px] py-[5px] text-[12px]",
  sm: "px-2 py-[5px] text-[11px]",
} as const;

/**
 * A product screenshot. Until the real ones exist it's the design's striped
 * placeholder with a mono label saying what goes there; pass `image` (a file
 * in /public) and the picture fills the same box instead, cropped from the
 * top left. `className` gives the box its size, radius and border, and
 * `children` sit on top of either (the phone's Dynamic Island).
 */
export function Screenshot({
  label,
  image,
  sizes = "100vw",
  chip = "lg",
  className,
  children,
}: {
  label: string;
  image?: { src: string; alt: string };
  sizes?: string;
  chip?: keyof typeof CHIP;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-stripes grid place-items-center",
        image && "relative overflow-hidden",
        className,
      )}
    >
      {image ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          className="object-cover object-left-top"
        />
      ) : (
        <span className={cn("bg-paper font-code text-ink-muted rounded-md", CHIP[chip])}>
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
