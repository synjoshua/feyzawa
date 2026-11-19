import { SiteHeader } from "@/components/SiteHeader";
import { JobBoard } from "@/components/JobBoard";
import { loadJobs } from "@/lib/jobs/store";
import { sortJobs } from "@/lib/ats/normalize";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { jobs, updatedAt, source } = await loadJobs();
  const sorted = sortJobs(jobs);
  const companies = Array.from(
    new Set(sorted.map((j) => j.companyName)),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="min-h-screen">
      <SiteHeader active="/" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="animate-rise mb-8 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.22em] text-moss">
            Personal design hunt
          </p>
          <h1 className="brand-display mt-2 text-4xl leading-tight text-ink sm:text-5xl">
            Feyzawa
          </h1>
          <p className="mt-3 text-base text-ink-soft sm:text-lg">
            Real UX and product design roles from Greenhouse, Lever, and Ashby —
            filtered for early career, California full-time, and nationwide
            internships. No fabricated listings.
          </p>
        </div>

        <JobBoard
          initialJobs={sorted}
          updatedAt={updatedAt}
          source={source}
          companies={companies}
        />
      </main>
    </div>
  );
}
