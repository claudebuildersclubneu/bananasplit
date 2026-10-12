import { cn } from "@/lib/utils";

const STEPS = ["Create your account", "Enter your club code", "You're in"] as const;

/**
 * The three steps to joining a club, under the headline on the sign-up
 * panel: numbered 22px dots, the current one ink with a yellow numeral, the
 * rest translucent cream.
 */
export function JoinSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px] font-semibold">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const here = n === current;
        return (
          <li
            key={label}
            className="flex items-center gap-2.5"
            aria-current={here ? "step" : undefined}
          >
            <span
              className={cn(
                "grid size-[22px] place-items-center rounded-full text-[11px] font-extrabold",
                here ? "bg-ink text-banana" : "bg-paper/60",
              )}
            >
              {n}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
