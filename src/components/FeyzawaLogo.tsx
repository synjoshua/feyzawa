type FeyzawaLogoProps = {
  className?: string;
  /** porcelain on dark headers, ink on cream */
  tone?: "porcelain" | "ink";
  title?: string;
};

/** Lacquer F mark with mustard tea-leaf accent — matches brand palette. */
export function FeyzawaLogo({
  className = "h-8 w-8",
  tone = "porcelain",
  title = "Feyzawa",
}: FeyzawaLogoProps) {
  const ink = tone === "porcelain" ? "#fffdf8" : "#2c2827";
  const gold = "#e5bf55";

  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* Stem + top bar of F */}
      <path
        fill={ink}
        d="M28 28c2-10 18-16 38-12 14 3 28 12 34 22-8-4-18-6-28-4-6 1-12 4-16 8v18c10-2 22-1 32 4l-6 10c-8-4-18-6-26-4v28c-1 6-4 10-10 11-8 1-14-4-14-12V40c0-6 1-10 6-12z"
      />
      {/* Leaf foot (right) */}
      <path
        fill={ink}
        d="M42 88c8 2 14 10 16 20 1 6-2 10-8 9-8-2-16-12-18-22-1-4 4-8 10-7z"
      />
      {/* Leaf foot (left) */}
      <path
        fill={ink}
        d="M30 96c6 4 8 14 6 22-1 4-6 6-10 4-6-4-10-14-8-22 1-3 7-5 12-4z"
      />
      {/* Mustard seed / leaf accent */}
      <path
        fill={gold}
        d="M78 58c8-2 16 2 18 10 1 6-4 12-12 14-8 2-16-4-16-12 0-6 4-10 10-12z"
      />
    </svg>
  );
}
