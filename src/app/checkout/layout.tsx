import { BrandRoot } from "@/components/brand/brand-root";

/** Checkout is a Bananasplit page, not a club's: the brand look, always light. */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <BrandRoot>{children}</BrandRoot>;
}
