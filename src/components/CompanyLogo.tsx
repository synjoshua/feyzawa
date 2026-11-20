"use client";

import { useState } from "react";
import {
  companyInitials,
  companyLogoUrl,
} from "@/lib/ats/company-logos";

type Props = {
  companyName: string;
  className?: string;
  size?: "sm" | "md";
};

export function CompanyLogo({
  companyName,
  className = "",
  size = "md",
}: Props) {
  const [failed, setFailed] = useState(false);
  const src = companyLogoUrl(companyName);
  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const text = size === "sm" ? "text-[10px]" : "text-xs";

  if (!src || failed) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#f2e8de] font-medium text-ink ${dim} ${text} ${className}`}
        aria-hidden
      >
        {companyInitials(companyName)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- third-party favicon CDN; no next/image domain config needed
    <img
      src={src}
      alt=""
      width={size === "sm" ? 32 : 40}
      height={size === "sm" ? 32 : 40}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full bg-[#f2e8de] object-contain p-1.5 ${dim} ${className}`}
    />
  );
}
