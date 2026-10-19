/** The circle + on a <details> summary, turning into × when open. */
export function PlusToggle() {
  return (
    <span
      aria-hidden="true"
      className="border-input group-hover:bg-muted grid size-8 flex-none place-items-center rounded-full border transition-[transform,background-color] duration-250 ease-(--ease-ink) group-open:rotate-45"
    >
      <svg
        viewBox="0 0 12 12"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <path d="M6 1v10M1 6h10" />
      </svg>
    </span>
  );
}
