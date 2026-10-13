import { withAccent } from "./accent";
import { contrastWarnings, type ContrastWarning } from "./contrast";
import { deriveDarkRoles, deriveTheme, type DerivedTheme } from "./derive";
import { CUSTOM_PRESET_ID, findPreset } from "./presets";
import { DEFAULT_THEME_STYLE, type ThemeStyle } from "./style";
import type { LogoDisplayValue, ThemeModeValue, ThemeRoles } from "./types";
import type { ThemeInput } from "./validate";

/**
 * What the save action writes to OrgTheme, from validated input. The server
 * is authoritative: a known preset id always stores that preset's own
 * palettes (whatever colours came with it), anything else is "custom";
 * a lock only sticks to LIGHT or DARK; tokens and warnings are recomputed
 * here, never taken from the client. Look and feel's accent (if any) is
 * applied on top of the palettes before tokens and warnings are derived;
 * the palettes themselves are stored as picked.
 */
export interface ThemeRecord {
  preset: string;
  mode: ThemeModeValue;
  lockMode: boolean;
  logoDisplay: LogoDisplayValue;
  light: ThemeRoles;
  dark: ThemeRoles | null;
  style: ThemeStyle;
  tokens: DerivedTheme;
  contrastWarnings: ContrastWarning[];
}

/** `style` may be left out (the default look), as before Look and feel. */
export function buildThemeRecord(
  input: Omit<ThemeInput, "style"> & { style?: ThemeStyle },
): ThemeRecord {
  const style = input.style ?? DEFAULT_THEME_STYLE;
  const preset = input.preset === CUSTOM_PRESET_ID ? undefined : findPreset(input.preset);
  const light = preset ? preset.light : input.light;
  const dark = preset ? preset.dark : input.dark;
  const effective = withAccent(light, dark ?? deriveDarkRoles(light), style.accent);
  return {
    preset: preset ? preset.id : CUSTOM_PRESET_ID,
    mode: input.mode,
    lockMode: input.lockMode && input.mode !== "SYSTEM",
    logoDisplay: input.logoDisplay,
    light,
    dark,
    style,
    tokens: deriveTheme(effective.light, effective.dark),
    contrastWarnings: contrastWarnings(effective.light, effective.dark),
  };
}
