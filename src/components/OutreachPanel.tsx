"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  allRecruiters,
  fillTemplate,
  MESSAGE_TEMPLATES,
  saveUserRecruiter,
} from "@/lib/outreach/recruiters";
import {
  fetchOutreach,
  patchOutreach,
  queueOutreach,
  removeOutreach,
} from "@/lib/tracking/client";
import type {
  OutreachRecord,
  OutreachStatus,
  RecruiterTarget,
} from "@/lib/tracking/types";

const OUTREACH_STATUSES: OutreachStatus[] = [
  "queued",
  "drafted",
  "sent",
  "connected",
  "replied",
  "closed",
];

export function OutreachPanel({
  initialCompany = "",
  initialRole = "",
  initialJobId = "",
  hiringCompanies,
}: {
  initialCompany?: string;
  initialRole?: string;
  initialJobId?: string;
  hiringCompanies: string[];
}) {
  const [queue, setQueue] = useState<OutreachRecord[]>([]);
  const [mode, setMode] = useState<"local" | "supabase">("local");
  const [company, setCompany] = useState(initialCompany);
  const [roleTitle, setRoleTitle] = useState(initialRole);
  const [recruiters, setRecruiters] = useState<RecruiterTarget[]>([]);
  const [selected, setSelected] = useState<RecruiterTarget | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [templateKey, setTemplateKey] = useState<string>(MESSAGE_TEMPLATES[0].key);
  const [fields, setFields] = useState({
    recruiter_first_name: "",
    portfolio_url: "https://",
    one_line_hook: "",
  });
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    setRecruiters(allRecruiters());
    (async () => {
      const result = await fetchOutreach();
      setQueue(result.outreach);
      setMode(result.mode);
    })();
  }, []);

  const companyRecruiters = useMemo(() => {
    if (!company) return recruiters;
    return recruiters.filter(
      (r) => r.company_name.toLowerCase() === company.toLowerCase(),
    );
  }, [recruiters, company]);

  const prioritizedCompanies = useMemo(() => {
    const set = new Set(hiringCompanies);
    const fromCurated = Array.from(
      new Set(recruiters.map((r) => r.company_name)),
    );
    return [
      ...hiringCompanies,
      ...fromCurated.filter((c) => !set.has(c)),
    ];
  }, [hiringCompanies, recruiters]);

  useEffect(() => {
    const tpl =
      MESSAGE_TEMPLATES.find((t) => t.key === templateKey) ??
      MESSAGE_TEMPLATES[0];
    const first =
      fields.recruiter_first_name ||
      selected?.full_name.split(" ")[0] ||
      "there";
    setDraft(
      fillTemplate(tpl.body, {
        recruiter_first_name: first,
        company: company || selected?.company_name || "your team",
        role_title: roleTitle || "the design role",
        portfolio_url: fields.portfolio_url,
        one_line_hook:
          fields.one_line_hook ||
          "I admire the product craft and would love to contribute.",
      }),
    );
  }, [templateKey, fields, company, roleTitle, selected]);

  function pickRecruiter(r: RecruiterTarget) {
    setSelected(r);
    setCompany(r.company_name);
    setLinkedinUrl(r.linkedin_url);
    const first = r.full_name.split(" ")[0];
    if (first && first !== "University" && first !== "Campus" && first !== "Design") {
      setFields((f) => ({ ...f, recruiter_first_name: first }));
    } else {
      setFields((f) => ({ ...f, recruiter_first_name: "" }));
    }
  }

  async function addToQueue() {
    if (!company || !selected) {
      setMessage("Pick a company recruiter target first");
      return;
    }
    const url = linkedinUrl.trim();
    if (!url) {
      setMessage("Paste their LinkedIn profile URL before queueing");
      return;
    }
    const result = await queueOutreach({
      companyName: company,
      recruiterId: selected.id,
      recruiterName: selected.full_name,
      linkedinUrl: url,
      roleTitle: roleTitle || "Design role",
      jobId: initialJobId || null,
      status: "drafted",
      draftMessage: draft,
    });
    setMode(result.mode);
    setQueue((prev) => [result.item, ...prev]);
    setMessage(
      result.mode === "local"
        ? "Queued on this device — open LinkedIn and paste the draft yourself"
        : "Queued in your private outreach list",
    );
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setMessage("Could not copy — select the draft text manually");
    }
  }

  async function onAddRecruiter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const row = saveUserRecruiter({
      company_name: String(fd.get("company") ?? company).trim(),
      full_name: String(fd.get("name") ?? "").trim(),
      title_hint: String(fd.get("title") ?? "").trim(),
      linkedin_url: String(fd.get("linkedin") ?? "").trim(),
      role_tags: ["user_added"],
      why_priority: "You added this recruiter",
    });
    setRecruiters(allRecruiters());
    pickRecruiter(row);
    setShowAdd(false);
    e.currentTarget.reset();
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-soft">
        No LinkedIn scraping or auto-send. Paste profile URLs you find yourself,
        draft here, copy, then message manually. Storage:{" "}
        <span className="font-medium text-ink">
          {mode === "local" ? "this device" : "Supabase"}
        </span>
        .
      </p>

      <section className="tea-surface grid gap-4 rounded-tea p-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-ink-soft">Company (hiring now prioritized)</span>
            <select
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setSelected(null);
              }}
              className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2"
            >
              <option value="">Select company</option>
              {prioritizedCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                  {hiringCompanies.includes(c) ? " · open roles" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Role you’re targeting</span>
            <input
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2"
              placeholder="Product Design Intern (2027)"
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Recruiter targets
              </p>
              <button
                type="button"
                onClick={() => setShowAdd((v) => !v)}
                className="text-xs text-gold underline"
              >
                {showAdd ? "Cancel" : "Add LinkedIn URL"}
              </button>
            </div>
            {showAdd ? (
              <form
                onSubmit={onAddRecruiter}
                className="mb-3 space-y-2 rounded-xl border border-[var(--line)] bg-foam/60 p-3"
              >
                <input
                  name="company"
                  defaultValue={company}
                  required
                  placeholder="Company"
                  className="focus-ring w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-1.5 text-sm"
                />
                <input
                  name="name"
                  required
                  placeholder="Recruiter name"
                  className="focus-ring w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-1.5 text-sm"
                />
                <input
                  name="title"
                  placeholder="Title hint"
                  className="focus-ring w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-1.5 text-sm"
                />
                <input
                  name="linkedin"
                  required
                  type="url"
                  placeholder="https://www.linkedin.com/in/…"
                  className="focus-ring w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  className="focus-ring rounded-full bg-jade px-3 py-1.5 text-xs text-porcelain"
                >
                  Save recruiter
                </button>
              </form>
            ) : null}
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {companyRecruiters.length === 0 ? (
                <li className="text-sm text-ink-soft">
                  No slots yet — add a recruiter with their LinkedIn URL, or pick
                  another company with open roles.
                </li>
              ) : (
                companyRecruiters.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => pickRecruiter(r)}
                      className={`focus-ring w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        selected?.id === r.id
                          ? "border-gold bg-chartreuse/20"
                          : "border-[var(--line)] bg-porcelain hover:border-gold/40"
                      }`}
                    >
                      <p className="font-medium text-ink">{r.full_name}</p>
                      <p className="text-xs text-ink-soft">{r.title_hint}</p>
                      <p className="mt-1 text-[11px] text-ink-soft/80">
                        {r.why_priority}
                        {r.linkedin_url ? "" : " · paste LinkedIn URL →"}
                      </p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-ink-soft">LinkedIn profile URL</span>
            <input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2"
              placeholder="https://www.linkedin.com/in/…"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-ink-soft">First name</span>
              <input
                value={fields.recruiter_first_name}
                onChange={(e) =>
                  setFields((f) => ({
                    ...f,
                    recruiter_first_name: e.target.value,
                  }))
                }
                className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-ink-soft">Portfolio URL</span>
              <input
                value={fields.portfolio_url}
                onChange={(e) =>
                  setFields((f) => ({ ...f, portfolio_url: e.target.value }))
                }
                className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-ink-soft">One-line hook</span>
            <input
              value={fields.one_line_hook}
              onChange={(e) =>
                setFields((f) => ({ ...f, one_line_hook: e.target.value }))
              }
              className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2"
              placeholder="Specific product observation…"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Template</span>
            <select
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2"
            >
              {MESSAGE_TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Draft (you send manually)</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              className="focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-porcelain px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyDraft}
              className="focus-ring rounded-full border border-[var(--line)] bg-porcelain px-4 py-2 text-sm"
            >
              {copied ? "Copied" : "Copy draft"}
            </button>
            {linkedinUrl ? (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring rounded-full border border-gold/40 bg-chartreuse/20 px-4 py-2 text-sm"
              >
                Open LinkedIn
              </a>
            ) : null}
            <button
              type="button"
              onClick={addToQueue}
              className="focus-ring rounded-full bg-jade px-4 py-2 text-sm font-medium text-porcelain"
            >
              Add to outreach queue
            </button>
          </div>
          {message ? <p className="text-xs text-ink-soft">{message}</p> : null}
        </div>
      </section>

      <section>
        <h2 className="brand-display mb-3 text-2xl text-ink">Outreach queue</h2>
        {queue.length === 0 ? (
          <p className="tea-surface rounded-tea p-4 text-sm text-ink-soft">
            Empty — draft a message and queue a recruiter above.
          </p>
        ) : (
          <ul className="tea-surface divide-y divide-[var(--line)] overflow-hidden rounded-tea">
            {queue.map((item) => (
              <li key={item.id} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">
                      {item.recruiter_name} · {item.company_name}
                    </p>
                    <p className="text-xs text-ink-soft">{item.role_title}</p>
                  </div>
                  <select
                    value={item.status}
                    onChange={async (e) => {
                      const result = await patchOutreach(item.id, {
                        status: e.target.value as OutreachStatus,
                      });
                      if (result) {
                        setQueue((prev) =>
                          prev.map((q) =>
                            q.id === item.id ? result.item : q,
                          ),
                        );
                      }
                    }}
                    className="focus-ring rounded-full border border-[var(--line)] bg-porcelain px-2 py-1 text-xs"
                  >
                    {OUTREACH_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                {item.draft_message ? (
                  <p className="whitespace-pre-wrap rounded-lg bg-foam/70 p-2 text-xs text-ink-soft">
                    {item.draft_message}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-3 text-xs">
                  {item.linkedin_url ? (
                    <a
                      href={item.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold underline"
                    >
                      LinkedIn
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={async () => {
                      if (item.draft_message) {
                        await navigator.clipboard.writeText(item.draft_message);
                      }
                    }}
                    className="text-gold underline"
                  >
                    Copy draft
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await removeOutreach(item.id);
                      setQueue((prev) => prev.filter((q) => q.id !== item.id));
                    }}
                    className="ml-auto text-clay underline"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
