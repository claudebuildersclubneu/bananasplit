"use client";

/** The UTF-8 name from a `filename*=UTF-8''...` Content-Disposition parameter. */
export function filenameFromDisposition(header: string | null): string | null {
  const match = header?.match(/filename\*=UTF-8''([^;]+)/i);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return null;
  }
}

/**
 * Downloads a note as a PDF from its route handler (the note page's "…" ›
 * Download PDF). It fetches instead of navigating, so a failure can be
 * shown on the page instead of replacing it, and awaits `beforeDownload`
 * first (the autosave flush) so the PDF has the edits made in the last
 * moment.
 */
export async function downloadNotePdf(
  href: string,
  beforeDownload?: () => Promise<void>,
): Promise<"ok" | "error" | "rate-limited"> {
  try {
    await beforeDownload?.();
    const res = await fetch(href, { cache: "no-store" });
    if (!res.ok) return res.status === 429 ? "rate-limited" : "error";
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filenameFromDisposition(res.headers.get("Content-Disposition")) ?? "note.pdf";
    document.body.append(link);
    link.click();
    link.remove();
    // Some browsers read the blob after click() returns; free it a moment later.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return "ok";
  } catch {
    return "error";
  }
}
