import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { SignOutButton } from "@/components/SignOutButton";
import {
  createServerSupabaseClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase/admin";
import type { ApplicationRecord, ApplicationStatus } from "@/lib/tracking/types";

export const dynamic = "force-dynamic";

const STATUS_ORDER: ApplicationStatus[] = [
  "applied",
  "interviewing",
  "saved",
  "not_interested",
  "rejected",
];

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  saved: "Saved",
  not_interested: "Not interested",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};

export default async function ProfilePage() {
  const configured = isSupabaseAuthConfigured();
  const user = await getCurrentUser();

  if (!configured) {
    redirect("/login");
  }
  if (!user) {
    redirect("/login?next=/profile");
  }

  let applications: ApplicationRecord[] = [];
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    applications = (data ?? []) as ApplicationRecord[];
  }

  const counts = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = applications.filter((a) => a.status === status).length;
      return acc;
    },
    {} as Record<ApplicationStatus, number>,
  );

  const appliedAndActive = applications.filter((a) =>
    ["applied", "interviewing", "offer"].includes(a.status),
  );

  return (
    <PageShell
      active="/profile"
      eyebrow="Your account"
      title="Profile"
      signedIn
      description={user.email ?? undefined}
      actions={<SignOutButton />}
    >
      <section className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {STATUS_ORDER.map((status) => (
          <div
            key={status}
            className="rounded-xl border border-[var(--line)] bg-porcelain px-1.5 py-2.5 text-center sm:px-3 sm:py-3"
          >
            <p className="text-lg font-semibold tabular-nums text-ink sm:text-xl">
              {counts[status]}
            </p>
            <p className="text-[10px] leading-tight text-ink-soft sm:text-[11px]">
              {STATUS_LABEL[status]}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-porcelain p-4 shadow-panel sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
            Applied &amp; in progress
          </h2>
          <Link href="/tracker" className="text-xs text-gold underline">
            Open full tracker
          </Link>
        </div>

        {appliedAndActive.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">
            Nothing marked applied yet. From a job, tap{" "}
            <span className="font-medium text-ink">I already applied</span>, or
            add roles on the{" "}
            <Link href="/tracker" className="text-gold underline">
              tracker
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {appliedAndActive.map((app) => (
              <li
                key={app.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{app.title_snapshot}</p>
                  <p className="text-xs text-ink-soft">
                    {app.company_snapshot}
                    {app.location_snapshot
                      ? ` · ${app.location_snapshot}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#f2e8de] px-2.5 py-1 text-[11px] font-medium text-ink">
                  {STATUS_LABEL[app.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {applications.filter((a) => a.status === "saved").length > 0 ? (
        <section className="mt-6 overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-porcelain p-4 shadow-panel sm:p-5">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
            Saved
          </h2>
          <ul className="mt-3 space-y-2">
            {applications
              .filter((a) => a.status === "saved")
              .slice(0, 8)
              .map((app) => (
                <li key={app.id} className="text-sm text-ink">
                  <span className="font-medium">{app.title_snapshot}</span>
                  <span className="text-ink-soft">
                    {" "}
                    · {app.company_snapshot}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </PageShell>
  );
}
