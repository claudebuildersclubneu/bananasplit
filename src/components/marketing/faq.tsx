import { cn } from "@/lib/utils";

import { PlusToggle } from "./plus-toggle";
import { CONTAINER, SectionTitle } from "./section-title";

const FAQS = [
  {
    q: "Do I need a club to make RSVP pages?",
    a: "No. Every account comes with Personal Free: RSVP pages with sign-ups, waitlists, QR check-in and invite links, plus your own tasks, calendar, notes and availability polls. Start a club when you want to run things with others.",
  },
  {
    q: "Does it cost anything to join a club?",
    a: "No. Joining members never pay. A club pays for its plan, and every new club gets 30 days of Team Advanced free, no card needed.",
  },
  {
    q: "Who counts as a member?",
    a: "Anyone who joins your club during the semester. Guests who only RSVP to events, and alumni you keep in the org chart, are free.",
  },
  {
    q: "Can one person be in several clubs?",
    a: "Yes. One account can belong to many clubs, and you switch between them without signing in again.",
  },
  {
    q: "Can we replace Luma with Bananasplit?",
    a: "Yes. Event pages take RSVPs, run waitlists and check people in, and every guest lands in the same member list as the rest of your club.",
  },
  {
    q: "Which data sources can we connect?",
    a: "Google Sheets, Airtable, Notion, Excel, Supabase and Postgres. Team includes two connections and Team Advanced includes six.",
  },
  {
    q: "Can other clubs see our data?",
    a: "No. Each club’s data is separated by the database itself, with every table locked down per club and per person. Changes are recorded in an audit log and secrets are encrypted.",
  },
  {
    q: "We’re not a school club. Can we use it?",
    a: "Yes. Team and Team Advanced work the same for startups, studios and any group that wants the same tools. On your own? Personal Free and Personal Plus are for one person.",
  },
] as const;

/**
 * The title on the left, the questions on the right. Each question opens its
 * answer (a native <details>, so it works without JavaScript and with the
 * keyboard); they share a name, so opening one closes the one before.
 */
export function Faq() {
  return (
    <section
      id="faq"
      className={cn(CONTAINER, "flex flex-wrap gap-x-16 gap-y-8 pb-20 sm:gap-y-12 sm:pb-32")}
    >
      <div className="flex flex-[1_1_280px] flex-col gap-[18px]">
        <SectionTitle>FAQs</SectionTitle>
      </div>
      <div className="flex min-w-0 flex-[2_1_560px] flex-col">
        {FAQS.map((faq, i) => (
          <details
            key={faq.q}
            name="faq"
            className={cn("group border-border", i > 0 && "border-t")}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] leading-[1.4] font-semibold sm:py-6 sm:text-[18px] [&::-webkit-details-marker]:hidden">
              {faq.q}
              <PlusToggle />
            </summary>
            <p className="text-muted-foreground max-w-[640px] pb-6 text-[16px] leading-[1.6] text-pretty sm:pe-14">
              {faq.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
