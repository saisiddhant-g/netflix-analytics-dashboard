import type { NetflixTitle } from './data';

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

function orUnknown(val: string): string {
  return val && val.trim() ? val.trim() : 'Unknown';
}

function normalizeCountry(country: string): string {
  return orUnknown(country.split(',')[0]);
}

function normalizePrimaryGenre(listed_in: string): string {
  return orUnknown(listed_in.split(',')[0]);
}

function extractDurationInt(duration: string): number | null {
  const m = duration.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Clean a single raw row into a CleanNetflixTitle. */
export function cleanRow(item: NetflixTitle): CleanNetflixTitle {
  return {
    ...item,
    director:      orUnknown(item.director),
    cast:          orUnknown(item.cast),
    country:       normalizeCountry(item.country),
    rating:        orUnknown(item.rating),
    release_year:  Number(item.release_year),
    primary_genre: normalizePrimaryGenre(item.listed_in),
    duration_int:  extractDurationInt(item.duration),
  };
}

/** Clean an entire array of raw rows. */
export function cleanDataset(rows: NetflixTitle[]): CleanNetflixTitle[] {
  return rows.map(cleanRow);
}
