import { describe, expect, it } from "vitest";

import { deriveTheme } from "./derive";
import { applyPersonalTheme } from "./personal";
import { CBC_PRESET, THEME_PRESETS } from "./presets";
import { buildThemeRecord } from "./record";
import { resolveTheme, rowStyle } from "./resolve";
import {
  DEFAULT_THEME_STYLE,
  lookStyleSheet,
  parseThemeStyle,
  styleDeclarations,
  type ThemeStyle,
} from "./style";
import { themeInputSchema } from "./validate";

const ROW = {
  preset: "cbc",
  mode: "SYSTEM",
  lockMode: false,
  logoDisplay: "LOGO_AND_NAME",
  light: CBC_PRESET.light,
  dark: CBC_PRESET.dark,
};

const INPUT = { ...ROW };

const FULL: ThemeStyle = {
  accent: "#2e8b57",
  radius: "round",
  textSize: "large",
  headingFont: "sans",
  bodyFont: "system",
};

describe("theme style: backward compatibility", () => {
  it("parses an input saved before Look and feel as the default style", () => {
    const parsed = themeInputSchema.parse(INPUT);
    expect(parsed.style).toEqual(DEFAULT_THEME_STYLE);
  });

  it("fills in missing fields of a partial style", () => {
    const parsed = themeInputSchema.parse({ ...INPUT, style: { radius: "sharp" } });
    expect(parsed.style).toEqual({ ...DEFAULT_THEME_STYLE, radius: "sharp" });
  });

  it("rejects unknown options, unknown keys and non-hex accents", () => {
    for (const style of [
      { radius: "pill" },
      { textSize: "huge" },
      { headingFont: "comic" },
      { accent: "rgb(0,0,0)" },
      { accent: "#fff;}</style>" },
      { extra: true },
    ]) {
      expect(themeInputSchema.safeParse({ ...INPUT, style }).success).toBe(false);
    }
  });

  it("resolves a row without tokens.style (or with junk) to the default style", () => {
    expect(resolveTheme(ROW).style).toEqual(DEFAULT_THEME_STYLE);
    expect(resolveTheme({ ...ROW, tokens: { light: {}, dark: {} } }).style).toEqual(
      DEFAULT_THEME_STYLE,
    );
    expect(rowStyle("nope")).toEqual(DEFAULT_THEME_STYLE);
    expect(rowStyle([1, 2])).toEqual(DEFAULT_THEME_STYLE);
  });

  it("keeps the good fields of a partly malformed stored style", () => {
    expect(parseThemeStyle({ radius: "round", textSize: 42, accent: "#ZZZ" })).toEqual({
      ...DEFAULT_THEME_STYLE,
      radius: "round",
    });
    expect(parseThemeStyle({ accent: "#ABCDEF" }).accent).toBe("#abcdef");
  });

  it("resolves a stored style and derives the tokens with its accent", () => {
    const theme = resolveTheme({ ...ROW, tokens: { style: FULL } });
    expect(theme.style).toEqual(FULL);
    expect(theme.light).toEqual(CBC_PRESET.light); // the palette stays as picked
    expect(theme.tokens.light["brand-accent"]).toBe("#2e8b57");
    expect(theme.tokens.dark["brand-accent"]).not.toBe(CBC_PRESET.dark.accent);
  });

  it("round-trips: what the save stores resolves to the same theme", () => {
    const record = buildThemeRecord(themeInputSchema.parse({ ...INPUT, style: FULL }));
    const theme = resolveTheme({ ...ROW, tokens: { ...record.tokens, style: record.style } });
    expect(theme.style).toEqual(FULL);
    expect(theme.tokens).toEqual(record.tokens);
  });

  it("without an accent, the tokens are exactly the palette's", () => {
    const record = buildThemeRecord(
      themeInputSchema.parse({ ...INPUT, style: { radius: "sharp" } }),
    );
    expect(record.tokens).toEqual(deriveTheme(CBC_PRESET.light, CBC_PRESET.dark));
  });
});

describe("theme style: CSS", () => {
  it("writes nothing for the default style", () => {
    expect(lookStyleSheet(DEFAULT_THEME_STYLE)).toBe("");
    expect(styleDeclarations(DEFAULT_THEME_STYLE)).toEqual({});
  });

  it("maps every option to a fixed value", () => {
    const css = lookStyleSheet(FULL);
    expect(css.startsWith("html:root{")).toBe(true);
    expect(css).toContain("--radius:0.8125rem");
    expect(css).toContain("font-size:106.25%");
    expect(css).toContain("--heading-weight:700");
    expect(css).toContain("--font-hanken:ui-sans-serif");
    // The accent never goes through this sheet (it is a token, checked as hex in css.ts).
    expect(css).not.toContain("2e8b57");
    expect(lookStyleSheet({ ...DEFAULT_THEME_STYLE, headingFont: "sans" })).toContain(
      "--font-young-serif:var(--font-hanken)",
    );
  });
});

describe("theme style: personal themes", () => {
  it("keep the org's corners and fonts, but not its accent override", () => {
    const org = resolveTheme({ ...ROW, tokens: { style: FULL } });
    const harbor = THEME_PRESETS.find((p) => p.id === "harbor")!;
    const mine = applyPersonalTheme(org, { preset: "harbor", mode: "system", custom: null });
    expect(mine.style).toEqual({ ...FULL, accent: null });
    expect(mine.tokens.light["brand-accent"]).toBe(harbor.light.accent);
  });
});
