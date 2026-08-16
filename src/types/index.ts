export interface SupportProgram {
  id: string;
  /** 수집처: 'K-Startup' | '기업마당' */
  source: string;
  /** 원본 공고 페이지 */
  sourceUrl: string;
  externalId: string;

  title: string;
  /** 소속 사업명 (예: 초기창업패키지) */
  businessName?: string;
  /** 주관/수행 기관 */
  organization: string;
  /** 소관부처 또는 담당부서 */
  supervisor?: string;
  /** 기관구분 (중앙부처 / 지자체 / 공공기관 …) */
  organizationType?: string;

  /** 지원 지역 (복수 가능) */
  regions: string[];
  /** regions[0] — 목록 표시용 */
  region: string;
  /**
   * 지역을 어떻게 정했는지.
   * portal: 포털이 지정 / district: 기관·사업명의 시군구로 보정 /
   * organization: 광역기관명으로 보정 / portal+organization: 전국 + 기관 소재지 병기 / default: 단서 없음
   */
  regionBasis?: 'portal' | 'district' | 'organization' | 'portal+organization' | 'default';

  /** 통합 분류 */
  category: string;
  /** 원본 포털의 지원분야 표기 */
  categoryLabel?: string;

  startDate: string; // YYYY-MM-DD ('' 이면 미공개)
  endDate: string; // YYYY-MM-DD ('' 이면 상시/미공개)
  postedDate?: string;
  /** 마감일 없이 상시·예산 소진시까지 접수하는 공고 */
  alwaysOpen?: boolean;

  target?: string;
  targetAge?: string;
  businessAge?: string;
  applyMethod?: string;
  applyPeriod?: string;
  contact?: string;
  noticeNo?: string;
  description?: string;
  eligibility?: string;
  exclusion?: string;
  guideUrl?: string;
  views?: number;

  /** 소문자 통합 검색용 텍스트 */
  searchText?: string;
}

export interface ProgramDataset {
  generatedAt: string;
  baseDate: string;
  total: number;
  sources: Record<string, number>;
  regionCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  regions: string[];
  categories: string[];
  programs: SupportProgram[];
}
