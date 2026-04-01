import Papa from 'papaparse';

export interface NetflixTitle {
  show_id: string;
  type: 'Movie' | 'TV Show';
  title: string;
  director: string;
  cast: string;
  country: string;
  date_added: string;
  release_year: number;
  rating: string;
  duration: string;
  listed_in: string;
  description: string;
}

/** Load and parse /public/netflix.csv at runtime. */
export function loadData(): Promise<NetflixTitle[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>('/netflix.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rows: NetflixTitle[] = data.map(row => ({
          show_id:      row.show_id      ?? '',
          type:         (row.type === 'TV Show' ? 'TV Show' : 'Movie') as NetflixTitle['type'],
          title:        row.title        ?? '',
          director:     row.director     ?? '',
          cast:         row.cast         ?? '',
          country:      row.country      ?? '',
          date_added:   row.date_added   ?? '',
          release_year: Number(row.release_year) || 0,
          rating:       row.rating       ?? '',
          duration:     row.duration     ?? '',
          listed_in:    row.listed_in    ?? '',
          description:  row.description  ?? '',
        }));
        resolve(rows);
      },
      error: reject,
    });
  });
}
