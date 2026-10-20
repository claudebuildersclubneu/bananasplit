// @vitest-environment node
import { describe, expect, it } from "vitest";

import { collabConfig, collabConfigProblems } from "./config";
import { noteDocumentName, parseDocumentName, presenceSlot } from "./protocol";

const SECRET = "s".repeat(40);

describe("collaboration configuration", () => {
  const on = {
    COLLAB_ENABLED: "true",
    COLLAB_SERVER_URL: "wss://collab.example.org/",
    COLLAB_SECRET: SECRET,
  };

  it("is off without a collaboration server, and on whenever one is configured", () => {
    expect(collabConfig({})).toBeNull();
    expect(collabConfigProblems({})).toEqual([]);
    // No flag needed: a server URL and secret turn it on.
    const { COLLAB_ENABLED: _flag, ...configured } = on;
    expect(collabConfig(configured)?.url).toBe("wss://collab.example.org");
    expect(collabConfig({ ...on, COLLAB_ENABLED: "" })?.url).toBe("wss://collab.example.org");
  });

  it("stays off when switched off, whatever else is set", () => {
    expect(collabConfig({ ...on, COLLAB_ENABLED: "false" })).toBeNull();
    expect(collabConfigProblems({ ...on, COLLAB_ENABLED: "false" })).toEqual([]);
  });

  it("stays off, and says why, when wanted but incomplete", () => {
    expect(collabConfigProblems({ COLLAB_ENABLED: "true" })).not.toEqual([]);
    expect(collabConfigProblems({ COLLAB_SERVER_URL: "wss://collab.example.org" })[0]).toMatch(
      /COLLAB_SECRET/,
    );
    expect(collabConfig({ ...on, COLLAB_SECRET: "short" })).toBeNull();
    expect(collabConfig({ ...on, COLLAB_SERVER_URL: "" })).toBeNull();
    expect(collabConfigProblems({ ...on, COLLAB_SECRET: "short" })[0]).toMatch(/COLLAB_SECRET/);
    // Plain ws:// only on this machine.
    expect(collabConfig({ ...on, COLLAB_SERVER_URL: "ws://collab.example.org" })).toBeNull();
    expect(collabConfig({ ...on, COLLAB_SERVER_URL: "https://collab.example.org" })).toBeNull();
  });

  it("derives the browser URL, the CSP origin and the server-to-server URL", () => {
    expect(collabConfig(on)).toEqual({
      url: "wss://collab.example.org",
      origin: "wss://collab.example.org",
      httpUrl: "https://collab.example.org",
      secret: SECRET,
    });
    expect(collabConfig({ ...on, COLLAB_SERVER_URL: "ws://localhost:1234" })).toMatchObject({
      url: "ws://localhost:1234",
      origin: "ws://localhost:1234",
      httpUrl: "http://localhost:1234",
    });
    expect(collabConfig({ ...on, COLLAB_SERVER_URL: "wss://example.org/collab/" })?.httpUrl).toBe(
      "https://example.org/collab",
    );
  });
});

describe("document names and presence", () => {
  it("round-trips a note's document name and refuses anything else", () => {
    const name = noteDocumentName("org_1", "cm0abc123");
    expect(parseDocumentName(name)).toEqual({
      kind: "note",
      organizationId: "org_1",
      noteId: "cm0abc123",
    });
    expect(parseDocumentName("task:org_1:t1")).toBeNull();
    expect(parseDocumentName("note:org_1")).toBeNull();
    expect(parseDocumentName("note:org_1:n1:extra")).toBeNull();
    expect(parseDocumentName("note:org 1:n1")).toBeNull();
  });

  it("gives each user a stable colour slot from 1 to 5", () => {
    expect(presenceSlot("user_1")).toBe(presenceSlot("user_1"));
    const slots = new Set(Array.from({ length: 50 }, (_, i) => presenceSlot(`user_${i}`)));
    expect([...slots].every((s) => s >= 1 && s <= 5)).toBe(true);
    expect(slots.size).toBeGreaterThan(1);
  });
});
