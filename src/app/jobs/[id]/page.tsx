import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import {
  EligibilityBadge,
  ExperienceBadge,
  StatusBadge,
  WorkStyleBadge,
} from "@/components/Badges";
import { SaveJobButton } from "@/components/SaveJobButton";
import { getJobById } from "@/lib/jobs/store";
import { relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) notFound();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="focus-ring text-sm text-gold hover:underline"
        >
          ← Back to board
        </Link>

        <article className="animate-pour tea-surface mt-6 rounded-tea p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-ink-soft">{job.companyName}</p>
              <h1 className="brand-display mt-1 text-3xl text-ink sm:text-4xl">
                {job.title}
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                {job.locationText || "Location not listed"}
              </p>
            </div>
            <StatusBadge value={job.status} />
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <EligibilityBadge value={job.eligibility} />
            <ExperienceBadge value={job.experienceBand} />
            <WorkStyleBadge value={job.workStyle} />
          </div>

          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-soft/70">
                Last verified
              </dt>
              <dd className="text-ink">{relativeTime(job.lastVerifiedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-soft/70">
                First seen
              </dt>
              <dd className="text-ink">{relativeTime(job.firstSeenAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-soft/70">
                Source
              </dt>
              <dd className="capitalize text-ink">
                {job.provider} · {job.boardToken}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-soft/70">
                Eligibility notes
              </dt>
              <dd className="text-ink">
                <ul className="list-disc pl-4">
                  {job.eligibilityReasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring rounded-full bg-jade px-4 py-2.5 text-sm font-medium text-porcelain hover:bg-ink"
            >
              Open official apply page
            </a>
            <SaveJobButton job={job} />
          </div>

          {job.descriptionText ? (
            <div className="mt-8 border-t border-[var(--line)] pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
                Description excerpt
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                {job.descriptionText.slice(0, 4000)}
                {job.descriptionText.length > 4000 ? "…" : ""}
              </p>
            </div>
          ) : null}
        </article>
      </main>
    </div>
  );
}
