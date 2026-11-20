import type { ReactNode } from "react";
import { BrandLink, HeaderNav } from "@/components/NavChrome";
import { HeaderFrame } from "@/components/HeaderFrame";

export function SiteHeader({
  active,
  signedIn = false,
  titleBlock,
}: {
  active?: string;
  signedIn?: boolean;
  /** Page title / eyebrow area rendered under the brand row */
  titleBlock?: ReactNode;
}) {
  return (
    <HeaderFrame
      brand={<BrandLink />}
      nav={<HeaderNav signedIn={signedIn} active={active} />}
      below={titleBlock}
    />
  );
}
