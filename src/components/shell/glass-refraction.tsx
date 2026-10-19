"use client";

import { useEffect } from "react";

/**
 * The liquid glass's bend (globals.css, `glass`): an SVG displacement filter
 * the backdrop goes through, mounted once by the shell. Only Chromium
 * renders url() filters inside backdrop-filter, so the root gets
 * .has-refract there and the glass uses the filter; Safari and Firefox keep
 * the plain frost.
 */
export function GlassRefraction() {
  useEffect(() => {
    const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } })
      .userAgentData?.brands;
    if (!brands?.some((b) => /Chromium/.test(b.brand))) return;
    const root = document.documentElement;
    root.classList.add("has-refract");
    return () => root.classList.remove("has-refract");
  }, []);

  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute size-0 overflow-hidden"
    >
      <defs>
        <filter
          id="lg-refract"
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.011"
            numOctaves={2}
            seed={11}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation={2.5} result="soft" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="soft"
            scale={22}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
