export type ApplicationStatus =
  | "saved"
  | "not_interested"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected";

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
