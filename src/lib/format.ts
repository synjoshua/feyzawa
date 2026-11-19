import { formatDistanceToNowStrict, parseISO } from "date-fns";

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

export function eligibilityLabel(value: string): string {
  switch (value) {
    case "confirmed":
      return "Confirmed";
    case "possible":
      return "Possible";
    default:
      return "Unclear";
  }
}

export function experienceLabel(value: string): string {
  switch (value) {
    case "intern":
      return "Intern";
    case "new_grad":
      return "New grad";
    case "junior":
      return "Junior";
    case "associate":
      return "Associate";
    case "mid":
      return "Mid+";
    default:
      return "Open";
  }
}

export function workStyleLabel(value: string): string {
  switch (value) {
    case "remote":
      return "Remote";
    case "hybrid":
      return "Hybrid";
    case "in_person":
      return "In person";
    default:
      return "TBD";
  }
}
