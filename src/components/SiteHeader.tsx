import Link from "next/link";
import { MobileNav } from "@/components/MobileNav";
import { getCurrentUser } from "@/lib/supabase/server";

export async function SiteHeader({ active }: { active?: string }) {
  const user = await getCurrentUser();

  const links = [
    { href: "/", label: "Board" },
    { href: "/tracker", label: "Tracker" },
    { href: "/saved", label: "Saved" },
    { href: "/outreach", label: "Outreach" },
    { href: "/watchlist", label: "Watchlist" },
    user
      ? { href: "/profile", label: "Profile" }
      : { href: "/login", label: "Sign in" },
  ];

  return (
    <header className="relative z-30 bg-[#2c2827] text-porcelain">
      <div className="relative z-30 mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="group focus-ring flex min-w-0 items-baseline gap-3 rounded-sm"
        >
          <span className="brand-mark shrink-0 text-[1.85rem] text-porcelain transition group-hover:text-[#e5bf55] sm:text-[2.1rem]">
            Feyzawa
          </span>
        </Link>
        <MobileNav links={links} active={active} />
        <nav className="hidden items-center gap-0.5 sm:flex sm:gap-1">
          {links.map((link) => {
            const isActive = active === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`focus-ring rounded-full px-3 py-1.5 text-sm transition ${
                  isActive
                    ? "bg-[#e5bf55] font-medium text-ink"
                    : "text-porcelain/75 hover:bg-white/10 hover:text-porcelain"
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
