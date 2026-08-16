'use client';

import { Search, X, Sparkles } from 'lucide-react';
import { ProjectProfile } from '@/types';

export interface Filters {
  region: string;
  category: string;
  source: string;
  project: string;
  keyword: string;
  sort: 'imminent' | 'latest' | 'popular' | 'fit';
  hideAlwaysOpen: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  region: 'all',
  category: 'all',
  source: 'all',
  project: 'all',
  keyword: '',
  sort: 'imminent',
  hideAlwaysOpen: false,
};

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  regions: string[];
  categories: string[];
  sources: string[];
  projects: ProjectProfile[];
  regionCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  projectCounts: Record<string, number>;
}

const SORTS: { key: Filters['sort']; label: string }[] = [
  { key: 'imminent', label: '마감임박순' },
  { key: 'latest', label: '최신등록순' },
  { key: 'popular', label: '조회순' },
];

function Chips({
  values,
  selected,
  counts,
  onSelect,
}: {
  values: string[];
  selected: string;
  counts?: Record<string, number>;
  onSelect: (value: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
      {['all', ...values].map((value) => (
        <button
          key={value}
          type="button"
          className={`glass-button ${selected === value ? 'active' : ''}`}
          onClick={() => onSelect(value)}
          style={{ fontSize: '0.8125rem', padding: '0.35rem 0.7rem' }}
        >
          {value === 'all' ? '전체' : value}
          {counts && value !== 'all' && counts[value] ? (
            <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>{counts[value]}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export default function FilterBar({
  filters,
  onChange,
  regions,
  categories,
  sources,
  projects,
  regionCounts,
  categoryCounts,
  projectCounts,
}: FilterBarProps) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  // 프로젝트를 고르면 적합도순이 가장 쓸모 있으므로 기본 정렬을 그쪽으로 바꿉니다.
  const selectProject = (id: string) =>
    onChange({
      ...filters,
      project: id,
      sort: id === 'all' ? (filters.sort === 'fit' ? 'imminent' : filters.sort) : 'fit',
    });

  const sorts = filters.project === 'all' ? SORTS : [{ key: 'fit' as const, label: '적합도순' }, ...SORTS];
  const activeProject = projects.find((project) => project.id === filters.project);

  const isDirty = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  const label = { fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 'bold' } as const;
  const group = { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' };

  return (
    <div
      className="glass-panel filter-bar-container"
      style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flex: '1 1 260px',
            background: 'var(--surface-hover)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '0.6rem 0.9rem',
          }}
        >
          <Search size={18} color="var(--text-secondary)" />
          <input
            value={filters.keyword}
            onChange={(e) => set('keyword', e.target.value)}
            placeholder="사업명, 기관명, 지원대상으로 검색 (예: 예비창업, 서울, 팁스)"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.9375rem',
            }}
          />
          {filters.keyword && (
            <button
              type="button"
              onClick={() => set('keyword', '')}
              aria-label="검색어 지우기"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {sorts.map((sort) => (
            <button
              key={sort.key}
              type="button"
              className={`glass-button ${filters.sort === sort.key ? 'active' : ''}`}
              onClick={() => set('sort', sort.key)}
              style={{ fontSize: '0.8125rem', padding: '0.35rem 0.7rem' }}
            >
              {sort.label}
            </button>
          ))}
        </div>
      </div>

      <div style={group}>
        <span style={{ ...label, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Sparkles size={14} color="var(--accent-color)" />내 프로젝트
        </span>
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`glass-button ${filters.project === 'all' ? 'active' : ''}`}
            onClick={() => selectProject('all')}
            style={{ fontSize: '0.8125rem', padding: '0.35rem 0.7rem' }}
          >
            전체
          </button>
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={`glass-button ${filters.project === project.id ? 'active' : ''}`}
              onClick={() => selectProject(project.id)}
              title={project.description}
              style={{ fontSize: '0.8125rem', padding: '0.35rem 0.7rem' }}
            >
              {project.name}
              {projectCounts[project.id] ? (
                <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>{projectCounts[project.id]}</span>
              ) : null}
            </button>
          ))}
        </div>
        {activeProject && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem', lineHeight: 1.5 }}>
            {activeProject.tagline} · 예비창업자 신청 가능 공고만 추렸습니다.
          </p>
        )}
      </div>

      <div style={group}>
        <span style={label}>지역</span>
        <Chips values={regions} selected={filters.region} counts={regionCounts} onSelect={(v) => set('region', v)} />
      </div>

      <div style={group}>
        <span style={label}>지원분야</span>
        <Chips values={categories} selected={filters.category} counts={categoryCounts} onSelect={(v) => set('category', v)} />
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={group}>
          <span style={label}>출처</span>
          <Chips values={sources} selected={filters.source} onSelect={(v) => set('source', v)} />
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={filters.hideAlwaysOpen}
            onChange={(e) => set('hideAlwaysOpen', e.target.checked)}
          />
          마감일이 정해진 공고만 보기
        </label>

        {isDirty && (
          <button
            type="button"
            className="glass-button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            style={{ fontSize: '0.8125rem', padding: '0.35rem 0.7rem', marginLeft: 'auto' }}
          >
            <X size={14} />
            필터 초기화
          </button>
        )}
      </div>
    </div>
  );
}
