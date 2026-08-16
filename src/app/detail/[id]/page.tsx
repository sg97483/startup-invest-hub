'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { SupportProgram } from '@/types';
import { fetchProgramById, dDayLabel, daysLeft } from '@/lib/api';
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  MapPin,
  Building2,
  Users,
  Phone,
  FileText,
  Landmark,
  Clock,
} from 'lucide-react';

/**
 * 원본 포털이 지자체 공고에도 '전국'을 적어두는 경우가 많아 기관명·사업명으로 지역을 보정합니다.
 * 어떤 근거로 정해진 값인지 밝혀둡니다.
 */
const REGION_NOTE: Record<string, string> = {
  portal: '',
  default: '',
  district: '\n(원본은 전국 표기 — 주관기관·사업명 기준으로 보정)',
  organization: '\n(원본 미표기 — 주관기관 기준)',
  'portal+organization': '\n(원본은 전국 표기 — 주관기관 소재지 병기)',
};

/** 값이 있는 항목만 접수 정보 그리드에 노출합니다. */
function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
      <div style={{ flexShrink: 0, marginTop: '2px' }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{label}</div>
        <div style={{ fontWeight: 600, fontSize: '1rem', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{value}</div>
      </div>
    </div>
  );
}

function Section({ title, body }: { title: string; body?: string }) {
  if (!body) return null;
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h3
        style={{
          fontSize: '1.125rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.5rem',
        }}
      >
        {title}
      </h3>
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.9)' }}>{body}</div>
    </div>
  );
}

export default function DetailView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [program, setProgram] = useState<SupportProgram | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchProgramById(id)
      .then(setProgram)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        로딩 중...
      </div>
    );
  }

  if (!program) {
    return (
      <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p style={{ marginBottom: '1.5rem' }}>공고를 찾을 수 없습니다. 마감되어 목록에서 제외되었을 수 있습니다.</p>
        <Link href="/" className="glass-button">
          <ArrowLeft size={18} />
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const left = daysLeft(program);
  const isImminent = left !== null && left >= 0 && left <= 7;
  const period = program.endDate
    ? `${program.startDate || '?'} ~ ${program.endDate}`
    : program.applyPeriod || '상시 접수';

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <Link href="/" className="glass-button" style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={20} />
        목록으로 돌아가기
      </Link>

      <div className="glass-panel detail-panel" style={{ padding: '3rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <span className={`tag ${isImminent ? 'imminent' : ''}`}>{dDayLabel(program)}</span>
          <span
            className="tag"
            style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa', borderColor: 'rgba(139, 92, 246, 0.3)' }}
          >
            {program.categoryLabel || program.category}
          </span>
          {program.regions.map((region) => (
            <span key={region} className="tag">
              {region}
            </span>
          ))}
          <span
            className="tag"
            style={{ background: 'rgba(148, 163, 184, 0.18)', color: '#cbd5e1', borderColor: 'rgba(148, 163, 184, 0.3)' }}
          >
            {program.source}
          </span>
        </div>

        {program.noticeNo && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            {program.noticeNo}
          </p>
        )}

        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem', lineHeight: '1.4' }}>
          {program.title}
        </h1>

        <div
          className="detail-info-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '3rem',
            padding: '1.5rem',
            background: 'var(--surface-hover)',
            borderRadius: '12px',
          }}
        >
          <InfoItem
            icon={<Building2 size={22} color="var(--primary-color)" />}
            label="주관기관"
            value={program.organization}
          />
          <InfoItem
            icon={<Calendar size={22} color="var(--accent-color)" />}
            label="접수기간"
            value={period}
          />
          <InfoItem icon={<Landmark size={22} color="var(--primary-color)" />} label="소관부처·담당부서" value={program.supervisor} />
          <InfoItem
            icon={<MapPin size={22} color="var(--accent-color)" />}
            label="지원지역"
            value={program.regions.join(', ') + REGION_NOTE[program.regionBasis ?? 'portal']}
          />
          <InfoItem icon={<Users size={22} color="var(--primary-color)" />} label="지원대상" value={program.target} />
          <InfoItem icon={<Clock size={22} color="var(--accent-color)" />} label="창업업력" value={program.businessAge} />
          <InfoItem icon={<Users size={22} color="var(--primary-color)" />} label="대상연령" value={program.targetAge} />
          <InfoItem icon={<Phone size={22} color="var(--accent-color)" />} label="문의처" value={program.contact} />
          <InfoItem icon={<FileText size={22} color="var(--primary-color)" />} label="사업명" value={program.businessName} />
        </div>

        <Section title="공고 개요" body={program.description} />
        <Section title="신청기간" body={program.endDate ? undefined : program.applyPeriod} />
        <Section title="신청방법" body={program.applyMethod} />
        <Section title="신청대상" body={program.eligibility} />
        <Section title="제외대상" body={program.exclusion} />

        {!program.description && !program.applyMethod && !program.eligibility && (
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: 1.8 }}>
            이 공고의 상세 내용은 원본 공고처에서 확인할 수 있습니다.
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <a
            href={program.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-button"
            style={{
              background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
              fontSize: '1.0625rem',
              boxShadow: '0 4px 20px var(--primary-glow)',
            }}
          >
            <ExternalLink size={20} />
            원본 공고 보기 ({program.source})
          </a>
          {program.guideUrl && (
            <a
              href={program.guideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-button"
              style={{ padding: '1rem 2rem', fontSize: '1.0625rem' }}
            >
              <ExternalLink size={20} />
              접수 사이트 바로가기
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
