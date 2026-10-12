import { Hanken_Grotesk, JetBrains_Mono, Young_Serif } from "next/font/google";

/*
 * The brand's three faces (src/app/brand.css): Young Serif for display,
 * Hanken Grotesk for the interface and body, JetBrains Mono, sparingly, for
 * placeholders and meta. Loaded only on the pages BrandRoot wraps.
 */

const youngSerif = Young_Serif({
  variable: "--font-young-serif",
  subsets: ["latin"],
  weight: "400",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

/** The three faces' CSS variables, for BrandRoot's wrapper. */
export const brandFontVariables = `${youngSerif.variable} ${hanken.variable} ${jetbrains.variable}`;
