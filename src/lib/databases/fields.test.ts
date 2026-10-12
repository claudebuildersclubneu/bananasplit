import { describe, expect, it } from "vitest";

import {
  convertValue,
  displayText,
  inferFieldType,
  parseCell,
  parseDateInput,
  type FieldDef,
  type FieldType,
} from "./fields";
import { DATABASE_TEMPLATES } from "./templates";

const field = (type: FieldType, options: FieldDef["options"] = {}) => ({ type, options });
const ok = (value: unknown) => ({ ok: true, value });

describe("parseCell: what each field type stores", () => {
  it("treats empty input as an empty cell, whatever the type", () => {
    for (const t of ["TEXT", "NUMBER", "DATE", "SELECT", "EMAIL"] as const) {
      expect(parseCell(field(t), "  ")).toEqual(ok(null));
      expect(parseCell(field(t), null)).toEqual(ok(null));
    }
  });

  it("text: one line for TEXT, paragraphs kept for LONG_TEXT, length capped", () => {
    expect(parseCell(field("TEXT"), "  Maya \n Patel ")).toEqual(ok("Maya Patel"));
    expect(parseCell(field("LONG_TEXT"), "Line one\nLine two  ")).toEqual(ok("Line one\nLine two"));
    expect(parseCell(field("TEXT"), "x".repeat(1001)).ok).toBe(false);
  });

  it("numbers and money", () => {
    expect(parseCell(field("NUMBER"), "1,200.5")).toEqual(ok(1200.5));
    expect(parseCell(field("NUMBER", { decimals: 0 }), "3.7")).toEqual(ok(4));
    expect(parseCell(field("CURRENCY"), "$15.005")).toEqual(ok(15.01));
    expect(parseCell(field("NUMBER"), "twelve").ok).toBe(false);
  });

  it("dates, from what people type or paste", () => {
    expect(parseCell(field("DATE"), "2026-10-12")).toEqual(ok("2026-10-12"));
    expect(parseCell(field("DATE"), "10/12/2026")).toEqual(ok("2026-10-12"));
    expect(parseCell(field("DATE"), "2026-02-30").ok).toBe(false);
    expect(parseDateInput("3/4/26")).toBe("2026-03-04");
  });

  it("checkboxes take yes/no words", () => {
    expect(parseCell(field("CHECKBOX"), true)).toEqual(ok(true));
    expect(parseCell(field("CHECKBOX"), "Yes")).toEqual(ok(true));
    expect(parseCell(field("CHECKBOX"), "no")).toEqual(ok(null));
    expect(parseCell(field("CHECKBOX"), false)).toEqual(ok(null));
  });

  it("selects store choice ids, by id or by label", () => {
    const choices = [
      { id: "s", label: "Small", color: "gray" as const },
      { id: "m", label: "Medium", color: "blue" as const },
    ];
    expect(parseCell(field("SELECT", { choices }), "medium")).toEqual(ok("m"));
    expect(parseCell(field("SELECT", { choices }), "s")).toEqual(ok("s"));
    expect(parseCell(field("SELECT", { choices }), "Large").ok).toBe(false);
    expect(parseCell(field("MULTI_SELECT", { choices }), "Medium, small")).toEqual(ok(["s", "m"]));
    expect(parseCell(field("MULTI_SELECT", { choices }), [])).toEqual(ok(null));
  });

  it("members must be in the club", () => {
    const members = new Set(["u_1"]);
    expect(parseCell(field("MEMBER"), "u_1", members)).toEqual(ok("u_1"));
    expect(parseCell(field("MEMBER"), "u_2", members).ok).toBe(false);
  });

  it("emails, phones and links are normalized", () => {
    expect(parseCell(field("EMAIL"), " Maya@Example.EDU ")).toEqual(ok("maya@example.edu"));
    expect(parseCell(field("EMAIL"), "maya@").ok).toBe(false);
    expect(parseCell(field("PHONE"), "617-555-0101")).toEqual(ok("+16175550101"));
    expect(parseCell(field("URL"), "example.com/club")).toEqual(ok("https://example.com/club"));
    expect(parseCell(field("URL"), "javascript:alert(1)").ok).toBe(false);
  });
});

describe("type changes and display", () => {
  it("keeps what fits the new type and clears the rest", () => {
    expect(convertValue(field("TEXT"), field("NUMBER"), "12")).toBe(12);
    expect(convertValue(field("TEXT"), field("NUMBER"), "Physics")).toBeNull();
    expect(convertValue(field("NUMBER"), field("TEXT"), 12)).toBe("12");
    expect(convertValue(field("TEXT"), field("CHECKBOX"), "yes")).toBe(true);
  });

  it("shows values as plain text for search and CSV", () => {
    const choices = [{ id: "m", label: "Medium", color: "blue" as const }];
    expect(displayText(field("SELECT", { choices }), "m", new Map())).toBe("Medium");
    expect(displayText(field("CURRENCY"), 15.5, new Map())).toBe("$15.50");
    expect(displayText(field("MEMBER"), "u_1", new Map([["u_1", "Maya Patel"]]))).toBe(
      "Maya Patel",
    );
    expect(displayText(field("CHECKBOX"), true, new Map())).toBe("Yes");
  });
});

describe("guessing a spreadsheet column's type", () => {
  it("picks the most specific type every value fits", () => {
    expect(inferFieldType(["yes", "no", "Yes"])).toBe("CHECKBOX");
    expect(inferFieldType(["$15.00", "$2.50"])).toBe("CURRENCY");
    expect(inferFieldType(["1", "2.5", "-3"])).toBe("NUMBER");
    expect(inferFieldType(["02134", "02139"])).not.toBe("NUMBER");
    expect(inferFieldType(["a@x.edu", "b@y.edu"])).toBe("EMAIL");
    expect(inferFieldType(["2026-10-12", "10/13/2026"])).toBe("DATE");
    expect(inferFieldType(["M", "L", "S", "M", "M", "L"])).toBe("SELECT");
    expect(inferFieldType(["Maya", "Jay", "Alex", "Priya"])).toBe("TEXT");
    expect(inferFieldType(["", " "])).toBe("TEXT");
  });
});

describe("templates", () => {
  it("each starts with a field that can name rows, and has unique field names", () => {
    for (const t of DATABASE_TEMPLATES) {
      expect(["TEXT", "NUMBER", "EMAIL", "PHONE", "URL"]).toContain(t.fields[0]!.type);
      const names = t.fields.map((f) => f.name.toLowerCase());
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
