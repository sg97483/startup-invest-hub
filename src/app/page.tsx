'use client';

import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import FilterBar, { DEFAULT_FILTERS, Filters } from '@/components/FilterBar';
import ProgramCard from '@/components/ProgramCard';
import { ProgramDataset } from '@/types';
import { fetchDataset, getSummary, daysLeft } from '@/lib/api';

const PAGE_SIZE = 60;

export default function Home() {
  const summary = getSummary();
  const [dataset, setDataset] = useState<ProgramDataset | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);

  const deferredFilters = useDeferredValue(filters);

  useEffect(() => {
    fetchDataset()
      .then(setDataset)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [deferredFilters]);

  const programs = dataset?.programs ?? [];

  const sources = useMemo(
    () => Object.keys(dataset?.sources ?? summary.sources ?? {}),
    [dataset, summary]
  );

  const filtered = useMemo(() => {
    const { region, category, source, project, keyword, sort, hideAlwaysOpen } = deferredFilters;
    const needle = keyword.trim().toLowerCase();

    const result = programs.filter((program) => {
      if (region !== 'all' && !program.regions.includes(region)) return false;
      if (category !== 'all' && program.category !== category) return false;
      if (source !== 'all' && program.source !== source) return false;
      if (project !== 'all' && !(program.projects ?? []).includes(project)) return false;
      if (hideAlwaysOpen && !program.endDate) return false;
      if (needle && !(program.searchText ?? program.title.toLowerCase()).includes(needle)) return false;
      return true;
    });

    const fit = (program: (typeof programs)[number]) =>
      project === 'all' ? 0 : program.projectMatches?.[project]?.score ?? 0;

    result.sort((a, b) => {
      if (sort === 'fit') return fit(b) - fit(a);
      if (sort === 'latest') return (b.postedDate ?? '').localeCompare(a.postedDate ?? '');
      if (sort === 'popular') return (b.views ?? 0) - (a.views ?? 0);
      const left = daysLeft(a);
      const right = daysLeft(b);
      if (left === null && right === null) return (b.postedDate ?? '').localeCompare(a.postedDate ?? '');
      if (left === null) return 1;
      if (right === null) return -1;
      return left - right;
    });

    return result;
  }, [programs, deferredFilters]);

  const updatedAt = (dataset?.generatedAt ?? summary.generatedAt ?? '').slice(0, 10);
  const total = dataset?.total ?? summary.total ?? 0;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
          }}
        >
          스타트업 투자/지원 공고
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          K-Startup(창업진흥원)과 기업마당(중소벤처기업부)에 올라온 정부·지자체 지원사업{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{total.toLocaleString()}건</strong>을 한곳에서 확인하세요.
        </p>
        {updatedAt && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
            최종 수집일 {updatedAt} · 출처{' '}
            {Object.entries(dataset?.sources ?? summary.sources ?? {})
              .map(([name, count]) => `${name} ${count.toLocaleString()}건`)
              .join(' · ')}
          </p>
        )}
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        regions={dataset?.regions ?? summary.regions ?? []}
        categories={dataset?.categories ?? summary.categories ?? []}
        sources={sources}
        projects={dataset?.projects ?? summary.projects ?? []}
        regionCounts={dataset?.regionCounts ?? summary.regionCounts ?? {}}
        categoryCounts={dataset?.categoryCounts ?? summary.categoryCounts ?? {}}
        projectCounts={dataset?.projectCounts ?? summary.projectCounts ?? {}}
      />

      {loading ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          공고 {total.toLocaleString()}건을 불러오는 중입니다...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          해당 조건에 맞는 공고가 없습니다.
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            검색 결과 <strong style={{ color: 'var(--text-primary)' }}>{filtered.length.toLocaleString()}건</strong>
            {filtered.length > visible && ` 중 ${visible.toLocaleString()}건 표시`}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {filtered.slice(0, visible).map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                highlightProject={deferredFilters.project === 'all' ? undefined : deferredFilters.project}
              />
            ))}
          </div>

          {filtered.length > visible && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem' }}>
              <button
                type="button"
                className="glass-button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
              >
                {Math.min(PAGE_SIZE, filtered.length - visible).toLocaleString()}건 더 보기
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
