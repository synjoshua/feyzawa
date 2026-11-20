import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * Shared layout for inner pages — same lacquer header band as home
 * (max-w-6xl, matching brand + nav + fixed brown height).
 */
export function PageShell({
  active,
  eyebrow,
  title,
  description,
  actions,
  children,
  maxWidthClass = "max-w-6xl",
}: {
  active?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidthClass?: string;
}) {
  return (
    <div className="min-h-screen bg-[#f2e8de]">
      <SiteHeader
        active={active}
        titleBlock={
          <div className="flex h-[4.25rem] items-end justify-between gap-4 sm:h-[4.75rem]">
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#e5bf55]">
                  {eyebrow}
                </p>
              ) : (
                <p className="text-[10px] uppercase tracking-[0.28em] text-transparent">
                  &nbsp;
                </p>
              )}
              <h1 className="brand-mark mt-1 truncate text-[2rem] leading-none tracking-[-0.02em] text-porcelain sm:text-[2.75rem] sm:tracking-[-0.04em]">
                {title}
              </h1>
            </div>
            {actions ? <div className="shrink-0 pb-0.5">{actions}</div> : null}
          </div>
        }
      />
      <main
        className={`mx-auto ${maxWidthClass} px-4 py-8 sm:px-6 sm:py-10`}
      >
        {description ? (
          <p className="mb-6 max-w-2xl text-sm text-ink-soft">{description}</p>
        ) : null}
        {children}
      </main>
    </div>
  );
}
