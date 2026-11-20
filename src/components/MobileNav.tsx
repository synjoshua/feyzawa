"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

export type NavLink = { href: string; label: string };

type Props = {
  links: NavLink[];
  /** Lacquer header (home) vs porcelain-on-brown SiteHeader */
  tone?: "porcelain" | "ink";
  active?: string;
};

export function MobileNav({ links, tone = "porcelain", active }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const icon =
    tone === "porcelain" ? "text-porcelain" : "text-porcelain";

  return (
    <div className="relative z-[60] sm:hidden">
      <button
        type="button"
        className={`focus-ring flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 ${icon}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <IconClose /> : <IconMenu />}
      </button>

      {open ? (
        <>
          {/* Fixed layer — escapes header overflow / sibling z-index traps */}
          <button
            type="button"
            className="fixed inset-0 z-[200] bg-ink/45"
            aria-label="Dismiss menu"
            onClick={() => setOpen(false)}
          />
          <nav
            id={panelId}
            className="fixed right-3 top-14 z-[210] w-56 overflow-hidden rounded-2xl border border-[var(--line)] bg-porcelain shadow-panel sm:right-6"
          >
            <ul className="py-1.5">
              {links.map((link) => {
                const isActive = active === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`focus-ring block px-4 py-3 text-sm ${
                        isActive
                          ? "bg-[#e5bf55]/35 font-medium text-ink"
                          : "text-ink hover:bg-[#f2e8de]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      ) : null}
    </div>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
