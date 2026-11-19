import type { RecruiterTarget } from "@/lib/tracking/types";

/**
 * Curated recruiter *slots* for companies that often hire design early-career.
 * LinkedIn URLs are intentionally empty or user-supplied — we do not scrape LinkedIn.
 * Joshua pastes real profile URLs he finds himself.
 */
export const CURATED_RECRUITERS: RecruiterTarget[] = [
  {
    id: "curated-figma-uni",
    company_name: "Figma",
    full_name: "University / early-career recruiter",
    title_hint: "University Recruiting · Design",
    linkedin_url: "",
    role_tags: ["university", "design", "early_career"],
    why_priority: "Priority when Product Design Intern is live",
    source: "curated",
  },
  {
    id: "curated-stripe-uni",
    company_name: "Stripe",
    full_name: "University recruiter",
    title_hint: "University Recruiting",
    linkedin_url: "",
    role_tags: ["university", "early_career"],
    why_priority: "Product Design Intern postings appear regularly",
    source: "curated",
  },
  {
    id: "curated-notion-design",
    company_name: "Notion",
    full_name: "Design talent partner",
    title_hint: "Talent · Product Design",
    linkedin_url: "",
    role_tags: ["design", "early_career"],
    why_priority: "Design intern roles when open",
    source: "curated",
  },
  {
    id: "curated-pinterest-uni",
    company_name: "Pinterest",
    full_name: "Campus recruiter",
    title_hint: "University Recruiting",
    linkedin_url: "",
    role_tags: ["university", "design"],
    why_priority: "Product Design Intern (USA) pipeline",
    source: "curated",
  },
  {
    id: "curated-palantir-design",
    company_name: "Palantir",
    full_name: "Design recruiter",
    title_hint: "Talent Acquisition · Design",
    linkedin_url: "",
    role_tags: ["design", "early_career"],
    why_priority: "New-grad / internship Product Designer postings",
    source: "curated",
  },
  {
    id: "curated-openai-design",
    company_name: "OpenAI",
    full_name: "Design recruiter",
    title_hint: "Recruiting · Design",
    linkedin_url: "",
    role_tags: ["design"],
    why_priority: "Active Product Designer hiring in SF",
    source: "curated",
  },
  {
    id: "curated-coinbase-uni",
    company_name: "Coinbase",
    full_name: "University recruiter",
    title_hint: "University Programs",
    linkedin_url: "",
    role_tags: ["university", "early_career"],
    why_priority: "Product Design Intern when listed",
    source: "curated",
  },
  {
    id: "curated-ramp-design",
    company_name: "Ramp",
    full_name: "Design talent partner",
    title_hint: "Talent · Design",
    linkedin_url: "",
    role_tags: ["design"],
    why_priority: "Product Designer roles when open",
    source: "curated",
  },
];

export const MESSAGE_TEMPLATES = [
  {
    key: "cold_connect",
    name: "Cold connect (short)",
    body: `Hi {{recruiter_first_name}} — I'm a new-grad product/UX designer exploring {{company}}. I recently applied to {{role_title}} and would love to connect. Portfolio: {{portfolio_url}}`,
  },
  {
    key: "after_apply",
    name: "After apply",
    body: `Hi {{recruiter_first_name}}, I just applied to {{role_title}} at {{company}}. {{one_line_hook}} Happy to share more via my portfolio: {{portfolio_url}}`,
  },
  {
    key: "intern_ask",
    name: "Internship interest",
    body: `Hi {{recruiter_first_name}} — reaching out about design internship / early-career paths at {{company}}. Especially interested in {{role_title}}. {{one_line_hook}} Portfolio: {{portfolio_url}}`,
  },
] as const;

export function fillTemplate(
  body: string,
  fields: Record<string, string>,
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => fields[key] ?? "");
}

export function recruitersForCompany(company: string): RecruiterTarget[] {
  return CURATED_RECRUITERS.filter(
    (r) => r.company_name.toLowerCase() === company.toLowerCase(),
  );
}

const USER_RECRUITERS_KEY = "feyzawa.user_recruiters.v1";

export function listUserRecruiters(): RecruiterTarget[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_RECRUITERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecruiterTarget[];
  } catch {
    return [];
  }
}

export function saveUserRecruiter(
  input: Omit<RecruiterTarget, "id" | "source"> & { id?: string },
): RecruiterTarget {
  const row: RecruiterTarget = {
    id: input.id ?? `user_${Date.now()}`,
    company_name: input.company_name,
    full_name: input.full_name,
    title_hint: input.title_hint,
    linkedin_url: input.linkedin_url,
    role_tags: input.role_tags,
    why_priority: input.why_priority,
    source: "user_added",
  };
  const all = listUserRecruiters().filter((r) => r.id !== row.id);
  all.unshift(row);
  localStorage.setItem(USER_RECRUITERS_KEY, JSON.stringify(all));
  return row;
}

export function allRecruiters(): RecruiterTarget[] {
  return [...listUserRecruiters(), ...CURATED_RECRUITERS];
}
