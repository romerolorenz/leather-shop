// Pure-CSS hover/focus tooltip for icon-only controls that already carry an
// aria-label — the label is invisible to sighted mouse users otherwise.
// Named group (group/tooltip) so nesting doesn't collide with any other
// Tailwind `group` used by an ancestor.
export function Tooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`group/tooltip relative inline-flex${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-md transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
