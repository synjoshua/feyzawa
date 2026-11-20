import Link from "next/link";
import type { ReactNode } from "react";
import { MobileNav } from "@/components/MobileNav";
import { HEADER_BRAND, HeaderFrame } from "@/components/HeaderFrame";
import { getCurrentUser } from "@/lib/supabase/server";

const NAV = [
  { href: "/watchlist", label: "Watch" },
  { href: "/saved", label: "Saved" },
  { href: "/tracker", label: "Tracker" },
] as const;

export async function SiteHeader({
  active,
  titleBlock,
}: {
  active?: string;
  /** Page title / eyebrow area rendered under the brand row */
  titleBlock?: ReactNode;
}) {
  const user = await getCurrentUser();
  const profile = user
    ? { href: "/profile", label: "Profile" }
    : { href: "/login", label: "Sign in" };

  const links = [...NAV, profile];

  return (
    <HeaderFrame
      brand={
        <Link href="/" className="focus-ring inline-block rounded-sm">
          <span className={HEADER_BRAND}>Feyzawa</span>
        </Link>
      }
      nav={
        <>
          <MobileNav links={links} active={active} />
          <nav className="hidden items-center gap-0.5 text-xs sm:flex sm:gap-1 sm:text-sm">
            {NAV.map((link) => {
              const isActive = active === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`focus-ring rounded-full px-2.5 py-1.5 transition ${
                    isActive
                      ? "bg-[#e5bf55] font-medium text-ink"
                      : "text-porcelain/80 hover:bg-white/10 hover:text-porcelain"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href={profile.href}
              className={`focus-ring rounded-full px-2.5 py-1.5 font-medium transition ${
                active === profile.href
                  ? "bg-[#e5bf55] text-ink"
                  : "bg-[#e5bf55]/90 text-ink hover:bg-[#e5bf55]"
              }`}
            >
              {profile.label}
            </Link>
          </nav>
        </>
      }
      below={titleBlock}
    />
  );
}
