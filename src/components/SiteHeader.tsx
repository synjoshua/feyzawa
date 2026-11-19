import Link from "next/link";

const links = [
  { href: "/", label: "Board" },
  { href: "/tracker", label: "Tracker" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/login", label: "Sign in" },
];

export function SiteHeader({ active }: { active?: string }) {
  return (
    <header className="animate-fade border-b border-[var(--line)] bg-white/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2 focus-ring rounded-sm">
          <span className="brand-display text-3xl text-ink sm:text-4xl">
            Bunch
          </span>
          <span className="hidden text-xs uppercase tracking-[0.18em] text-ink-soft/70 sm:inline">
            Design roles
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => {
            const isActive = active === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`focus-ring rounded-md px-2.5 py-1.5 text-sm transition ${
                  isActive
                    ? "bg-moss text-white"
                    : "text-ink-soft hover:bg-white/70"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
