import { BrandRoot } from "@/components/brand/brand-root";

/** Bananasplit's own look, always light (src/app/brand.css). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <BrandRoot>{children}</BrandRoot>;
}
