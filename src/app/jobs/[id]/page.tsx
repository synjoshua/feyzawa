import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import {
  ExperienceBadge,
  StatusBadge,
  WorkStyleBadge,
} from "@/components/Badges";
import { BookmarkButton } from "@/components/BookmarkButton";
import { NotInterestedButton } from "@/components/NotInterestedButton";
import { TrackJobActions } from "@/components/TrackJobActions";
import { getJobById } from "@/lib/jobs/store";
import { relativeTime } from "@/lib/format";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [job, user] = await Promise.all([getJobById(id), getCurrentUser()]);
  if (!job) notFound();

  return (
    <PageShell
      signedIn={Boolean(user)}
      eyebrow={job.companyName}
      title={job.title}
      description={job.locationText || "Location not listed"}
      actions={<StatusBadge value={job.status} />}
    >
      <Link
        href="/"
        className="focus-ring text-sm text-gold hover:underline"
      >
        ← Back to board
      </Link>

      <article className="mt-4 overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-porcelain p-5 shadow-panel sm:p-8">
        <div className="flex flex-wrap gap-1.5">
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

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <BookmarkButton job={job} />
          <NotInterestedButton job={job} />
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring rounded-full bg-[#2c2827] px-4 py-2.5 text-sm font-medium text-porcelain hover:bg-ink"
          >
            Open official apply page
          </a>
          <TrackJobActions job={job} />
        </div>

        {job.descriptionText ? (
          <div className="mt-8 border-t border-[var(--line)] pt-6">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
              Description excerpt
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {job.descriptionText.slice(0, 4000)}
              {job.descriptionText.length > 4000 ? "…" : ""}
            </p>
          </div>
        ) : null}
      </article>
    </PageShell>
  );
}
