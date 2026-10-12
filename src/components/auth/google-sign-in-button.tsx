import { GoogleIcon } from "@/components/google-icon";
import { pill } from "@/components/brand/pill";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/config";
import { cn } from "@/lib/utils";

/**
 * "Continue with Google" (/sign-in, /sign-up, /invite/[token]). With Google,
 * signing in and creating an account are the same step: Auth.js creates the
 * user on first use, already verified (see google-linking.ts). Render it
 * only when googleSignInEnabled(), or it leads to Auth.js's "server
 * configuration" error.
 */
export function GoogleSignInButton({ redirectTo }: { redirectTo?: string | null }) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", redirectTo ? { redirectTo } : undefined);
      }}
    >
      <Button type="submit" variant="outline" className="w-full">
        <GoogleIcon className="size-4" />
        Continue with Google
      </Button>
    </form>
  );
}

/**
 * The same sign-in on Bananasplit's own pages (src/components/brand): a 50px
 * outline pill with the design's monochrome "G" mark. `label` is "Continue
 * with Google" on /sign-in and "Sign up with Google" on /sign-up.
 */
export function BrandGoogleButton({
  redirectTo,
  label = "Continue with Google",
}: {
  redirectTo?: string | null;
  label?: string;
}) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", redirectTo ? { redirectTo } : undefined);
      }}
    >
      <button type="submit" className={cn(pill({ tone: "outline", size: "field" }), "w-full")}>
        <span
          aria-hidden="true"
          className="border-ink grid size-5 place-items-center rounded-full border-[1.5px] text-[11px] font-extrabold"
        >
          G
        </span>
        {label}
      </button>
    </form>
  );
}
