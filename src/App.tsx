import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Film, Tv, Search, Calendar, Star, Clock, ChevronRight, Info, SlidersHorizontal,
  Clapperboard, BarChart2, MapPin, Tag, PieChart as PieIcon, Ratio, RotateCcw,
  Upload, X, AlertCircle, CheckCircle2,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cleanedData } from './cleanData';
import type { CleanNetflixTitle } from './cleanData';
import { countByKey, groupByYear, toNameValueArray, topN } from './utils';
import { parseUploadedCSV } from './parseUpload';
import CoverPage from './CoverPage';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Shared UI primitives ────────────────────────────────────────────────────

// ─── Section heading variants ────────────────────────────────────────────────

// Step label — small numbered breadcrumb above a section
const StepLabel = ({ step, children }: { step: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-3">
    <span className="text-[10px] font-bold text-netflix-red uppercase tracking-[0.15em]">{step}</span>
    <span className="flex-1 h-px bg-white/[0.05]" />
    <span className="text-[10px] text-netflix-muted/40 uppercase tracking-[0.12em]">{children}</span>
  </div>
);

// Primary section heading
const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-6">
    <span className="w-[3px] h-5 bg-netflix-red rounded-full" />
    <p className="text-sm font-semibold text-white tracking-tight">{children}</p>
  </div>
);

// Secondary: quieter label for lower-priority sections
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold text-netflix-muted/60 uppercase tracking-[0.14em] mb-4">{children}</p>
);

// Full-bleed divider between major sections
const Divider = () => <div className="h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent mx-6 lg:mx-8" />;

const FilterSelect = ({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-medium text-netflix-muted/70">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#0B0C10] border border-white/[0.08] rounded-lg px-3 py-2
                 text-sm text-white focus:outline-none focus:border-netflix-red/40
                 transition-colors hover:border-white/20"
    >
      <option value="All">All</option>
      {options.map(o => <option key={o} value={o} className="bg-[#13151C]">{o}</option>)}
    </select>
  </div>
);

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string;
  label?: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  sub?: React.ReactNode;
}

const KpiCard = ({ title, value, label, icon: Icon, trend, trendUp, sub }: KpiCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2, transition: { duration: 0.15 } }}
    className={cn(
      'relative bg-netflix-card rounded-2xl border border-white/[0.06] p-5 flex flex-col gap-3.5',
      'hover:border-netflix-red/20 transition-colors duration-200 group overflow-hidden cursor-default',
    )}
    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.25)' }}
  >
    {/* top-left radial glow — only on hover */}
    <span className="pointer-events-none absolute -top-8 -left-8 w-32 h-32 rounded-full
                     bg-netflix-red/[0.07] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

    <div className="flex items-center justify-between">
      <div className="p-2 rounded-xl bg-white/[0.04] group-hover:bg-netflix-red/10 transition-colors duration-200">
        <Icon className="w-4 h-4 text-netflix-muted group-hover:text-netflix-red transition-colors duration-200" />
      </div>
      {trend && (
        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
          trendUp === true  && 'text-emerald-400 bg-emerald-400/[0.08] border-emerald-400/20',
          trendUp === false && 'text-red-400 bg-red-400/[0.08] border-red-400/20',
          trendUp === undefined && 'text-netflix-muted bg-white/[0.04] border-white/[0.06]',
        )}>
          {trend}
        </span>
      )}
    </div>

    <div>
      <p className="text-2xl font-bold tracking-tight leading-none text-white">{value}</p>
      {label && <p className="text-[11px] text-netflix-muted/70 mt-1.5 leading-snug">{label}</p>}
    </div>

    <p className="text-[10px] font-semibold text-netflix-muted/50 uppercase tracking-[0.12em]">{title}</p>

    {sub && <div className="pt-2.5 border-t border-white/[0.05]">{sub}</div>}
  </motion.div>
);

// Mini horizontal progress bar for KPI sub-slots
const MiniBar = ({ pct, color = '#E50914' }: { pct: number; color?: string }) => (
  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-500"
      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
    />
  </div>
);

// ─── Insight card ────────────────────────────────────────────────────────────

interface Insight {
  icon: string;
  type: string;       // badge label e.g. "Trend"
  headline: string;   // the key number / bold claim
  body: string;       // supporting sentence
  accent?: string;    // optional tailwind text-color class for headline
}

const InsightCard = ({ insight, index }: { insight: Insight; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.06, duration: 0.25, ease: 'easeOut' }}
    className="relative flex flex-col gap-3 p-5 rounded-2xl bg-netflix-card border border-white/[0.06]
               hover:border-white/[0.12] transition-colors duration-200 group overflow-hidden"
    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
  >
    {/* left accent bar */}
    <span className="absolute left-0 top-4 bottom-4 w-[2px] rounded-full bg-netflix-red/40 group-hover:bg-netflix-red/70 transition-colors duration-200" />

    {/* top row: icon + type badge */}
    <div className="flex items-center justify-between pl-3">
      <span className="text-lg leading-none">{insight.icon}</span>
      <span className="text-[9px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full
                       bg-white/[0.04] text-netflix-muted/60 border border-white/[0.05]">
        {insight.type}
      </span>
    </div>

    {/* headline */}
    <p className={cn('text-[15px] font-bold leading-snug pl-3', insight.accent ?? 'text-white')}>
      {insight.headline}
    </p>

    {/* body */}
    <p className="text-[12px] text-netflix-muted/70 leading-relaxed pl-3">
      {insight.body}
    </p>
  </motion.div>
);

// ─── Top-N toggle ────────────────────────────────────────────────────────────

