import { SectionTitle } from "./section-title";

const FAQS = [
  {
    q: "Who counts as a member?",
    a: "Anyone who joins your club workspace during the semester. Guests who only RSVP to events, and alumni you keep in the org chart, are free.",
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
    a: "A Supabase database, kept in sync. From Google Sheets or Excel, export a CSV and import it. Club plans include two connections and Society includes six.",
  },
  {
    q: "Can other clubs see our data?",
    a: "No. Each club’s data is separated by the database itself, with every table locked down per club and per person. Changes are recorded in an audit log and secrets are encrypted.",
  },
  {
    q: "We’re not a school club. Can we use it?",
    a: "Yes. The Team and Business plans are for startups, studios and any group that wants the same tools, billed per seat each month.",
  },
] as const;

/** The title on the left, questions and answers on the right, each pair side by side. */
export function Faq() {
  return (
    <section
      id="faq"
      className="mx-auto flex max-w-[1240px] flex-wrap gap-x-16 gap-y-12 px-6 pb-32"
    >
      <div className="flex flex-[1_1_280px] flex-col gap-[18px]">
        <SectionTitle>FAQs</SectionTitle>
      </div>
      <dl className="flex min-w-0 flex-[2_1_560px] flex-col">
        {FAQS.map((faq) => (
          <div
            key={faq.q}
            className="border-ink/12 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-x-10 gap-y-2.5 border-t py-6"
          >
            <dt className="text-[18px] leading-[1.4] font-bold">{faq.q}</dt>
            <dd className="text-ink-muted text-[16px] leading-[1.6] text-pretty">{faq.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
