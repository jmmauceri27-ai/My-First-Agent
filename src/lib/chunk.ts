/** Splits an array into fixed-size pieces -- used to keep Supabase `.in(...)` filters under the URL length
 * PostgREST/its gateway will accept. A single `.in("id", ids)` call with hundreds of UUIDs (each ~36 chars)
 * builds a multi-KB query string and comes back as a plain "Bad Request" with no indication why; chunking the
 * ids and issuing one request per chunk keeps every request well under that limit regardless of how many rows
 * are selected at once. */
export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** Chunk size for `.in("id"/"site_id", ids)` filters built from a user-selected batch of sites (bulk delete,
 * bulk trade changes, etc.) -- 150 UUIDs is comfortably under 8KB even combined with the rest of the query
 * string, while still keeping the number of round trips small for typical selections. */
export const SITE_ID_CHUNK_SIZE = 150;
