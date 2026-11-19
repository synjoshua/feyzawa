"use client";

import { useState } from "react";
import type { NormalizedJob } from "@/lib/ats/types";
import { linkedinPeopleSearchUrl } from "@/lib/outreach/recruiters";
import { trackApplication } from "@/lib/tracking/client";

export function TrackJobActions({ job }: { job: NormalizedJob }) {
  const [busy, setBusy] = useState<"saved" | "applied" | null>(null);
  const [done, setDone] = useState<"saved" | "applied" | null>(null);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"supabase" | "local" | null>(null);

  async function track(status: "saved" | "applied") {
    setBusy(status);
    setMessage("");
    try {
      const result = await trackApplication({
        jobId: job.id,
        title: job.title,
        company: job.companyName,
        applyUrl: job.applyUrl,
        location: job.locationText,
        status,
      });
      setDone(status);
      setMode(result.mode);
      setMessage(
        status === "applied"
          ? result.mode === "local"
            ? "Marked applied (saved on this device)"
            : "Marked applied in your tracker"
          : result.mode === "local"
            ? "Saved on this device"
            : "Saved to your tracker",
      );
    } catch {
      setMessage("Could not update tracker");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => track("saved")}
          disabled={busy !== null || done === "saved"}
          className="focus-ring rounded-full border border-[var(--line)] bg-porcelain px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-60"
        >
          {done === "saved" ? "Saved" : busy === "saved" ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => track("applied")}
          disabled={busy !== null || done === "applied"}
          className="focus-ring rounded-full bg-jade px-4 py-2.5 text-sm font-medium text-porcelain disabled:opacity-60"
        >
          {done === "applied"
            ? "Applied ✓"
            : busy === "applied"
              ? "Saving…"
              : "I already applied"}
        </button>
        <a
          href={`/outreach?company=${encodeURIComponent(job.companyName)}&role=${encodeURIComponent(job.title)}&jobId=${encodeURIComponent(job.id)}`}
          className="focus-ring rounded-full border border-gold/40 bg-chartreuse/15 px-4 py-2.5 text-sm font-medium text-ink"
        >
          Find recruiters
        </a>
        <a
          href={linkedinPeopleSearchUrl(
            `("product design" OR design OR university) (recruiter OR "talent acquisition") "${job.companyName}"`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring rounded-full border border-[var(--line)] bg-porcelain px-4 py-2.5 text-sm font-medium text-ink"
        >
          Search LinkedIn
        </a>
      </div>
      {message ? (
        <p className="text-xs text-ink-soft">
          {message}
          {mode === "local" ? (
            <>
              {" "}
              · <a href="/tracker" className="text-gold underline">Open tracker</a>
              {" · "}
              <a href="/login" className="text-gold underline">
                Sign in
              </a>{" "}
              to sync across devices
            </>
          ) : (
            <>
              {" "}
              · <a href="/tracker" className="text-gold underline">Open tracker</a>
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
