import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/context", () => ({ assertNoTx: vi.fn() }));

const { noteFileTypeFromName, sniffNoteFileEdges } = await import("@/lib/files/types");
const { directUploadKey, directUploadsAvailable, inRouteMaxBytes, isDirectUploadKey } = await import(
  "./direct"
);

describe("direct uploads", () => {
  it("are on only with a Vercel Blob private store, and never when the database is forced", () => {
    expect(directUploadsAvailable({ BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_abc_secret" })).toBe(true);
    expect(directUploadsAvailable({})).toBe(false);
    expect(
      directUploadsAvailable({ BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_abc_secret", FILE_STORAGE: "database" }),
    ).toBe(false);
  });

  it("keep the route at 4 MB on Vercel and higher elsewhere (local development)", () => {
    expect(inRouteMaxBytes({ VERCEL: "1" })).toBe(4 * 1024 * 1024);
    expect(inRouteMaxBytes({})).toBe(25 * 1024 * 1024);
  });

  it("use keys the server makes, inside the org's Notes files", () => {
    const key = directUploadKey("org_1");
    expect(key).toMatch(/^files\/org_1\/[A-Za-z0-9_-]{24}$/);
    expect(isDirectUploadKey("org_1", key)).toBe(true);
    expect(isDirectUploadKey("org_2", key)).toBe(false);
    expect(isDirectUploadKey("org_1", "files/org_1/short")).toBe(false);
    expect(isDirectUploadKey("org_1", "receipts/org_1/aaaaaaaaaaaaaaaaaaaaaaaa")).toBe(false);
    expect(isDirectUploadKey("org_1", "files/org_1/../../x/aaaaaaaaaaaaaaaaaaaaaaaa")).toBe(false);
    expect(isDirectUploadKey("org_1", 42)).toBe(false);
  });
});

describe("sniffing a big file from its edges", () => {
  it("knows PDFs and images by their first bytes", () => {
    expect(sniffNoteFileEdges(Buffer.from("%PDF-1.7\n..."), Buffer.alloc(0), "a.pdf")).toBe("application/pdf");
  });

  it("knows an Office file by the part names in its central directory, at the end", () => {
    const head = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
    const tail = Buffer.from("....ppt/presentation.xml....");
    expect(sniffNoteFileEdges(head, tail, "deck.pptx")).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    expect(sniffNoteFileEdges(head, Buffer.from("nothing"), "x.zip")).toBeNull();
  });

  it("takes text cut mid-character, and refuses binary posing as text", () => {
    const text = Buffer.from("café ".repeat(10));
    expect(sniffNoteFileEdges(text.subarray(0, text.length - 3), Buffer.alloc(0), "notes.md")).toBe(
      "text/markdown",
    );
    expect(sniffNoteFileEdges(Buffer.from([0x41, 0, 0x42]), Buffer.alloc(0), "a.txt")).toBeNull();
    expect(sniffNoteFileEdges(Buffer.from("<html>"), Buffer.alloc(0), "a.html")).toBeNull();
  });

  it("declares a type from the name for the store", () => {
    expect(noteFileTypeFromName("Recap.MP4")).toBeNull();
    expect(noteFileTypeFromName("deck.pptx")).toMatch(/presentationml/);
    expect(noteFileTypeFromName("notes.md")).toBe("text/markdown");
  });
});
