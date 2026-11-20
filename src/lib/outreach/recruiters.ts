/** LinkedIn people search deep-link (no scraping). */
export function linkedinPeopleSearchUrl(
  keywords: string,
  opts?: { currentCompany?: string },
): string {
  const params = new URLSearchParams();
  params.set("keywords", keywords.trim());
  if (opts?.currentCompany?.trim()) {
    const company = opts.currentCompany.trim();
    if (!keywords.toLowerCase().includes(company.toLowerCase())) {
      params.set("keywords", `${keywords.trim()} ${company}`.trim());
    }
  }
  params.set("origin", "GLOBAL_SEARCH_HEADER");
  return `https://www.linkedin.com/search/results/people/?${params.toString()}`;
}
