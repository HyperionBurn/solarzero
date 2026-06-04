/**
 * Remove accidental leading/trailing whitespace from environment values.
 *
 * Vercel CLI can persist env vars with stray newlines when values are piped
 * through stdin. Trimming them here keeps production secrets usable even when
 * the dashboard value is slightly malformed.
 */
export function cleanEnvValue(value: string | undefined | null): string {
  return (value ?? "").trim();
}

/**
 * Return `undefined` for blank env values after trimming.
 */
export function optionalEnvValue(value: string | undefined | null): string | undefined {
  const cleaned = cleanEnvValue(value);
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Mutate `process.env` in place for the provided keys so downstream libraries
 * see normalized values without each caller needing to trim manually.
 */
export function normalizeEnvKeys(...keys: string[]): void {
  for (const key of keys) {
    const current = process.env[key];
    if (current === undefined) continue;

    const cleaned = current.trim();
    if (cleaned !== current) {
      process.env[key] = cleaned;
    }
  }
}
