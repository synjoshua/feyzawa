"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MobileNav, type NavLink } from "./MobileNav";
import { HEADER_BRAND } from "./HeaderFrame";

function PendingLabel({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={`inline-flex items-center gap-1.5 transition-opacity duration-150 ${
        pending ? "opacity-55" : "opacity-100"
      }`}
    >
      {children}
      {pending ? (
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
          aria-hidden
        />
      ) : null}
    </span>
  );
}

export function BrandLink({
  as = "span",
}: {
  as?: "span" | "h1";
}) {
  const Tag = as;
  return (
    <Link href="/" className="focus-ring inline-block rounded-sm" prefetch>
      <Tag className={HEADER_BRAND}>
        <PendingLabel>Feyzawa</PendingLabel>
      </Tag>
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

  return (
    <nav className="hidden items-center gap-0.5 text-xs sm:flex sm:gap-1 sm:text-sm">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch
            className={`focus-ring rounded-full px-2.5 py-1.5 transition ${
              isActive
                ? "bg-[#e5bf55] font-medium text-ink"
                : "text-porcelain/80 hover:bg-white/10 hover:text-porcelain"
            }`}
          >
            <PendingLabel>{link.label}</PendingLabel>
          </Link>
        );
      })}
      <Link
        href={profile.href}
        prefetch
        className={`focus-ring rounded-full px-2.5 py-1.5 font-medium transition ${
          pathname === profile.href
            ? "bg-[#e5bf55] text-ink"
            : "bg-[#e5bf55]/90 text-ink hover:bg-[#e5bf55]"
        }`}
      >
        <PendingLabel>{profile.label}</PendingLabel>
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
