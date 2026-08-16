/**
 * 내 프로젝트별 공고 적합도 판정.
 *
 * 공고 텍스트(제목·사업명·지원분야·지원대상·개요)에서 키워드를 찾아 점수를 매기고,
 * 일정 점수를 넘는 공고에만 프로젝트 태그를 붙입니다. 태그는 수집 시점에 계산해
 * JSON 에 저장하므로 화면에서는 필터링만 하면 됩니다.
 *
 * 프로젝트 정의 근거
 *  - CodiPop : docs/코디팝 사업기획서, demo-mall B2B 고도화 분석
 *              → 온라인 패션몰에 붙이는 AI 가상피팅 위젯. B2B 구독 SaaS.
 *  - KachiApp: docs/kachi_app_status.md, kachi_growth_and_improvements.md
 *              → 해외 K-컬처 팬 대상 AI 여행일정 앱. 인바운드 관광 · 8개 언어.
 */

/**
 * 두 프로젝트 모두에 해당하는 공통 신호 (기술 스택 · 창업 단계 · 지원 성격).
 * 이 점수만으로도 충분히 높으면 '분야 무관 일반 창업지원'으로 보고 양쪽에 매칭합니다.
 */
const COMMON_SIGNALS = [
  // 두 프로젝트의 공통 축은 AI다. CodiPop 은 이미지 생성, KachiApp 은 LLM 기반 일정 생성이라
  // AI·GPU 관련 공고는 분야를 불문하고 양쪽 모두에 해당한다.
  { weight: 4, terms: ['인공지능', 'AI', '생성형', 'LLM', '초거대', '머신러닝', '딥러닝', 'GPU', '딥테크'] },
  { weight: 3, terms: ['소프트웨어', 'SW', 'ICT', '앱', '애플리케이션', '플랫폼', 'SaaS', '서비스형'] },
  { weight: 2, terms: ['스타트업', '창업기업', '벤처', '혁신기업', '기술창업', '예비창업'] },
  { weight: 2, terms: ['사업화', '아이디어', '시제품', 'MVP', '실증', '테스트베드'] },
  { weight: 2, terms: ['액셀러레이팅', '데모데이', 'IR', '투자유치', '보육', '입주'] },
  { weight: 2, terms: ['디지털 전환', '디지털전환', '디지털'] },
  { weight: 1, terms: ['멘토링', '컨설팅', '네트워킹', '경진대회', '공모전', '해커톤'] },
];

/**
 * 이 프로젝트들과 무관한 분야 — 하나라도 걸리면 제외합니다.
 *
 * 뒤쪽 묶음은 실제 매칭 결과를 보고 걸러낸 오탐입니다. 예를 들어 '유통'은 소상공인
 * 판매전을, '문화'는 직장문화 개선사업을 끌고 들어왔습니다.
 */
const EXCLUSIONS = [
  // 산업 분야가 아예 다른 경우
  '농업', '농촌', '농식품', '농업인', '축산', '수산', '어업', '어장', '양식', '임업', '산림',
  '스마트공장', '뿌리기업', '뿌리산업', '제조설비', '공장설립', '생산설비', '자동화설비',
  '조선', '해양플랜트', '자동차부품', '석유화학', '정유', '금형', '주조', '용접',
  '신발', '섬유', '봉제', '가구', '식품 제조',
  '건설업', '건축시공', '토목', '폐기물', '광업',
  '의료기기', '제약', '임상시험', '신약',
  '방위산업', '원자력', '국방',
  // 대상이 다른 경우 (예비창업 소프트웨어 팀과 무관)
  '소상공인', '전통시장', '상점가', '점포', '음식점', '외식업', '숙박업', '전통주', '공예',
  '홈쇼핑', '판매전', '위조상품', '우수제품 판매',
  // 사업 목적이 다른 경우
  '노사', '직장문화', '근로환경', '근로시간', '안전보건', '산업재해',
  '로케이션', '촬영지', '영화 제작지원',
];

