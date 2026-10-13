import { encode } from "uqr";

/**
 * A QR code as one SVG path (tickets, door mode, the printable flyer).
 * Square modules on purpose: every phone camera reads them. Pure, so it
 * renders on the server and in the browser alike.
 */

export function qrPath(text: string, border = 2): { d: string; size: number } {
  const qr = encode(text, { ecc: "M", border });
  let d = "";
  qr.data.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      // One rectangle per run of dark modules keeps the path short.
      let run = 1;
      while (x + run < row.length && row[x + run]) run++;
      d += `M${x} ${y}h${run}v1h-${run}z`;
      x += run;
    }
  });
  return { d, size: qr.size };
}

export function QrCode({
  value,
  label,
  className,
  border = 2,
}: {
  value: string;
  /** What it opens, for screen readers ("Your ticket"); none hides it from them. */
  label?: string;
  className?: string;
  border?: number;
}) {
  const { d, size } = qrPath(value, border);
  return (
    <svg
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={size} height={size} className="fill-paper" />
      <path d={d} className="fill-ink" />
    </svg>
  );
}
