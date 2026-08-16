import Link from 'next/link';
import { SupportProgram } from '@/types';
import { dDayLabel, daysLeft } from '@/lib/api';
import { Calendar, MapPin, Building2, Users } from 'lucide-react';

interface ProgramCardProps {
  program: SupportProgram;
  /** 프로젝트 필터가 걸려 있을 때, 왜 매칭됐는지 보여줄 프로젝트 id */
  highlightProject?: string;
}

const SOURCE_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  'K-Startup': { bg: 'rgba(16, 185, 129, 0.18)', fg: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  '기업마당': { bg: 'rgba(249, 115, 22, 0.18)', fg: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' },
};

export default function ProgramCard({ program, highlightProject }: ProgramCardProps) {
  const match = highlightProject ? program.projectMatches?.[highlightProject] : undefined;
  const left = daysLeft(program);
  const isImminent = left !== null && left >= 0 && left <= 7;
  const source = SOURCE_COLORS[program.source] ?? {
    bg: 'rgba(148, 163, 184, 0.18)',
    fg: '#cbd5e1',
    border: 'rgba(148, 163, 184, 0.3)',
  };

  const period = program.endDate
    ? `${program.startDate || '?'} ~ ${program.endDate}`
    : program.applyPeriod?.split('\n')[0] || '상시 접수';

  return (
    <Link href={`/detail/${program.id}`} style={{ display: 'block' }}>
      <div
        className="glass-panel"
        style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <span className={`tag ${isImminent ? 'imminent' : ''}`}>{dDayLabel(program)}</span>
          <span
            className="tag"
            style={{ background: source.bg, color: source.fg, borderColor: source.border }}
          >
            {program.source}
          </span>
        </div>

        <h3 style={{ fontSize: '1.0625rem', fontWeight: 'bold', lineHeight: '1.5', flexGrow: 1 }}>
          {program.title}
        </h3>

        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          <span
            className="tag"
            style={{
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#a78bfa',
              borderColor: 'rgba(139, 92, 246, 0.3)',
            }}
          >
            {program.category}
          </span>
          {program.regions.slice(0, 2).map((region) => (
            <span key={region} className="tag">
              {region}
            </span>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={15} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {program.organization || '기관 미상'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={15} style={{ flexShrink: 0 }} />
            <span>{period}</span>
          </div>
          {program.target ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={15} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {program.target}
              </span>
            </div>
          ) : program.supervisor ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={15} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {program.supervisor}
              </span>
            </div>
          ) : null}
        </div>

        {match && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span
              className="tag"
              style={
                match.kind === 'domain'
                  ? { background: 'rgba(16, 185, 129, 0.18)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }
                  : { background: 'rgba(148, 163, 184, 0.18)', color: '#cbd5e1', borderColor: 'rgba(148, 163, 184, 0.3)' }
              }
            >
              {match.kind === 'domain' ? '분야 적합' : '일반 창업지원'}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {match.hits.join(' · ')}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
