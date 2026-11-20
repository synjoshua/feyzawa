"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import type { NormalizedJob } from "@/lib/ats/types";
import { relativeTime } from "@/lib/format";
import {
  EligibilityBadge,
  ExperienceBadge,
  StatusBadge,
  WorkStyleBadge,
} from "./Badges";
import { CompanyLogo } from "./CompanyLogo";
import { IconOutreach, IconTracker, IconWatch } from "./HomeIcons";
import { MobileNav } from "./MobileNav";

type Props = {
  initialJobs: NormalizedJob[];
  updatedAt: string | null;
  source: string;
  companies: string[];
  watchedCompanies: string[];
  signedIn?: boolean;
};

type QuickKey =
  | "all"
  | "intern"
  | "new_grad"
  | "california"
  | "remote";

const CATEGORY_CHIPS: { key: QuickKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "intern", label: "Intern" },
  { key: "new_grad", label: "New grad" },
  { key: "california", label: "California" },
  { key: "remote", label: "Remote" },
];

export function DenseHome({
  initialJobs,
  updatedAt,
  source,
  companies,
  watchedCompanies,
  signedIn = false,
}: Props) {
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<QuickKey>("all");
  const [company, setCompany] = useState("");
  const [pending, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");
  const router = useRouter();

  async function refreshJobs() {
    setRefreshing(true);
    setRefreshMsg("Fetching Greenhouse / Lever / Ashby…");
    try {
      const res = await fetch("/api/jobs/refresh", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefreshMsg(data.error || "Refresh failed");
        return;
      }
      setRefreshMsg(
        `Updated · ${data.activeCount ?? 0} active design roles`,
      );
      router.refresh();
    } catch {
      setRefreshMsg("Network error while refreshing");
    } finally {
      setRefreshing(false);
    }
  }

  const activeJobs = useMemo(
    () => initialJobs.filter((j) => j.status === "active"),
    [initialJobs],
  );

  const companyCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const job of activeJobs) {
      map.set(job.companyName, (map.get(job.companyName) ?? 0) + 1);
    }
    return map;
  }, [activeJobs]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return initialJobs.filter((job) => {
      if (job.status !== "active") return false;
      if (query) {
        const hay =
          `${job.title} ${job.companyName} ${job.locationText}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (company && job.companyName !== company) return false;

      switch (chip) {
        case "intern":
          return job.isInternship || job.experienceBand === "intern";
        case "new_grad":
          return job.experienceBand === "new_grad";
        case "california":
          return job.isCalifornia;
        case "remote":
          return job.isRemote;
        default:
          return true;
      }
    });
  }, [initialJobs, q, chip, company]);

  const featured = filtered.slice(0, 8);
  const internCount = activeJobs.filter((j) => j.isInternship).length;
  const caCount = activeJobs.filter((j) => j.isCalifornia).length;
  const remoteCount = activeJobs.filter((j) => j.isRemote).length;

  function applyQuick(next: QuickKey) {
    startTransition(() => setChip(next));
  }

  function runSearch(e: FormEvent) {
    e.preventDefault();
    document.getElementById("open-roles")?.scrollIntoView({ behavior: "smooth" });
  }

  function countForFilter(key: QuickKey): number {
    switch (key) {
      case "intern":
        return internCount;
      case "new_grad":
        return activeJobs.filter((j) => j.experienceBand === "new_grad").length;
      case "california":
        return caCount;
      case "remote":
        return remoteCount;
      case "all":
      default:
        return activeJobs.length;
    }
  }

  // Same keys/order as chips (skip All) so highlight maps 1:1 left→right
  const filterStats = CATEGORY_CHIPS.filter((c) => c.key !== "all").map(
    (c) => ({
      key: c.key,
      label: c.label,
      count: countForFilter(c.key),
    }),
  );

  return (
    <div className="pb-16">
      {/* Flat lacquer brown header — solid fill, no gradient */}
      <section className="relative overflow-hidden bg-[#2c2827] text-porcelain">
        <div className="relative mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#e5bf55]">
                Design hunt
              </p>
              <h1 className="brand-mark mt-1 overflow-visible pl-0.5 text-[2.35rem] leading-none tracking-[-0.02em] text-porcelain sm:pl-0 sm:text-[3.5rem] sm:tracking-[-0.045em]">
                Feyzawa
              </h1>
            </div>
            <div className="flex shrink-0 items-center pt-0.5">
              <MobileNav
                links={[
                  { href: "/watchlist", label: "Watch" },
                  { href: "/tracker", label: "Tracker" },
                  { href: "/outreach", label: "Outreach" },
                  {
                    href: signedIn ? "/profile" : "/login",
                    label: signedIn ? "Profile" : "Sign in",
                  },
                ]}
              />
              <nav className="hidden items-center gap-0.5 text-xs sm:flex sm:gap-1 sm:text-sm">
                <Link
                  href="/watchlist"
                  className="focus-ring rounded-full px-2.5 py-1.5 text-porcelain/80 hover:bg-white/10 hover:text-porcelain"
                >
                  Watch
                </Link>
                <Link
                  href="/tracker"
                  className="focus-ring rounded-full px-2.5 py-1.5 text-porcelain/80 hover:bg-white/10 hover:text-porcelain"
                >
                  Tracker
                </Link>
                <Link
                  href="/outreach"
                  className="focus-ring rounded-full px-2.5 py-1.5 text-porcelain/80 hover:bg-white/10 hover:text-porcelain"
                >
                  Outreach
                </Link>
                <Link
                  href={signedIn ? "/profile" : "/login"}
                  className="focus-ring rounded-full bg-[#e5bf55]/90 px-2.5 py-1.5 font-medium text-ink hover:bg-[#e5bf55]"
                >
                  {signedIn ? "Profile" : "Sign in"}
                </Link>
              </nav>
            </div>
          </div>

          <form
            onSubmit={runSearch}
            className="mt-6 mb-6 flex items-center gap-2 rounded-full bg-porcelain p-1 pl-4 shadow-soft"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title, company, location…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft/50"
              aria-label="Search roles"
            />
            <div className="relative hidden shrink-0 sm:block">
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="max-w-[12rem] appearance-none truncate rounded-full bg-[#f2e8de] py-1.5 pl-3 pr-8 text-xs text-ink outline-none"
                aria-label="Filter by company"
              >
                <option value="">All companies</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <svg
                viewBox="0 0 12 12"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-soft"
                aria-hidden
              >
                <path
                  d="M2.5 4.25 6 7.75l3.5-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <button
              type="submit"
              className="focus-ring shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-medium text-porcelain"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <div className="relative z-10 mx-auto mt-5 max-w-6xl px-3 sm:mt-6 sm:px-6">
        <section className="animate-pour overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-porcelain shadow-panel">
          {/* Group 1: filter chips — one job, same control type */}
          <div className="flex gap-1 overflow-x-auto border-b border-[var(--line)] px-3 pb-0 pt-5 scrollbar-thin sm:pt-6">
            {CATEGORY_CHIPS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => applyQuick(c.key)}
                className={`focus-ring shrink-0 border-b-2 px-3 pb-2.5 text-sm transition ${
                  chip === c.key
                    ? "border-gold font-semibold text-ink"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            {/* Group 2: role counts — similarity + proximity (all number tiles) */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
                Role counts
              </p>
              <div className="mt-2 grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
                {filterStats.map((stat) => (
                  <button
                    key={stat.key}
                    type="button"
                    onClick={() => applyQuick(stat.key)}
                    className="focus-ring w-full rounded-xl border border-[var(--line)] bg-[#f2e8de]/50 px-3 py-3 text-left transition hover:border-gold/40"
                  >
                    <p className="text-xl font-semibold tabular-nums text-ink">
                      {stat.count}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">{stat.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Your tools — icons only, never mixed with counts */}
            <div className="border-t border-[var(--line)] pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
                Your tools
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Link
                  href="/watchlist"
                  className="focus-ring flex flex-col items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[#f2e8de]/40 px-2 py-3 text-center transition hover:border-gold/45"
                >
                  <IconWatch className="h-6 w-6 text-[#6f675f]" />
                  <span className="text-xs font-medium text-ink">Watchlist</span>
                  <span className="text-[10px] text-ink-soft">
                    {watchedCompanies.length} companies
                  </span>
                </Link>
                <Link
                  href="/outreach"
                  className="focus-ring flex flex-col items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[#f2e8de]/40 px-2 py-3 text-center transition hover:border-gold/45"
                >
                  <IconOutreach className="h-6 w-6 text-[#6f675f]" />
                  <span className="text-xs font-medium text-ink">Outreach</span>
                  <span className="text-[10px] text-ink-soft">Recruiters</span>
                </Link>
                <Link
                  href="/tracker"
                  className="focus-ring flex flex-col items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[#f2e8de]/40 px-2 py-3 text-center transition hover:border-gold/45"
                >
                  <IconTracker className="h-6 w-6 text-[#6f675f]" />
                  <span className="text-xs font-medium text-ink">Tracker</span>
                  <span className="text-[10px] text-ink-soft">Applications</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Status strip + live refresh */}
        <div className="animate-pour stagger-1 mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-porcelain/90 px-3 py-2.5 text-sm text-ink-soft shadow-soft">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-chartreuse/25 text-xs text-gold">
            ●
          </span>
          <p className="min-w-0 flex-1">
            <span className="font-semibold text-ink">{filtered.length}</span> roles
            {pending ? " · steeping…" : ""}
            {updatedAt
              ? ` · verified ${relativeTime(updatedAt)} · ${source}`
              : " · not refreshed yet"}
            {refreshMsg ? (
              <span className="mt-0.5 block text-xs text-ink">{refreshMsg}</span>
            ) : (
              <span className="mt-0.5 block text-xs">
                Pull latest design listings from your company allowlist anytime.
              </span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {(q || chip !== "all" || company) && (
              <button
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setQ("");
                    setChip("all");
                    setCompany("");
                  });
                }}
                className="focus-ring text-xs text-gold underline-offset-2 hover:underline"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={refreshJobs}
              disabled={refreshing}
              className="focus-ring rounded-full bg-jade px-3.5 py-1.5 text-xs font-medium text-porcelain disabled:opacity-60"
            >
              {refreshing ? "Refreshing…" : "Refresh jobs"}
            </button>
          </div>
        </div>

        {/* Featured / open roles */}
        <section id="open-roles" className="animate-pour stagger-2 mt-5 scroll-mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
            <h2 className="brand-display text-2xl text-ink sm:text-3xl">
              Open roles
            </h2>
            <span className="text-xs text-ink-soft">
              {filtered.length} matching
            </span>
          </div>

          <ul className="tea-surface divide-y divide-[var(--line)] overflow-hidden rounded-[1.25rem]">
            {featured.length === 0 ? (
              <li className="px-4 py-12 text-center text-sm text-ink-soft">
                No matching roles — reset filters or refresh allowlist boards.
              </li>
            ) : (
              featured.map((job) => (
                <li key={job.id} className="job-row">
                  <div className="flex flex-col gap-2.5 px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <CompanyLogo companyName={job.companyName} />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/jobs/${job.id}`}
                            className="focus-ring text-[15px] font-medium text-ink hover:text-gold"
                          >
                            {job.title}
                          </Link>
                          <StatusBadge value={job.status} />
                        </div>
                        <p className="text-xs text-ink-soft sm:text-sm">
                          {job.companyName}
                          {job.locationText ? ` · ${job.locationText}` : ""}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <EligibilityBadge value={job.eligibility} />
                          <ExperienceBadge value={job.experienceBand} />
                          <WorkStyleBadge value={job.workStyle} />
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="focus-ring rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-ink-soft"
                      >
                        Details
                      </Link>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="focus-ring rounded-full border border-gold/40 bg-chartreuse/15 px-3 py-1.5 text-xs text-ink"
                      >
                        Applied?
                      </Link>
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="focus-ring rounded-full bg-jade px-3 py-1.5 text-xs font-medium text-porcelain"
                      >
                        Apply
                      </a>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>

          {filtered.length > featured.length ? (
            <p className="mt-2 text-center text-xs text-ink-soft">
              Showing top {featured.length} of {filtered.length} — scroll for
              full board
            </p>
          ) : null}
        </section>

        {/* Company watch */}
        <section className="animate-pour stagger-3 mt-6">
          <div className="mb-2 flex items-baseline justify-between px-0.5">
            <h2 className="brand-display text-2xl text-ink">Company watch</h2>
            <Link href="/watchlist" className="text-xs text-gold hover:underline">
              Manage →
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {watchedCompanies.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setCompany(name);
                    setChip("all");
                  });
                  document
                    .getElementById("open-roles")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`focus-ring flex shrink-0 items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition ${
                  company === name
                    ? "border-jade bg-jade text-porcelain"
                    : "border-[var(--line)] bg-porcelain hover:border-gold/50"
                }`}
              >
                <CompanyLogo companyName={name} size="sm" />
                <span>
                  <p className="text-sm font-medium">{name}</p>
                  <p
                    className={`text-[11px] ${company === name ? "text-porcelain/80" : "text-ink-soft"}`}
                  >
                    {companyCounts.get(name) ?? 0} open
                  </p>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Tracker entry */}
        <Link
          href="/tracker"
          className="focus-ring mt-5 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-gradient-to-r from-foam to-porcelain px-4 py-3.5 shadow-soft transition hover:border-gold/45"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-jade text-sm font-semibold text-porcelain">
            T
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">
              Application tracker
            </span>
            <span className="block text-xs text-ink-soft">
              Saved · Applied · Interviewing · Offer · Rejected — private notes
            </span>
          </span>
          <span className="text-gold">→</span>
        </Link>

        {/* Full board remainder */}
        <section id="board" className="mt-8 scroll-mt-4">
          <div className="mb-2 flex items-baseline justify-between px-0.5">
            <h2 className="brand-display text-2xl text-ink sm:text-3xl">
              Full board
            </h2>
            <span className="text-xs text-ink-soft">
              {filtered.length} roles
            </span>
          </div>
          <ul className="tea-surface divide-y divide-[var(--line)] overflow-hidden rounded-[1.25rem]">
            {filtered.map((job) => (
              <li key={`full-${job.id}`} className="job-row">
                <div className="flex flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <CompanyLogo companyName={job.companyName} size="sm" />
                    <div className="min-w-0">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="focus-ring text-sm font-medium text-ink hover:text-gold"
                      >
                        {job.title}
                      </Link>
                      <p className="text-xs text-ink-soft">
                        {job.companyName}
                        {job.locationText ? ` · ${job.locationText}` : ""}
                        {" · "}
                        verified {relativeTime(job.lastVerifiedAt)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-porcelain"
                  >
                    Apply
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
