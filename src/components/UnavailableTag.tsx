// Small ink tag in the top-left of a product photo for sold-out or paused
// products. aria-hidden: the card's caption carries the state for screen
// readers, so it's announced once. Parent photo box must be `relative`.
export function UnavailableTag({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className="absolute top-2 left-2 z-[1] whitespace-nowrap rounded-[2px] bg-[#1C1A18] px-2.5 py-1 text-[.6875rem] font-medium uppercase leading-tight tracking-[0.08em] text-white sm:top-3 sm:left-3"
    >
      {label}
    </span>
  );
}
