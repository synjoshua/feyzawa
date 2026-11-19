/** Simple sequential delay to respect public ATS rate limits. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const ATS_FETCH_DELAY_MS = Number(
  process.env.ATS_FETCH_DELAY_MS ?? "350",
);

export const ATS_MAX_RETRIES = Number(process.env.ATS_MAX_RETRIES ?? "2");

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= ATS_MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          Accept: "application/json",
          "User-Agent": "FeyzawaJobBoard/1.0 (+personal; respectful fetch)",
          ...(init?.headers ?? {}),
        },
        // Avoid Next.js fetch cache for live ATS pulls
        cache: "no-store",
      });

      if (res.status === 429 || res.status >= 500) {
        const backoff = 500 * Math.pow(2, attempt);
        await sleep(backoff);
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;
      await sleep(400 * Math.pow(2, attempt));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("ATS fetch failed after retries");
}
