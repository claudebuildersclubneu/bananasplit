// @vitest-environment node
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * zod is about 90 KB gzipped in the browser. Client components must not
 * import it, directly or through a shared module: schemas live in server
 * modules (*.schema.ts, src/lib/nav/sidebar.ts, src/lib/profile/schema.ts,
 * which import "server-only"), and client code uses their zod-free
 * siblings. This walks every "use client" module's static and dynamic
 * imports under src/ and fails with the chain that reaches zod.
 */

const SRC = path.resolve(__dirname, "..");
const EXTENSIONS = [".ts", ".tsx", ".js", ".mjs"];
const FORBIDDEN = /^zod(\/|$)/;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "generated") sourceFiles(full, out);
    } else if (/\.(tsx?|mjs|js)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
  ];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) ?? null;
}

interface ModuleInfo {
  client: boolean;
  serverAction: boolean;
  importsForbidden: boolean;
  deps: string[];
}

const cache = new Map<string, ModuleInfo>();
const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)\s+(type\s+)?([^'";]*?)\s*from\s*["']([^"']+)["']|(?:^|\n)\s*import\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function read(file: string): ModuleInfo {
  const hit = cache.get(file);
  if (hit) return hit;
  const text = fs.readFileSync(file, "utf8");
  const info: ModuleInfo = {
    client: /^\s*["']use client["']/.test(text),
    serverAction: /^\s*["']use server["']/.test(text),
    importsForbidden: false,
    deps: [],
  };
  for (const m of text.matchAll(IMPORT_RE)) {
    // Type-only imports are erased: `import type`, or every name marked `type`.
    const typeOnly = Boolean(m[1]) || /^\{\s*(type\s+[^,}]+,?\s*)+\}$/.test((m[2] ?? "").trim());
    if (typeOnly) continue;
    const spec = m[3] ?? m[4] ?? m[5];
    if (FORBIDDEN.test(spec)) info.importsForbidden = true;
    const dep = resolveImport(file, spec);
    if (dep) info.deps.push(dep);
  }
  cache.set(file, info);
  return info;
}

function chainToForbidden(root: string): string[] | null {
  const seen = new Set([root]);
  const queue: string[][] = [[root]];
  while (queue.length) {
    const chain = queue.shift()!;
    const info = read(chain[chain.length - 1]);
    if (info.importsForbidden) return chain;
    for (const dep of info.deps) {
      // A client module gets a reference to a Server Action, not its imports.
      if (seen.has(dep) || read(dep).serverAction) continue;
      seen.add(dep);
      queue.push([...chain, dep]);
    }
  }
  return null;
}

describe("client bundles", () => {
  it("no client component imports zod, directly or through a shared module", () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => read(file).client)
      .map(chainToForbidden)
      .filter((chain): chain is string[] => chain !== null)
      .map((chain) => chain.map((f) => path.relative(SRC, f).replace(/\\/g, "/")).join(" -> "));
    expect(offenders).toEqual([]);
  });
});
