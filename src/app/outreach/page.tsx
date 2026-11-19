import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { OutreachPanel } from "@/components/OutreachPanel";
import { loadJobs } from "@/lib/jobs/store";

export const dynamic = "force-dynamic";

function Panel({
  company,
  role,
  jobId,
  hiringCompanies,
}: {
  company: string;
  role: string;
  jobId: string;
  hiringCompanies: string[];
}) {
  return (
    <OutreachPanel
      initialCompany={company}
      initialRole={role}
      initialJobId={jobId}
      hiringCompanies={hiringCompanies}
    />
  );
}

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; role?: string; jobId?: string }>;
}) {
  const params = await searchParams;
  const { jobs } = await loadJobs();
  const hiringCompanies = Array.from(
    new Set(
      jobs
        .filter((j) => j.status === "active")
        .map((j) => j.companyName),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="min-h-screen">
      <SiteHeader active="/outreach" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 max-w-2xl">
          <p className="eyebrow">Network</p>
          <h1 className="brand-mark mt-2 text-5xl text-ink">Outreach</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Prioritize recruiters at companies with open design roles. Paste
            LinkedIn URLs, draft a note, copy, and send yourself — never
            auto-DM.
          </p>
        </div>
        <Suspense fallback={<p className="text-sm text-ink-soft">Loading…</p>}>
          <Panel
            company={params.company ?? ""}
            role={params.role ?? ""}
            jobId={params.jobId ?? ""}
            hiringCompanies={hiringCompanies}
          />
        </Suspense>
      </main>
    </div>
  );
}
