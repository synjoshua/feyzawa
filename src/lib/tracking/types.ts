export type ApplicationStatus =
  | "saved"
  | "not_interested"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected";

export type OutreachStatus =
  | "queued"
  | "drafted"
  | "sent"
  | "connected"
  | "replied"
  | "closed";

export interface ApplicationRecord {
  id: string;
  job_id: string | null;
  title_snapshot: string;
  company_snapshot: string;
  apply_url: string | null;
  location_snapshot: string | null;
  status: ApplicationStatus;
  notes: string;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
  source?: "supabase" | "local";
}

export interface RecruiterTarget {
  id: string;
  company_name: string;
  full_name: string;
  title_hint: string;
  linkedin_url: string;
  role_tags: string[];
  why_priority: string;
  source: "curated" | "user_added";
}

export interface OutreachRecord {
  id: string;
  company_name: string;
  recruiter_id: string | null;
  recruiter_name: string;
  linkedin_url: string;
  role_title: string;
  job_id: string | null;
  status: OutreachStatus;
  draft_message: string;
  notes: string;
  created_at: string;
  updated_at: string;
  source?: "supabase" | "local";
}
