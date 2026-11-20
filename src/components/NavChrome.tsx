"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MobileNav, type NavLink } from "./MobileNav";
import { HEADER_BRAND } from "./HeaderFrame";

export function BrandLink({
  as = "span",
}: {
  as?: "span" | "h1";
}) {
  const Tag = as;
  return (
    <Link href="/" className="focus-ring inline-block rounded-sm" prefetch>
      <Tag className={HEADER_BRAND}>Feyzawa</Tag>
    </Link>
  );
}

export function DesktopNav({
  links,
  profile,
}: {
  links: NavLink[];
  profile: NavLink;
}) {
  const pathname = usePathname();
  // Highlight the clicked tab immediately — avoids a flash waiting on the route
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const activeHref = pendingHref ?? pathname;

  return (
    <nav className="hidden items-center gap-0.5 text-xs sm:flex sm:gap-1 sm:text-sm">
      {links.map((link) => {
        const isActive = activeHref === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch
            onClick={() => setPendingHref(link.href)}
            className={`focus-ring rounded-full px-2.5 py-1.5 transition-colors duration-150 ${
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
        prefetch
        onClick={() => setPendingHref(profile.href)}
        className={`focus-ring rounded-full px-2.5 py-1.5 font-medium transition-colors duration-150 ${
          activeHref === profile.href
            ? "bg-[#e5bf55] text-ink"
            : "bg-[#e5bf55]/90 text-ink hover:bg-[#e5bf55]"
        }`}
      >
        {profile.label}
      </Link>
    </nav>
  );
}

export function HeaderNav({
  signedIn,
  active,
}: {
  signedIn: boolean;
  active?: string;
}) {
  const links: NavLink[] = [
    { href: "/watchlist", label: "Watch" },
    { href: "/saved", label: "Saved" },
    { href: "/tracker", label: "Tracker" },
  ];
  const profile: NavLink = signedIn
    ? { href: "/profile", label: "Profile" }
    : { href: "/login", label: "Sign in" };

  return (
    <>
      <MobileNav links={[...links, profile]} active={active} />
      <DesktopNav links={links} profile={profile} />
    </>
  );
}
