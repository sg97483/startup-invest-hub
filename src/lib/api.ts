import { ProgramDataset, SupportProgram } from '@/types';
import summary from '@/data/summary.json';

/**
 * 공고 데이터는 `npm run crawl` 이 만들어내는 정적 파일(/data/programs.json)에서 옵니다.
 * 1,700건이 넘기 때문에 JS 번들에 넣지 않고 런타임에 한 번만 받아와 캐시합니다.
 *
 * 파일 경로가 항상 같아서 브라우저가 예전 데이터를 계속 쓰는 문제가 있으므로,
 * 번들에 함께 들어가는 summary.json 의 수집 시각을 쿼리로 붙여 재배포마다 URL 을 바꿉니다.
 */
const DATA_URL = `/data/programs.json?v=${encodeURIComponent(
  (summary as { generatedAt?: string }).generatedAt ?? 'dev'
)}`;

const EMPTY: ProgramDataset = {
  generatedAt: '',
  baseDate: '',
  total: 0,
  sources: {},
  regionCounts: {},
  categoryCounts: {},
  projectCounts: {},
  regions: [],
  categories: [],
  projects: [],
  programs: [],
};

let cache: Promise<ProgramDataset> | null = null;

export function getSummary() {
  return summary as Omit<ProgramDataset, 'programs'>;
}

export async function fetchDataset(): Promise<ProgramDataset> {
  if (typeof window === 'undefined') return EMPTY;
  if (!cache) {
    cache = fetch(DATA_URL, { cache: 'force-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ProgramDataset>;
      })
      .catch((error) => {
        console.error('공고 데이터를 불러오지 못했습니다:', error);
        cache = null;
        return EMPTY;
      });
  }
  return cache;
}

export async function fetchSupportPrograms(): Promise<SupportProgram[]> {
  return (await fetchDataset()).programs;
}

export async function fetchProgramById(id: string): Promise<SupportProgram | null> {
  const { programs } = await fetchDataset();
  return programs.find((program) => program.id === id) ?? null;
}

/** 오늘부터 마감일까지 남은 '날짜' 수 (당일 마감이면 0). 마감일이 없으면 null. */
export function daysLeft(program: SupportProgram): number | null {
  if (!program.endDate) return null;
  const end = new Date(`${program.endDate}T00:00:00`).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((end - today) / 86_400_000);
}

export function dDayLabel(program: SupportProgram): string {
  if (program.alwaysOpen) return '상시';
  const left = daysLeft(program);
  if (left === null) return '기간 확인';
  if (left < 0) return '마감';
  if (left === 0) return 'D-Day';
  return `D-${left}`;
}
