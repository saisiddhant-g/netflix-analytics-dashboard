import type { CleanNetflixTitle } from './cleanData';

/** Minimal CSV parser — handles quoted fields with commas inside. */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

  return lines
    .slice(1)
    .filter(l => l.trim() !== '')
    .map(line => {
      const values = splitCSVLine(line);
      return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]));
    });
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function orUnknown(v: string | undefined): string {
  return v && v.trim() ? v.trim() : 'Unknown';
}

function normalizeCountry(c: string): string {
  return orUnknown(c.split(',')[0]);
}

function normalizePrimaryGenre(g: string): string {
  return orUnknown(g.split(',')[0]);
}

function extractDurationInt(d: string): number | null {
  const m = d.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Parse a CSV string into CleanNetflixTitle[].
 * Returns { data, errors } — errors is a list of row-level issues.
 */
export function parseUploadedCSV(
  text: string,
): { data: CleanNetflixTitle[]; errors: string[] } {
  const errors: string[] = [];
  let rows: Record<string, string>[];

  try {
    rows = parseCSV(text);
  } catch {
    return { data: [], errors: ['Failed to parse CSV — check the file format.'] };
  }

  if (rows.length === 0) {
    return { data: [], errors: ['CSV appears to be empty.'] };
  }

  const data: CleanNetflixTitle[] = [];

  rows.forEach((row, i) => {
    try {
      const type = row['type'] === 'TV Show' ? 'TV Show' : 'Movie';
      const releaseYear = parseInt(row['release_year'] ?? '', 10);

      if (isNaN(releaseYear)) {
        errors.push(`Row ${i + 2}: invalid release_year "${row['release_year']}"`);
        return;
      }

      data.push({
        show_id:      orUnknown(row['show_id'] ?? `upload_${i}`),
        type,
        title:        orUnknown(row['title']),
        director:     orUnknown(row['director']),
        cast:         orUnknown(row['cast']),
        country:      normalizeCountry(row['country'] ?? ''),
        date_added:   orUnknown(row['date_added']),
        release_year: releaseYear,
        rating:       orUnknown(row['rating']),
        duration:     orUnknown(row['duration']),
        listed_in:    orUnknown(row['listed_in']),
        description:  orUnknown(row['description']),
        primary_genre:  normalizePrimaryGenre(row['listed_in'] ?? ''),
        duration_int:   extractDurationInt(row['duration'] ?? ''),
      });
    } catch {
      errors.push(`Row ${i + 2}: unexpected error, skipped.`);
    }
  });

  return { data, errors };
}
