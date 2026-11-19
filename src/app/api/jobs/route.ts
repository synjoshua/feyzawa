import { NextResponse } from "next/server";
import { loadJobs } from "@/lib/jobs/store";
import type { NormalizedJob } from "@/lib/ats/types";

export const runtime = "nodejs";

function filterJobs(
  jobs: NormalizedJob[],
  params: URLSearchParams,
): NormalizedJob[] {
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const work = params.getAll("work");
  const eligibility = params.getAll("eligibility");
  const experience = params.getAll("experience");
  const company = (params.get("company") ?? "").trim().toLowerCase();
  const status = params.get("status") ?? "active";
  const california = params.get("california");
  const remote = params.get("remote");
  const internship = params.get("internship");

  return jobs.filter((job) => {
    if (status === "active" && job.status !== "active") return false;
    if (status === "closed" && job.status !== "potentially_closed") return false;

    if (q) {
      const hay = `${job.title} ${job.companyName} ${job.locationText} ${job.descriptionText}`
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (company && !job.companyName.toLowerCase().includes(company)) {
      return false;
    }

    if (work.length && !work.includes(job.workStyle)) return false;
    if (eligibility.length && !eligibility.includes(job.eligibility))
      return false;
    if (experience.length && !experience.includes(job.experienceBand))
      return false;
    if (california === "1" && !job.isCalifornia) return false;
    if (remote === "1" && !job.isRemote) return false;
    if (internship === "1" && !job.isInternship) return false;

    return true;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loaded = await loadJobs();
  const filtered = filterJobs(loaded.jobs, searchParams);

  return NextResponse.json({
    source: loaded.source,
    updatedAt: loaded.updatedAt,
    summary: loaded.summary,
    count: filtered.length,
    total: loaded.jobs.length,
    jobs: filtered,
  });
}
