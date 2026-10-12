/**
 * The closing yellow panel, lit from the top, with a giant wordmark that
 * the panel's bottom edge crops.
 */
export function FinalCta() {
  return (
    <section className="px-[clamp(8px,1.5vw,20px)]">
      <div className="bg-peel-center relative overflow-hidden rounded-[clamp(24px,3vw,40px)]">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-6 px-6 pt-[clamp(72px,9vw,112px)] text-center">
          <h2 className="font-display max-w-[820px] text-[clamp(36px,4.8vw,64px)] leading-[1.02] tracking-[-0.03em] text-balance">
            Split the work. Keep the club together.
          </h2>
          <p className="text-bark-soft max-w-[460px] text-[17px] leading-[1.55]">
            Guided setup walks you through data, labels, finance and teams. Invite your officers
            with a code.
          </p>
          <a
            href="#pricing"
            className="bg-ink text-cream shadow-cta-soft hover:bg-ink-hover hover:text-cream rounded-full px-[26px] py-[15px] text-[16px] font-semibold whitespace-nowrap"
          >
            Create your club
          </a>
          <div
            aria-hidden="true"
            className="font-display text-ink mt-[clamp(32px,5vw,64px)] -mb-[0.12em] text-[clamp(64px,17vw,240px)] leading-[0.78] tracking-[-0.05em] whitespace-nowrap"
          >
            bananasplit
          </div>
        </div>
      </div>
    </section>
  );
}
