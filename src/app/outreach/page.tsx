import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
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
    <PageShell
      active="/outreach"
      eyebrow="Network"
      title="Outreach"
      description="Prioritize recruiters at companies with open design roles. Paste LinkedIn URLs, draft a note, copy, and send yourself — never auto-DM."
      maxWidthClass="max-w-5xl"
    >
      <Suspense fallback={<p className="text-sm text-ink-soft">Loading…</p>}>
        <Panel
          company={params.company ?? ""}
          role={params.role ?? ""}
          jobId={params.jobId ?? ""}
          hiringCompanies={hiringCompanies}
        />
      </Suspense>
    </PageShell>
  );
}