const TopNToggle = ({
  value, onChange,
}: { value: 5 | 10; onChange: (v: 5 | 10) => void }) => (
  <div className="flex bg-white/[0.04] border border-white/[0.07] p-0.5 rounded-lg">
    {([5, 10] as const).map(n => (
      <button
        key={n}
        onClick={() => onChange(n)}
        className={cn(
          'px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-150',
          value === n
            ? 'bg-netflix-red text-white shadow-sm'
            : 'text-netflix-muted hover:text-white/80',
        )}
      >
        Top {n}
      </button>
    ))}
  </div>
);

// ─── Empty state for charts ───────────────────────────────────────────────────

const EmptyState = ({ message = 'No data for current filters' }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-2 select-none">
    <span className="text-2xl opacity-30">📭</span>
    <p className="text-[12px] text-netflix-muted/40 text-center max-w-[180px] leading-relaxed">{message}</p>
  </div>
);

/** Wraps a chart and shows EmptyState when data is empty. */
const ChartGuard = ({ data, children }: { data: unknown[]; children: React.ReactNode }) =>
  data.length === 0 ? <EmptyState /> : <>{children}</>;

const ChartCard = ({
  title, children, className,
}: { title: string; children: React.ReactNode; className?: string }) => (
  <div
    className={cn('bg-netflix-card rounded-2xl border border-white/[0.06] p-6 flex flex-col', className)}
    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.2)' }}
  >
    <h3 className="text-[13px] font-semibold text-white/90 mb-5 flex items-center gap-2.5 shrink-0">
      <span className="w-[3px] h-4 bg-netflix-red rounded-full" />
      {title}
    </h3>
    <div className="flex-1 min-h-[300px]">{children}</div>
  </div>
);

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [searchQuery, setSearchQuery]         = useState('');
  const [selectedType, setSelectedType]       = useState<'All' | 'Movie' | 'TV Show'>('All');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedGenre, setSelectedGenre]     = useState('All');
  const [selectedRating, setSelectedRating]   = useState('All');
  const [yearFrom, setYearFrom]               = useState(1980);
  const [yearTo, setYearTo]                   = useState(2021);
  const [topNLimit, setTopNLimit]             = useState<5 | 10>(10);
  const [entered, setEntered]                 = useState(false);

  // ── Dataset: base + any uploaded additions ────────────────────────────────
  const [uploadedData, setUploadedData]       = useState<CleanNetflixTitle[]>([]);
  const [uploadStatus, setUploadStatus]       = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage]     = useState('');
  const fileInputRef                          = useRef<HTMLInputElement>(null);

  const activeDataset = useMemo(
    () => (uploadedData.length > 0 ? [...cleanedData, ...uploadedData] : cleanedData),
    [uploadedData],
  );

  const handleFileUpload = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setUploadStatus('error');
      setUploadMessage('Only CSV files are supported.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { data, errors } = parseUploadedCSV(text);
      if (data.length === 0) {
        setUploadStatus('error');
        setUploadMessage(errors[0] ?? 'No valid rows found in the file.');
      } else {
        setUploadedData(data);
        setUploadStatus('success');
        setUploadMessage(`${data.length} titles added${errors.length > 0 ? ` (${errors.length} rows skipped)` : ''}.`);
      }
    };
    reader.onerror = () => {
      setUploadStatus('error');
      setUploadMessage('Failed to read the file.');
    };
    reader.readAsText(file);
  }, []);

  const clearUpload = useCallback(() => {
    setUploadedData([]);
    setUploadStatus('idle');
    setUploadMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Derive filter option lists from the active dataset
  const allCountries = useMemo(() =>
    [...new Set(activeDataset.map(d => d.country))].sort(), [activeDataset]);
  const allGenres = useMemo(() =>
    [...new Set(activeDataset.map(d => d.primary_genre))].sort(), [activeDataset]);
  const allRatings = useMemo(() =>
    [...new Set(activeDataset.map(d => d.rating))].sort(), [activeDataset]);
  const yearMin = useMemo(() =>
    activeDataset.length > 0 ? Math.min(...activeDataset.map(d => d.release_year)) : 1980,
  [activeDataset]);
  const yearMax = useMemo(() =>
    activeDataset.length > 0 ? Math.max(...activeDataset.map(d => d.release_year)) : 2021,
  [activeDataset]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('All');
    setSelectedCountry('All');
    setSelectedGenre('All');
    setSelectedRating('All');
    setYearFrom(yearMin);
    setYearTo(yearMax);
  };

  const activeFilterCount = [
    searchQuery !== '',
    selectedType !== 'All',
    selectedCountry !== 'All',
    selectedGenre !== 'All',
    selectedRating !== 'All',
    yearFrom !== yearMin || yearTo !== yearMax,
  ].filter(Boolean).length;

  // ── Filtered dataset ──────────────────────────────────────────────────────
  const filteredData = useMemo(() => activeDataset.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    if (q && !item.title.toLowerCase().includes(q) && !item.cast.toLowerCase().includes(q)) return false;
    if (selectedType !== 'All' && item.type !== selectedType) return false;
    if (selectedCountry !== 'All' && item.country !== selectedCountry) return false;
    if (selectedGenre !== 'All' && item.primary_genre !== selectedGenre) return false;
    if (selectedRating !== 'All' && item.rating !== selectedRating) return false;
    if (item.release_year < yearFrom || item.release_year > yearTo) return false;
    return true;
  }), [activeDataset, searchQuery, selectedType, selectedCountry, selectedGenre, selectedRating, yearFrom, yearTo]);

  // ── Derived data ──────────────────────────────────────────────────────────
  // ── KPI analytics ─────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total   = filteredData.length;
    const movies  = filteredData.filter(d => d.type === 'Movie').length;
    const tvShows = filteredData.filter(d => d.type === 'TV Show').length;

    const moviePct  = total > 0 ? +((movies  / total) * 100).toFixed(1) : 0;
    const tvPct     = total > 0 ? +((tvShows / total) * 100).toFixed(1) : 0;
    const ratio     = tvShows > 0 ? (movies / tvShows).toFixed(2) : '—';

    const genreCounts   = toNameValueArray(countByKey(filteredData, 'primary_genre'));
    const countryCounts = toNameValueArray(countByKey(filteredData, 'country'));

    const topGenre   = genreCounts[0]?.name   ?? '—';
    const topCountry = countryCounts[0]?.name ?? '—';

    // top-3 genres with % of total
    const top3Genres = topN(genreCounts, 3).map(g => ({
      name: g.name,
      pct: total > 0 ? +((g.value / total) * 100).toFixed(1) : 0,
    }));

    return { total, movies, tvShows, moviePct, tvPct, ratio, topGenre, topCountry, top3Genres };
  }, [filteredData]);

  // ── Chart data ────────────────────────────────────────────────────────────

  // Row 1 Left: total + Movies + TV Shows per year
  const evolutionData = useMemo(() => {
    const byYear = groupByYear(filteredData) as Record<number, typeof filteredData>;
    return Object.keys(byYear).map(Number).sort().map(year => {
      const items = byYear[year];
      return {
        year,
        Total:     items.length,
        Movies:    items.filter(d => d.type === 'Movie').length,
        'TV Shows': items.filter(d => d.type === 'TV Show').length,
      };
    });
  }, [filteredData]);

  // Row 1 Right: Movies vs TV Shows count
  const typeDistData = useMemo(() => [
    { name: 'Movies',   value: filteredData.filter(d => d.type === 'Movie').length,    fill: '#E50914' },
    { name: 'TV Shows', value: filteredData.filter(d => d.type === 'TV Show').length,  fill: '#525252' },
  ], [filteredData]);

  // Row 2 Left: top N countries (responds to topNLimit toggle)
  const countryData = useMemo(() =>
    topN(toNameValueArray(countByKey(filteredData, 'country')), topNLimit),
  [filteredData, topNLimit]);

  // Row 2 Right: top N genres (responds to topNLimit toggle)
  const genreData = useMemo(() =>
    topN(toNameValueArray(countByKey(filteredData, 'primary_genre')), topNLimit),
  [filteredData, topNLimit]);

  // ── Advanced Analytics data ───────────────────────────────────────────────

  // 1. Stacked bar: Movies vs TV Shows per year
  const typeShiftData = useMemo(() => {
    const byYear = groupByYear(filteredData) as Record<number, typeof filteredData>;
    return Object.keys(byYear).map(Number).sort().map(year => ({
      year,
      Movies:     byYear[year].filter(d => d.type === 'Movie').length,
      'TV Shows': byYear[year].filter(d => d.type === 'TV Show').length,
    }));
  }, [filteredData]);

  // 2. Rating distribution
  const ratingData = useMemo(() =>
    toNameValueArray(countByKey(filteredData, 'rating')),
  [filteredData]);

  // 3. Duration distribution — movies in minute buckets, TV shows in season buckets
  const durationData = useMemo(() => {
    const movies = filteredData.filter(d => d.type === 'Movie' && d.duration_int !== null);
    const shows  = filteredData.filter(d => d.type === 'TV Show' && d.duration_int !== null);

    // Movie buckets (minutes)
    const movieBuckets: Record<string, number> = {
      '< 60 min': 0, '60–90 min': 0, '90–120 min': 0, '120–150 min': 0, '> 150 min': 0,
    };
    movies.forEach(d => {
      const m = d.duration_int!;
      if (m < 60)        movieBuckets['< 60 min']++;
      else if (m < 90)   movieBuckets['60–90 min']++;
      else if (m < 120)  movieBuckets['90–120 min']++;
      else if (m < 150)  movieBuckets['120–150 min']++;
      else               movieBuckets['> 150 min']++;
    });

    // TV show buckets (seasons)
    const tvBuckets: Record<string, number> = {
      '1 Season': 0, '2–3 Seasons': 0, '4–6 Seasons': 0, '7+ Seasons': 0,
    };
    shows.forEach(d => {
      const s = d.duration_int!;
      if (s === 1)      tvBuckets['1 Season']++;
      else if (s <= 3)  tvBuckets['2–3 Seasons']++;
      else if (s <= 6)  tvBuckets['4–6 Seasons']++;
      else              tvBuckets['7+ Seasons']++;
    });

    const avgMovieMins = movies.length > 0
      ? Math.round(movies.reduce((s, d) => s + d.duration_int!, 0) / movies.length)
      : null;
    const avgTvSeasons = shows.length > 0
      ? +(shows.reduce((s, d) => s + d.duration_int!, 0) / shows.length).toFixed(1)
      : null;

    return {
      movieBuckets: Object.entries(movieBuckets).map(([name, value]) => ({ name, value })),
      tvBuckets:    Object.entries(tvBuckets).map(([name, value]) => ({ name, value })),
      avgMovieMins,
      avgTvSeasons,
    };
  }, [filteredData]);

  // 4. Top actors and directors
  const topPeople = useMemo(() => {
    const actorCounts: Record<string, number>    = {};
    const directorCounts: Record<string, number> = {};

    filteredData.forEach(d => {
      if (d.cast && d.cast !== 'Unknown') {
        d.cast.split(',').forEach(a => {
          const name = a.trim();
          if (name) actorCounts[name] = (actorCounts[name] || 0) + 1;
        });
      }
      if (d.director && d.director !== 'Unknown') {
        const name = d.director.trim();
        if (name) directorCounts[name] = (directorCounts[name] || 0) + 1;
      }
    });

    return {
      actors:    topN(toNameValueArray(actorCounts), 8),
      directors: topN(toNameValueArray(directorCounts), 8),
    };
  }, [filteredData]);
  const insights = useMemo((): Insight[] => {
    const total = filteredData.length;
    if (total === 0) return [];

    const results: Insight[] = [];

    // ── 1. Trend insight ────────────────────────────────────────────────────
    const years = filteredData.map(d => d.release_year).sort((a, b) => a - b);
    const minY  = years[0];
    const maxY  = years[years.length - 1];
    const span  = maxY - minY;

    if (span >= 4) {
      const midY     = Math.round(minY + span / 2);
      const afterMid = filteredData.filter(d => d.release_year > midY).length;
      const afterPct = +((afterMid / total) * 100).toFixed(1);
      const peak     = evolutionData.slice().sort((a, b) => b.Total - a.Total)[0];
      results.push({
        icon: '📈',
        type: 'Trend',
        headline: `${afterPct}% of titles released after ${midY}`,
        body: `Content production accelerated in the second half of the range, peaking in ${peak?.year ?? maxY} with ${peak?.Total ?? 0} titles — suggesting a major expansion phase.`,
        accent: 'text-netflix-red',
      });
    }

    // ── 2. Dominance insight ────────────────────────────────────────────────
    const movies   = filteredData.filter(d => d.type === 'Movie').length;
    const tvShows  = filteredData.filter(d => d.type === 'TV Show').length;
    const moviePct = +((movies  / total) * 100).toFixed(1);
    const tvPct    = +((tvShows / total) * 100).toFixed(1);
    const dominant = movies >= tvShows ? 'Movies' : 'TV Shows';
    const domPct   = Math.max(moviePct, tvPct);
    const gap      = Math.abs(moviePct - tvPct).toFixed(1);
    results.push({
      icon: '🎬',
      type: 'Dominance',
      headline: `${dominant} make up ${domPct}% of content`,
      body: `The split is ${moviePct}% Movies vs ${tvPct}% TV Shows — a ${gap} percentage-point gap. ${
        parseFloat(gap) < 10
          ? 'The catalog is relatively balanced between the two formats.'
          : `${dominant} significantly outnumber the other format.`
      }`,
      accent: 'text-white',
    });

    // ── 3. Genre concentration ──────────────────────────────────────────────
    const genreCounts = toNameValueArray(countByKey(filteredData, 'primary_genre'));
    const top3g       = topN(genreCounts, 3);
    const top3gTotal  = top3g.reduce((s, g) => s + g.value, 0);
    const top3gPct    = +((top3gTotal / total) * 100).toFixed(1);
    if (top3g.length > 0) {
      const names = top3g.map(g => g.name).join(', ');
      results.push({
        icon: '🎭',
        type: 'Concentration',
        headline: `Top 3 genres cover ${top3gPct}% of all titles`,
        body: `${names} dominate the catalog. ${
          top3gPct > 60
            ? 'Genre diversity is low — content is heavily concentrated in a few categories.'
            : 'The remaining titles are spread across a wider range of genres.'
        }`,
        accent: top3gPct > 60 ? 'text-amber-400' : 'text-white',
      });
    }

    // ── 4. Geographic insight ───────────────────────────────────────────────
    const countryCounts  = toNameValueArray(countByKey(filteredData, 'country'));
    const topC           = countryCounts[0];
    if (topC) {
      const topCPct      = +((topC.value / total) * 100).toFixed(1);
      const top3cTotal   = topN(countryCounts, 3).reduce((s, c) => s + c.value, 0);
      const top3cPct     = +((top3cTotal / total) * 100).toFixed(1);
      const uniqueCtries = countryCounts.length;
      results.push({
        icon: '🌍',
        type: 'Geographic',
        headline: `${topC.name} leads with ${topCPct}% of titles`,
        body: `${topC.value} titles originate from ${topC.name}. The top 3 countries together account for ${top3cPct}% of the catalog, spread across ${uniqueCtries} unique origins.`,
        accent: 'text-netflix-red',
      });
    }

    // ── 5. Catalog depth ────────────────────────────────────────────────────
    const uniqueCountries = new Set(filteredData.map(d => d.country)).size;
    const uniqueGenres    = new Set(filteredData.map(d => d.primary_genre)).size;
    const avgPerCountry   = (total / Math.max(uniqueCountries, 1)).toFixed(1);
    results.push({
      icon: '🔎',
      type: 'Diversity',
      headline: `${uniqueCountries} countries · ${uniqueGenres} genres`,
      body: `This selection averages ${avgPerCountry} titles per country. ${
        uniqueCountries > 10
          ? 'The catalog shows strong geographic diversity.'
          : 'Geographic representation is limited — a few origins dominate.'
      }`,
      accent: 'text-white',
    });

    return results;
  }, [filteredData, evolutionData]);

  return (
    <AnimatePresence mode="wait">
      {!entered ? (
        <CoverPage key="cover" onEnter={() => setEntered(true)} />
      ) : (
      <motion.div
        key="dashboard"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="min-h-screen bg-netflix-dark text-white flex flex-col"
      >

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-white/[0.05] bg-netflix-dark/95 backdrop-blur-sm
                         px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
        <div className="w-8 h-8 bg-netflix-red rounded-lg flex items-center justify-center
                        shadow-lg shadow-netflix-red/30 shrink-0">
          <Film className="text-white w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold tracking-tight leading-none text-white truncate">
            🎬 Netflix Content Intelligence
          </h1>
          <p className="text-[11px] text-netflix-muted/60 mt-0.5 hidden sm:block">
            Analyzing content trends, distribution, and audience patterns
          </p>
        </div>
        <p className="hidden lg:block ml-auto text-[11px] text-netflix-muted/40 max-w-[260px] text-right leading-relaxed shrink-0">
          Use filters on the left to explore how Netflix content varies across time, genre, and geography.
        </p>
      </header>

      {/* ── BODY: sidebar + main ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <aside className="w-60 shrink-0 border-r border-white/[0.05] px-4 py-5 flex flex-col gap-5
                          sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto custom-scrollbar
                          hidden lg:flex bg-netflix-dark/60">

          {/* Search */}
          <div>
            <SectionLabel>Search</SectionLabel>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-netflix-muted/50 pointer-events-none" />
              <input
                type="text"
                placeholder="Title or cast..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 pl-9 pr-8
                           text-sm text-white placeholder:text-netflix-muted/40
                           focus:outline-none focus:border-netflix-red/40 focus:bg-white/[0.06]
                           transition-all duration-150"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center
                             text-netflix-muted/50 hover:text-white transition-colors rounded-full
                             hover:bg-white/10 text-sm leading-none"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Type filter */}
          <div>
            <SectionLabel>Content Type</SectionLabel>
            <div className="flex bg-white/[0.04] border border-white/[0.07] p-0.5 rounded-lg">
              {(['All', 'Movie', 'TV Show'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150',
                    selectedType === type
                      ? 'bg-netflix-red text-white shadow-sm'
                      : 'text-netflix-muted/60 hover:text-white/80',
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Dropdowns */}
          <div className="flex flex-col gap-4">
            <SectionLabel>Filters</SectionLabel>
            <FilterSelect label="Country"  value={selectedCountry} onChange={setSelectedCountry} options={allCountries} />
            <FilterSelect label="Genre"    value={selectedGenre}   onChange={setSelectedGenre}   options={allGenres} />
            <FilterSelect label="Rating"   value={selectedRating}  onChange={setSelectedRating}  options={allRatings} />
          </div>

          {/* Year range */}
          <div>
            <SectionLabel>Release Year</SectionLabel>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-[11px] text-netflix-muted/50">From</span>
                  <span className="text-[11px] font-semibold text-white/80 tabular-nums">{yearFrom}</span>
                </div>
                <input
                  type="range" min={yearMin} max={yearMax} value={yearFrom}
                  onChange={e => setYearFrom(Math.min(Number(e.target.value), yearTo))}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-[11px] text-netflix-muted/50">To</span>
                  <span className="text-[11px] font-semibold text-white/80 tabular-nums">{yearTo}</span>
                </div>
                <input
                  type="range" min={yearMin} max={yearMax} value={yearTo}
                  onChange={e => setYearTo(Math.max(Number(e.target.value), yearFrom))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Upload dataset */}
          <div className="pt-4 border-t border-white/[0.05]">
            <SectionLabel>Upload Dataset</SectionLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
            />
            <AnimatePresence mode="wait">
              {uploadStatus === 'idle' ? (
                <motion.button
                  key="upload-btn"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg
                             text-[11px] font-medium text-netflix-muted/60 border border-white/[0.07]
                             hover:border-netflix-red/30 hover:text-white/80 transition-all duration-150"
                >
                  <Upload className="w-3 h-3" />
                  Upload CSV
                </motion.button>
              ) : (
                <motion.div
                  key="upload-status"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={cn(
                    'flex items-start gap-2 p-2.5 rounded-lg border text-[11px]',
                    uploadStatus === 'success'
                      ? 'bg-emerald-500/[0.06] border-emerald-500/20 text-emerald-400/80'
                      : 'bg-red-500/[0.06] border-red-500/20 text-red-400/80',
                  )}
                >
                  {uploadStatus === 'success'
                    ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  }
                  <span className="flex-1 leading-snug">{uploadMessage}</span>
                  <button onClick={clearUpload} className="shrink-0 hover:opacity-70 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active filter count + reset */}
          <div className="mt-auto pt-4 border-t border-white/[0.05] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] text-netflix-muted/50">
                <SlidersHorizontal className="w-3 h-3" />
                {filteredData.length} titles
              </span>
              {activeFilterCount > 0 && (
                <span className="text-[9px] font-bold text-netflix-red bg-netflix-red/10
                                 border border-netflix-red/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  {activeFilterCount} active
                </span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg
                           text-[11px] font-medium text-netflix-muted/60 border border-white/[0.07]
                           hover:border-netflix-red/30 hover:text-white/80 transition-all duration-150"
              >
                <RotateCcw className="w-3 h-3" />
                Reset filters
              </button>
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-w-0">

          {/* Global empty state */}
          <AnimatePresence>
            {filteredData.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mx-6 lg:mx-8 mt-8 p-8 rounded-2xl border border-white/[0.06] bg-netflix-card
                           flex flex-col items-center gap-3 text-center"
              >
                <span className="text-4xl">📭</span>
                <p className="text-sm font-semibold text-white/70">No data available for selected filters</p>
                <p className="text-[12px] text-netflix-muted/50 max-w-xs leading-relaxed">
                  Try adjusting or resetting the filters in the sidebar to see results.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-1 flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium
                             text-netflix-red border border-netflix-red/30 hover:bg-netflix-red/10 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Reset filters
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* A. KPI ROW — START HERE */}
          <section className="px-6 lg:px-8 pt-7 pb-7">
            <StepLabel step="Step 1">Overview</StepLabel>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-[3px] h-5 bg-netflix-red rounded-full" />
              <p className="text-sm font-semibold text-white tracking-tight">Overview</p>
              <span className="text-[9px] font-bold text-netflix-red bg-netflix-red/[0.08]
                               border border-netflix-red/20 px-2 py-0.5 rounded-full uppercase tracking-[0.1em]">
                Start Here
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

              <KpiCard
                title="Total Titles"
                value={kpis.total.toLocaleString()}
                label="in current selection"
                icon={Clapperboard}
              />

              <KpiCard
                title="Movies vs TV"
                value={`${kpis.moviePct}%`}
                label={`${kpis.tvPct}% TV Shows`}
                icon={PieIcon}
                sub={
                  <div className="flex flex-col gap-1.5">
                    <MiniBar pct={kpis.moviePct} color="#E50914" />
                    <div className="flex justify-between text-[10px] text-netflix-muted">
                      <span className="flex items-center gap-1"><Film className="w-3 h-3" /> {kpis.movies}</span>
                      <span className="flex items-center gap-1"><Tv className="w-3 h-3" /> {kpis.tvShows}</span>
                    </div>
                  </div>
                }
              />

              <KpiCard
                title="Top Genre"
                value={kpis.topGenre}
                label="most frequent primary genre"
                icon={Tag}
              />

              <KpiCard
                title="Top Country"
                value={kpis.topCountry}
                label="most represented origin"
                icon={MapPin}
              />

              <KpiCard
                title="Genre Spread"
                value={`${kpis.top3Genres[0]?.pct ?? 0}%`}
                label={`top genre share of ${kpis.total} titles`}
                icon={BarChart2}
                sub={
                  <div className="flex flex-col gap-2">
                    {kpis.top3Genres.map((g, i) => (
                      <div key={g.name} className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[10px] text-netflix-muted">
                          <span className="truncate max-w-[80px]">{g.name}</span>
                          <span>{g.pct}%</span>
                        </div>
                        <MiniBar pct={g.pct} color={i === 0 ? '#E50914' : i === 1 ? '#B20710' : '#525252'} />
                      </div>
                    ))}
                  </div>
                }
              />

              <KpiCard
                title="Movie / TV Ratio"
                value={kpis.ratio === '—' ? '—' : `${kpis.ratio}×`}
                label={kpis.ratio === '—' ? 'no TV shows in selection' : 'movies per TV show'}
                icon={Ratio}
                trend={kpis.ratio !== '—' && parseFloat(kpis.ratio) > 1 ? 'Movie-heavy' : kpis.ratio !== '—' ? 'TV-heavy' : undefined}
                trendUp={kpis.ratio !== '—' ? parseFloat(kpis.ratio) > 1 : undefined}
              />

            </div>
          </section>

          <Divider />

          {/* B. CORE INSIGHTS — 2×2 chart grid */}
          <section className="px-6 lg:px-8 py-7">
            <StepLabel step="Step 2">Trends</StepLabel>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="w-0.5 h-5 bg-netflix-red rounded-full" />
                <p className="text-xs font-bold text-white uppercase tracking-widest">Core Insights</p>
              </div>
              <TopNToggle value={topNLimit} onChange={setTopNLimit} />
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">

              {/* Row 1 Left — Content Evolution Line Chart */}
              <ChartCard title="📈 Content Evolution Over Time">
                <ChartGuard data={evolutionData}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#E50914" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#E50914" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis
                      dataKey="year"
                      stroke="#606060"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#808080' }}
                    />
                    <YAxis
                      stroke="#606060"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#808080' }}
                      width={28}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1A1C24', border: '1px solid #ffffff12', borderRadius: '10px', fontSize: 12 }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#A0A0A0', marginBottom: 4 }}
                      cursor={{ stroke: '#ffffff15', strokeWidth: 1 }}
                      formatter={(value: number, name: string) => [`${value} titles`, name]}
                      labelFormatter={(year: number) => `Year: ${year}`}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={28}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, color: '#808080' }}
                    />
                    <Line type="monotone" dataKey="Total"    stroke="#E50914" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#E50914' }} />
                    <Line type="monotone" dataKey="Movies"   stroke="#B20710" strokeWidth={1.5} dot={false} strokeDasharray="4 3" activeDot={{ r: 3 }} />
                    <Line type="monotone" dataKey="TV Shows" stroke="#525252" strokeWidth={1.5} dot={false} strokeDasharray="4 3" activeDot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
                </ChartGuard>
              </ChartCard>

              {/* Row 1 Right — Content Type Distribution Bar */}
              <ChartCard title="🎬 Content Type Distribution">
                <ChartGuard data={typeDistData.filter(d => d.value > 0)}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={typeDistData}
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                    barCategoryGap="35%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#606060"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#A0A0A0' }}
                    />
                    <YAxis
                      stroke="#606060"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#808080' }}
                      width={28}
                    />
                    <Tooltip
                      cursor={{ fill: '#ffffff05' }}
                      contentStyle={{ backgroundColor: '#1A1C24', border: '1px solid #ffffff12', borderRadius: '10px', fontSize: 12 }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#A0A0A0', marginBottom: 4 }}
                      formatter={(value: number, _: string, props: { payload?: { name: string } }) => {
                        const total = typeDistData.reduce((s, d) => s + d.value, 0);
                        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                        return [`${value} titles (${pct}%)`, props.payload?.name ?? ''];
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80} label={{ position: 'top', fill: '#606060', fontSize: 11 }}>
                      {typeDistData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </ChartGuard>
              </ChartCard>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Row 2 Left — Global Content Distribution */}
              <ChartCard title={`🌍 Global Content Distribution — Top ${topNLimit}`}>
                <ChartGuard data={countryData}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={countryData}
                    layout="vertical"
                    margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#606060"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#808080' }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#606060"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#A0A0A0' }}
                      width={90}
                    />
                    <Tooltip
                      cursor={{ fill: '#ffffff04' }}
                      contentStyle={{ backgroundColor: '#1A1C24', border: '1px solid #ffffff12', borderRadius: '10px', fontSize: 12 }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#A0A0A0', marginBottom: 4 }}
                      formatter={(v: number) => [v, 'Titles']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fill: '#606060', fontSize: 10 }}>
                      {countryData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === 0 ? '#E50914' : i === 1 ? '#C4070F' : i === 2 ? '#A3060D' : '#3a3a3a'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </ChartGuard>
              </ChartCard>

              {/* Row 2 Right — Genre Dominance */}
              <ChartCard title={`🎭 Genre Dominance Analysis — Top ${topNLimit}`}>
                <ChartGuard data={genreData}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={genreData}
                    layout="vertical"
                    margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#606060"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#808080' }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#606060"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#A0A0A0' }}
                      width={130}
                    />
                    <Tooltip
                      cursor={{ fill: '#ffffff04' }}
                      contentStyle={{ backgroundColor: '#1A1C24', border: '1px solid #ffffff12', borderRadius: '10px', fontSize: 12 }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#A0A0A0', marginBottom: 4 }}
                      formatter={(v: number) => [v, 'Titles']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fill: '#606060', fontSize: 10 }}>
                      {genreData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === 0 ? '#E50914' : i === 1 ? '#C4070F' : i === 2 ? '#A3060D' : '#3a3a3a'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </ChartGuard>
              </ChartCard>

            </div>
          </section>

          <Divider />

          {/* C. KEY INSIGHTS — dynamic text insights */}
          <section className="px-6 lg:px-8 py-7">
            <StepLabel step="Step 3">Insights</StepLabel>
            <SectionHeading>🔍 Key Insights</SectionHeading>

            {insights.length === 0 ? (
              <div className="flex items-center gap-3 p-5 rounded-2xl bg-netflix-card border border-white/[0.05]">
                <span className="text-xl">🔍</span>
                <p className="text-[13px] text-netflix-muted/60">No data matches the current filters. Try adjusting the sidebar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {insights.map((ins, i) => (
                  <InsightCard key={i} insight={ins} index={i} />
                ))}
              </div>
            )}
          </section>

          <Divider />

          {/* D. ADVANCED ANALYTICS */}
          <section className="px-6 lg:px-8 py-7 opacity-95">
            <StepLabel step="Step 4">Deeper Analysis</StepLabel>
            <SectionHeading>Advanced Analytics</SectionHeading>

            {/* Row 1: Stacked bar + Rating distribution */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">

              {/* Stacked bar — Content Type Shift Over Time */}
              <ChartCard title="📊 Content Type Shift Over Time">
                <ChartGuard data={typeShiftData}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeShiftData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis dataKey="year" stroke="#606060" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#808080' }} />
                    <YAxis stroke="#606060" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#808080' }} width={28} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1A1C24', border: '1px solid #ffffff12', borderRadius: '10px', fontSize: 12 }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#A0A0A0', marginBottom: 4 }}
                      cursor={{ fill: '#ffffff04' }}
                    />
                    <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#808080' }} />
                    <Bar dataKey="Movies"   stackId="a" fill="#E50914" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="TV Shows" stackId="a" fill="#404040" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                </ChartGuard>
              </ChartCard>

              {/* Rating distribution — horizontal bar */}
              <ChartCard title="🎯 Audience Rating Breakdown">
                <ChartGuard data={ratingData}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratingData} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                    <XAxis type="number" stroke="#606060" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#808080' }} />
                    <YAxis dataKey="name" type="category" stroke="#606060" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#A0A0A0' }} width={56} />
                    <Tooltip
                      cursor={{ fill: '#ffffff04' }}
                      contentStyle={{ backgroundColor: '#1A1C24', border: '1px solid #ffffff12', borderRadius: '10px', fontSize: 12 }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#A0A0A0', marginBottom: 4 }}
                      formatter={(v: number) => [v, 'Titles']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fill: '#606060', fontSize: 10 }}>
                      {ratingData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#E50914' : i === 1 ? '#C4070F' : i === 2 ? '#A3060D' : '#3a3a3a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </ChartGuard>
              </ChartCard>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Duration analysis */}
              <ChartCard title="⏱️ Content Duration Analysis">
                {/* Stat pills */}
                <div className="flex gap-3 mb-5">
                  {durationData.avgMovieMins !== null && (
                    <div className="flex-1 bg-netflix-red/10 border border-netflix-red/20 rounded-xl px-4 py-3 text-center">
                      <p className="text-xl font-bold text-netflix-red">{durationData.avgMovieMins} min</p>
                      <p className="text-[10px] text-netflix-muted mt-0.5 uppercase tracking-wide">Avg Movie</p>
                    </div>
                  )}
                  {durationData.avgTvSeasons !== null && (
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
                      <p className="text-xl font-bold">{durationData.avgTvSeasons}</p>
                      <p className="text-[10px] text-netflix-muted mt-0.5 uppercase tracking-wide">Avg Seasons</p>
                    </div>
                  )}
                </div>

                {/* Two mini bar charts side by side */}
                <div className="grid grid-cols-2 gap-4 flex-1" style={{ minHeight: 220 }}>
                  <div>
                    <p className="text-[10px] text-netflix-muted uppercase tracking-widest mb-2">Movies</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={durationData.movieBuckets} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#808080' }} width={72} />
                        <Tooltip
                          cursor={{ fill: '#ffffff04' }}
                          contentStyle={{ backgroundColor: '#1A1C24', border: '1px solid #ffffff12', borderRadius: '10px', fontSize: 11 }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(v: number) => [v, 'Movies']}
                        />
                        <Bar dataKey="value" fill="#E50914" radius={[0, 3, 3, 0]} barSize={12} label={{ position: 'right', fill: '#606060', fontSize: 9 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <p className="text-[10px] text-netflix-muted uppercase tracking-widest mb-2">TV Shows</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={durationData.tvBuckets} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#808080' }} width={72} />
                        <Tooltip
                          cursor={{ fill: '#ffffff04' }}
                          contentStyle={{ backgroundColor: '#1A1C24', border: '1px solid #ffffff12', borderRadius: '10px', fontSize: 11 }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(v: number) => [v, 'Shows']}
                        />
                        <Bar dataKey="value" fill="#525252" radius={[0, 3, 3, 0]} barSize={12} label={{ position: 'right', fill: '#606060', fontSize: 9 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </ChartCard>

              {/* Top actors & directors */}
              <ChartCard title="🌟 Top Talent">
                <div className="grid grid-cols-2 gap-5 h-full">
                  {/* Actors */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-netflix-muted uppercase tracking-widest mb-1">Most Frequent Actors</p>
                    {topPeople.actors.length === 0
                      ? <p className="text-netflix-muted/40 text-xs">No data</p>
                      : topPeople.actors.map((a, i) => (
                        <div key={a.name} className="flex items-center gap-2">
                          <span className="text-[10px] text-netflix-muted/50 w-4 shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-xs text-white/75 truncate">{a.name}</span>
                              <span className="text-[10px] text-netflix-muted shrink-0 ml-1">{a.value}</span>
                            </div>
                            <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-netflix-red/60 rounded-full"
                                style={{ width: `${(a.value / (topPeople.actors[0]?.value || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                  {/* Directors */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-netflix-muted uppercase tracking-widest mb-1">Most Frequent Directors</p>
                    {topPeople.directors.length === 0
                      ? <p className="text-netflix-muted/40 text-xs">No data</p>
                      : topPeople.directors.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span className="text-[10px] text-netflix-muted/50 w-4 shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-xs text-white/75 truncate">{d.name}</span>
                              <span className="text-[10px] text-netflix-muted shrink-0 ml-1">{d.value}</span>
                            </div>
                            <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-white/30 rounded-full"
                                style={{ width: `${(d.value / (topPeople.directors[0]?.value || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </ChartCard>

            </div>
          </section>

          <Divider />

          {/* E. CATALOG — lowest visual weight */}
          <section className="px-6 lg:px-8 py-6 opacity-80">
            <SectionLabel>Catalog Explorer</SectionLabel>
            <div className="rounded-2xl border border-white/[0.05] overflow-hidden"
                 style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              <div className="px-5 py-3.5 border-b border-white/[0.05] flex justify-between items-center
                              bg-white/[0.02]">
                <h3 className="text-[12px] font-semibold text-white/50 uppercase tracking-[0.1em]">Detailed Catalog</h3>
                <span className="text-[11px] text-netflix-muted/40 tabular-nums">{filteredData.length} results</span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.02] text-netflix-muted/40 text-[10px] uppercase tracking-[0.1em]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Title</th>
                      <th className="px-5 py-3 font-semibold">Type</th>
                      <th className="px-5 py-3 font-semibold">Year</th>
                      <th className="px-5 py-3 font-semibold">Rating</th>
                      <th className="px-5 py-3 font-semibold">Genre</th>
                      <th className="px-5 py-3 font-semibold">Country</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {filteredData.slice(0, 10).map(item => (
                      <tr key={item.show_id} className="hover:bg-white/[0.02] transition-colors duration-100 group">
                        <td className="px-5 py-2.5 font-medium text-white/50 group-hover:text-white/75 transition-colors">{item.title}</td>
                        <td className="px-5 py-2.5">
                          <span className={cn(
                            'px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide',
                            item.type === 'Movie'
                              ? 'bg-blue-500/[0.08] text-blue-400/60'
                              : 'bg-purple-500/[0.08] text-purple-400/60',
                          )}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-netflix-muted/40 tabular-nums">{item.release_year}</td>
                        <td className="px-5 py-2.5">
                          <span className="bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05]
                                           text-[10px] text-netflix-muted/40">{item.rating}</span>
                        </td>
                        <td className="px-5 py-2.5 text-netflix-muted/40 truncate max-w-[160px]">{item.primary_genre}</td>
                        <td className="px-5 py-2.5 text-netflix-muted/40 truncate max-w-[140px]">{item.country}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredData.length > 10 && (
                <div className="px-5 py-3 border-t border-white/[0.04] text-center bg-white/[0.01]">
                  <button className="text-[11px] font-medium text-netflix-muted/40 hover:text-white/50 transition-colors">
                    Load More Results
                  </button>
                </div>
              )}
            </div>
          </section>

        </main>
      </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