const PROJECTS = [
  {
    id: 'codipop',
    name: 'CodiPop',
    tagline: 'AI 가상피팅 · 코디 추천 커머스 SaaS',
    description: '온라인 패션몰에 한 줄 스크립트로 붙이는 AI 가상피팅 위젯. B2B 월 구독 모델.',
    signals: [
      { weight: 5, terms: ['가상피팅', '가상 피팅', '버추얼 피팅', '가상착용', '패션테크', '리테일테크'] },
      { weight: 4, terms: ['패션', '의류', '어패럴', '뷰티테크', '스타일링'] },
      { weight: 4, terms: ['이커머스', 'e커머스', 'E-커머스', '디지털커머스', '커머스', '쇼핑몰', '온라인몰'] },
      { weight: 3, terms: ['이미지 생성', '이미지생성', '이미지 합성', '컴퓨터비전', '비전 AI', '비전AI'] },
      { weight: 2, terms: ['SaaS', '구독형', '위젯', 'API 연동', 'B2B 솔루션'] },
    ],
  },
  {
    id: 'kachiapp',
    name: 'KachiApp',
    tagline: '해외 K-컬처 팬 대상 AI 여행일정 앱',
    description: 'K-POP·K-드라마 팬을 위한 AI 맞춤 여행일정 생성 앱. 인바운드 관광, 8개 언어 지원.',
    signals: [
      { weight: 5, terms: ['관광', '여행', '인바운드', '방한', '관광벤처', '관광기업'] },
      { weight: 5, terms: ['한류', 'K-컬처', 'K컬처', 'K-POP', 'K팝', 'K-콘텐츠', 'K콘텐츠', '케이팝'] },
      { weight: 3, terms: ['문화콘텐츠', '문화산업', '콘텐츠산업', '엔터테인먼트', '공연', '팬덤', '콘텐츠기업'] },
      { weight: 3, terms: ['해외진출', '글로벌 진출', '외국인', '다국어', '현지화', '해외시장', '글로벌'] },
      { weight: 2, terms: ['위치기반', '개인화', '큐레이션', '지역 관광', '지역관광'] },
    ],
  },
];

/** 공고에서 검색 대상이 되는 텍스트를 하나로 합칩니다. */
function haystack(program) {
  return [
    program.title,
    program.businessName,
    program.categoryLabel,
    program.target,
    program.description,
    program.eligibility,
    program.organization,
  ]
    .filter(Boolean)
    .join(' ');
}

/** signal 목록을 훑어 점수와 실제로 걸린 키워드를 돌려줍니다. */
function scoreSignals(text, signals) {
  let score = 0;
  const hits = [];
  for (const { weight, terms } of signals) {
    const matched = terms.find((term) => text.includes(term));
    if (matched) {
      score += weight;
      hits.push(matched);
    }
  }
  return { score, hits };
}

/**
 * 예비창업자 기준 신청 가능 여부.
 * K-Startup 은 창업업력을 명시하므로 '전체' 또는 '예비창업자' 포함일 때만 통과시킵니다.
 * 기업마당은 업력 정보가 없어 판단을 보류합니다(제외하지 않음).
 */
function eligibilityForPreFounder(program) {
  const age = (program.businessAge || '').trim();
  if (!age) return 'unknown';
  if (age === '전체' || age.includes('예비창업')) return 'eligible';
  return 'ineligible';
}

/**
 * 공고 하나에 대해 매칭되는 프로젝트 목록을 계산합니다.
 * @returns {{ projects: string[], projectMatches: Record<string, {score:number, hits:string[]}> }}
 */
function matchProjects(program, { stage = 'pre-founder' } = {}) {
  const text = haystack(program);

  if (EXCLUSIONS.some((term) => text.includes(term))) {
    return { projects: [], projectMatches: {} };
  }

  const eligibility = stage === 'pre-founder' ? eligibilityForPreFounder(program) : 'unknown';
  if (eligibility === 'ineligible') {
    return { projects: [], projectMatches: {} };
  }

  const common = scoreSignals(text, COMMON_SIGNALS);
  const projects = [];
  const projectMatches = {};

  // 분야를 가리지 않는 일반 창업지원(입주·액셀러레이팅·사업화 자금 등)은 양쪽 다 해당됩니다.
  const generalStartupProgram = common.score >= 7;

  for (const project of PROJECTS) {
    const domain = scoreSignals(text, project.signals);

    // 분야 키워드만 걸리고 창업 관련 신호가 전혀 없으면 제외합니다.
    // (예: '단체관광객 유치 인센티브'는 관광이지만 여행사 실적 지원이라 무관)
    const relevant =
      (domain.score >= 5 && common.score >= 2) ||
      (domain.score >= 3 && common.score >= 5) ||
      generalStartupProgram;
    if (!relevant) continue;

    projects.push(project.id);
    projectMatches[project.id] = {
      score: domain.score * 2 + common.score,
      hits: [...domain.hits, ...common.hits].slice(0, 6),
      kind: domain.score >= 3 ? 'domain' : 'general',
    };
  }

  return { projects, projectMatches };
}

module.exports = { PROJECTS, matchProjects, eligibilityForPreFounder };
