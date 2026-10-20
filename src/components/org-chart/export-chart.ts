"use client";

import { chartToSvg, type ExportNode, type ExportPalette } from "@/lib/org-chart/export";
import type { ChartLayout } from "@/lib/org-chart/layout";

/**
 * Browser side of the chart export: resolve the theme tokens to colours,
 * draw the SVG to a canvas for a PNG download, or print it (the browser's
 * "Save as PDF"). No extra libraries.
 */

const HEX = /^#[0-9a-f]{6}$/i;

/** A CSS custom property's value as a hex colour (tokens are strict hex), or `fallback`. */
export function token(name: string, fallback: string, el: Element = document.documentElement): string {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return HEX.test(value) ? value : fallback;
}

export function themePalette(el?: Element): ExportPalette {
  return {
    background: token("--background", "#ffffff", el),
    card: token("--card", "#ffffff", el),
    foreground: token("--foreground", "#111318", el),
    muted: token("--muted", "#e3e6e9", el),
    mutedForeground: token("--muted-foreground", "#63656a", el),
    border: token("--border", "#d0d3d8", el),
  };
}

/** "var(--chart-3)" -> its hex value. */
export function resolveColor(color: string | null, el?: Element): string | null {
  if (!color) return null;
  const m = /^var\((--[a-z0-9-]+)\)$/i.exec(color);
  return m ? token(m[1], "#888888", el) : HEX.test(color) ? color : null;
}

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadChartPng(
  layout: ChartLayout,
  nodes: ReadonlyMap<string, ExportNode>,
  filename: string,
  title?: string,
): Promise<void> {
  const svg = chartToSvg(layout, nodes, themePalette(), { title });
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("The chart image could not be drawn."));
      img.src = url;
    });
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot draw the chart.");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("The PNG could not be made.");
    const png = URL.createObjectURL(blob);
    download(png, filename);
    window.setTimeout(() => URL.revokeObjectURL(png), 10_000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Prints the chart on its own page (landscape, scaled to fit), so "Save as PDF" makes a PDF. */
export function printChart(layout: ChartLayout, nodes: ReadonlyMap<string, ExportNode>, title?: string): void {
  const svg = chartToSvg(layout, nodes, themePalette(), { title });
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(
    `<!doctype html><html><head><title>${(title ?? "Org chart").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string)}</title><style>@page{size:landscape;margin:12mm}html,body{margin:0}svg{width:100%;height:auto;max-height:100vh}</style></head><body>${svg}</body></html>`,
  );
  doc.close();
  const win = frame.contentWindow;
  window.setTimeout(() => {
    win?.focus();
    win?.print();
    window.setTimeout(() => frame.remove(), 1000);
  }, 50);
}
