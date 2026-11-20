"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { NormalizedJob } from "@/lib/ats/types";
import { relativeTime } from "@/lib/format";
import {
  EligibilityBadge,
  ExperienceBadge,
  StatusBadge,
  WorkStyleBadge,
} from "./Badges";
import { CompanyLogo } from "./CompanyLogo";

type Props = {
  initialJobs: NormalizedJob[];
  updatedAt: string | null;
  source: string;
  companies: string[];
};

const WORK = ["remote", "hybrid", "in_person"] as const;
const EXPERIENCE = ["intern", "new_grad", "junior", "associate", "unknown"] as const;
const ELIGIBILITY = ["confirmed", "possible", "unclear"] as const;

export function JobBoard({ initialJobs, updatedAt, source, companies }: Props) {
  const [q, setQ] = useState("");
  const [work, setWork] = useState<string[]>([]);
  const [experience, setExperience] = useState<string[]>([]);
  const [eligibility, setEligibility] = useState<string[]>([]);
  const [company, setCompany] = useState("");
  const [californiaOnly, setCaliforniaOnly] = useState(false);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [internOnly, setInternOnly] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return initialJobs.filter((job) => {
      if (!showClosed && job.status !== "active") return false;
      if (query) {
        const hay =
          `${job.title} ${job.companyName} ${job.locationText}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (company && job.companyName !== company) return false;
      if (work.length && !work.includes(job.workStyle)) return false;
      if (experience.length && !experience.includes(job.experienceBand))
        return false;
      if (eligibility.length && !eligibility.includes(job.eligibility))
        return false;
      if (californiaOnly && !job.isCalifornia) return false;
      if (remoteOnly && !job.isRemote) return false;
      if (internOnly && !job.isInternship) return false;
      return true;
    });
  }, [
    initialJobs,
    q,
    work,
    experience,
    eligibility,
    company,
    californiaOnly,
    remoteOnly,
    internOnly,
    showClosed,
  ]);

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    startTransition(() => {
      setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
    });
  }

  function clearFilters() {
    startTransition(() => {
      setQ("");
      setWork([]);
      setExperience([]);
      setEligibility([]);
      setCompany("");
      setCaliforniaOnly(false);
      setRemoteOnly(false);
      setInternOnly(false);
      setShowClosed(false);
    });
  }

  const activeFilterCount =
    work.length +
    experience.length +
    eligibility.length +
    (company ? 1 : 0) +
    (californiaOnly ? 1 : 0) +
    (remoteOnly ? 1 : 0) +
    (internOnly ? 1 : 0) +
    (showClosed ? 1 : 0) +
    (q ? 1 : 0);

  return (
    <div className="space-y-5">
      <section className="animate-pour stagger-1 tea-surface rounded-tea p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, company, location…"
              className="focus-ring w-full rounded-full border border-[var(--line)] bg-porcelain/90 px-4 py-3 text-sm text-ink placeholder:text-ink-soft/45"
            />
          </label>
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="focus-ring rounded-full border border-[var(--line)] bg-porcelain/90 px-4 py-3 text-sm text-ink"
          >
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {WORK.map((w) => (
            <Chip
              key={w}
              active={work.includes(w)}
              onClick={() => toggle(work, w, setWork)}
              label={w.replace("_", " ")}
            />
          ))}
          <span className="mx-1 hidden h-6 w-px bg-[var(--line)] sm:inline-block" />
          {EXPERIENCE.map((e) => (
            <Chip
              key={e}
              active={experience.includes(e)}
              onClick={() => toggle(experience, e, setExperience)}
              label={e.replace("_", " ")}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {ELIGIBILITY.map((e) => (
            <Chip
              key={e}
              active={eligibility.includes(e)}
              onClick={() => toggle(eligibility, e, setEligibility)}
              label={`Eligible: ${e}`}
            />
          ))}
          <Chip
            active={californiaOnly}
            onClick={() => setCaliforniaOnly((v) => !v)}
            label="California"
          />
          <Chip
            active={remoteOnly}
            onClick={() => setRemoteOnly((v) => !v)}
            label="Remote"
          />
          <Chip
            active={internOnly}
            onClick={() => setInternOnly((v) => !v)}
            label="Internships"
          />
          <Chip
            active={showClosed}
            onClick={() => setShowClosed((v) => !v)}
            label="Include maybe-closed"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
          <p>
            <span className="font-semibold text-ink">{filtered.length}</span> roles
            {pending ? " · steeping…" : null}
            {updatedAt ? (
              <span className="ml-2 text-xs">
                verified {relativeTime(updatedAt)} · source {source}
              </span>
            ) : (
              <span className="ml-2 text-xs">no cache yet — run refresh</span>
            )}
          </p>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={clearFilters}
              className="focus-ring rounded-md px-2 py-1 text-xs text-gold underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      <section className="animate-pour stagger-2 overflow-hidden rounded-tea border border-[var(--line)] bg-porcelain/75">
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="brand-display text-3xl text-ink">No matching roles</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
              Honest empty cup — nothing fabricated. Clear filters or refresh
              the allowlist boards.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="focus-ring mt-5 rounded-full bg-jade px-4 py-2 text-sm text-porcelain"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {filtered.map((job) => (
              <li key={job.id} className="job-row">
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <CompanyLogo companyName={job.companyName} />
                    <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="focus-ring text-base font-medium text-ink hover:text-gold"
                      >
                        {job.title}
                      </Link>
                      <StatusBadge value={job.status} />
                    </div>
                    <p className="text-sm text-ink-soft">
                      {job.companyName}
                      {job.locationText ? ` · ${job.locationText}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <EligibilityBadge value={job.eligibility} />
                      <ExperienceBadge value={job.experienceBand} />
                      <WorkStyleBadge value={job.workStyle} />
                    </div>
                    <p className="pt-1 text-[11px] text-ink-soft/75">
                      Last verified {relativeTime(job.lastVerifiedAt)}
                      {job.firstSeenAt !== job.lastSeenAt
                        ? ` · first seen ${relativeTime(job.firstSeenAt)}`
                        : ""}
                    </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="focus-ring rounded-full border border-[var(--line)] bg-foam/60 px-3.5 py-2 text-xs font-medium text-ink-soft hover:border-gold/40 hover:text-gold"
                    >
                      Details
                    </Link>
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring rounded-full bg-jade px-3.5 py-2 text-xs font-medium text-porcelain hover:bg-ink"
                    >
                      Apply
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring rounded-full px-3 py-1 text-xs capitalize transition ${
        active
          ? "bg-jade text-porcelain"
          : "bg-foam/70 text-ink-soft ring-1 ring-inset ring-[var(--line)] hover:bg-porcelain"
      }`}
    >
      {label}
    </button>
  );
}
