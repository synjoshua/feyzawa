import { DenseHome } from "@/components/DenseHome";
import { getCompanyAllowlist } from "@/lib/ats/allowlist";
import { sortJobs } from "@/lib/ats/normalize";
import { loadJobs } from "@/lib/jobs/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { jobs, updatedAt, source } = await loadJobs();
  const sorted = sortJobs(jobs);
  const companies = Array.from(
    new Set(sorted.map((j) => j.companyName)),
  ).sort((a, b) => a.localeCompare(b));

  const watchedCompanies = getCompanyAllowlist()
    .filter((c) => c.watchedByDefault)
    .map((c) => c.name);

  // Prefer companies that currently have open roles first in the watch strip
  const withRoles = watchedCompanies
    .map((name) => ({
      name,
      count: sorted.filter(
        (j) => j.companyName === name && j.status === "active",
      ).length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((c) => c.name);

  const watchStrip = [
    ...withRoles,
    ...companies.filter((c) => !withRoles.includes(c)),
  ].slice(0, 12);

  return (
    <main className="min-h-screen">
      <DenseHome
        initialJobs={sorted}
        updatedAt={updatedAt}
        source={source}
        companies={companies}
        watchedCompanies={watchStrip}
      />
    </main>
  );
}
