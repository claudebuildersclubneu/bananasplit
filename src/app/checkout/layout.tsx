import { BrandRoot } from "@/components/brand/brand-root";

/** Checkout is a Bananasplit page, not a club's: Moonstone, dark by default (BrandRoot). */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <BrandRoot>{children}</BrandRoot>;
}
