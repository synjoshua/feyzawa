import { refreshAllJobs } from "../src/lib/ats/fetch-all";
import { loadJobs, persistJobs } from "../src/lib/jobs/store";

async function main() {
  console.log("Loading previous jobs…");
  const existing = await loadJobs();
  console.log(
    `Previous: ${existing.jobs.length} jobs (source=${existing.source})`,
  );

  console.log("Fetching allowlisted Greenhouse / Lever / Ashby boards…");
  const { jobs, summary } = await refreshAllJobs(existing.jobs);
  const persist = await persistJobs(jobs, summary);

  console.log("\nRefresh summary");
  console.log(JSON.stringify(summary, null, 2));
  console.log("Persist:", persist);
  console.log(
    `Active design matches: ${jobs.filter((j) => j.status === "active").length}`,
  );

  const sample = jobs.filter((j) => j.status === "active").slice(0, 12);
  for (const job of sample) {
    console.log(
      ` - [${job.eligibility}] ${job.companyName} — ${job.title} (${job.locationText})`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
