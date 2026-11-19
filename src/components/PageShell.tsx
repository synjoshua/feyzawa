import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * Shared layout for inner pages — flat brown title band + cream body,
 * matching the home page lacquer / rice-paper system.
 */
export function PageShell({
  active,
  eyebrow,
  title,
  description,
  actions,
  children,
  maxWidthClass = "max-w-3xl",
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
      <SiteHeader active={active} />
      <div className="bg-[#2c2827] text-porcelain">
        <div
          className={`mx-auto ${maxWidthClass} px-4 py-7 sm:px-6 sm:py-8`}
        >
          {eyebrow ? (
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#e5bf55]">
              {eyebrow}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="brand-mark text-4xl leading-none text-porcelain sm:text-5xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-2 max-w-2xl text-sm text-porcelain/65">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </div>
      </div>
      <main
        className={`mx-auto ${maxWidthClass} px-4 py-8 sm:px-6 sm:py-10`}
      >
        {children}
      </main>
    </div>
  );
}
