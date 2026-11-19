import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";

export async function SiteHeader({ active }: { active?: string }) {
  const user = await getCurrentUser();

  const links = [
    { href: "/", label: "Board" },
    { href: "/tracker", label: "Tracker" },
    { href: "/outreach", label: "Outreach" },
    { href: "/watchlist", label: "Watchlist" },
    user
      ? { href: "/profile", label: "Profile" }
      : { href: "/login", label: "Sign in" },
  ];

  return (
    <header className="animate-fade border-b border-[var(--line)] bg-porcelain/55 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="group focus-ring flex items-baseline gap-3 rounded-sm"
        >
          <span className="brand-mark text-[2rem] text-ink transition group-hover:text-gold sm:text-[2.35rem]">
            Feyzawa
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.26em] text-ink-soft/65 sm:inline">
            Design roles
          </span>
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1">
          {links.map((link) => {
            const isActive = active === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`focus-ring rounded-full px-3 py-1.5 text-sm transition ${
                  isActive
                    ? "bg-jade text-porcelain"
                    : "text-ink-soft hover:bg-foam/80"
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
