import { DenseHome } from "@/components/DenseHome";
import { sortJobs } from "@/lib/ats/normalize";
import { loadJobs } from "@/lib/jobs/store";
import { getCurrentUser } from "@/lib/supabase/server";
import { getWatchedCompanyNames } from "@/lib/watchlist/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const { jobs, updatedAt, source } = await loadJobs();
  const sorted = sortJobs(jobs);
  const companies = Array.from(
    new Set(sorted.map((j) => j.companyName)),
  ).sort((a, b) => a.localeCompare(b));

  const watchedCompanies = await getWatchedCompanyNames(user?.id);

  // Prefer companies that currently have open roles first in the watch strip
  const watchStrip = watchedCompanies
    .map((name) => ({
      name,
      count: sorted.filter(
        (j) => j.companyName === name && j.status === "active",
      ).length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((c) => c.name);

  return (
    <main className="min-h-screen">
      <DenseHome
        initialJobs={sorted}
        updatedAt={updatedAt}
        source={source}
        companies={companies}
        watchedCompanies={watchStrip}
        signedIn={Boolean(user)}
      />
    </main>
  );
}
