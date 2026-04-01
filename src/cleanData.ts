import { rawData, type NetflixTitle } from './data';

/**
 * Cleaned version of NetflixTitle with normalized fields and extracted numeric duration.
 */
export interface CleanNetflixTitle extends NetflixTitle {
  /** First country only, or "Unknown" if missing. */
  country: string;
  /** Primary genre (first in listed_in), or "Unknown". */
  primary_genre: string;
  /** Numeric duration extracted from the duration string. */
  duration_int: number | null;
  /** release_year guaranteed to be a number. */
  release_year: number;
}

/** Replaces empty/whitespace strings with "Unknown". */
function orUnknown(val: string): string {
  return val && val.trim() ? val.trim() : 'Unknown';
}

/** Extracts the first country from a comma-separated country string. */
function normalizeCountry(country: string): string {
  const first = country.split(',')[0];
  return orUnknown(first);
}

/** Extracts the primary (first) genre from a comma-separated listed_in string. */
function normalizePrimaryGenre(listed_in: string): string {
  const first = listed_in.split(',')[0];
  return orUnknown(first);
}

/** Extracts the leading integer from a duration string (e.g. "99 min" → 99, "2 Seasons" → 2). */
function extractDurationInt(duration: string): number | null {
  const match = duration.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** Returns a fully cleaned dataset with all normalization applied. */
export const cleanedData: CleanNetflixTitle[] = rawData.map(item => ({
  ...item,
  director: orUnknown(item.director),
  cast: orUnknown(item.cast),
  country: normalizeCountry(item.country),
  rating: orUnknown(item.rating),
  release_year: Number(item.release_year),
  primary_genre: normalizePrimaryGenre(item.listed_in),
  duration_int: extractDurationInt(item.duration),
}));
