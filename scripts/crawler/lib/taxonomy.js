/** Shared vocabulary: every source is mapped onto these region / category names. */
const { DISTRICT_PATTERNS } = require('./districts');

const REGIONS = [
  '전국', '서울', '경기', '인천', '강원', '대전', '세종', '충남', '충북',
  '광주', '전남', '전북', '부산', '울산', '경남', '대구', '경북', '제주',
];

const CATEGORIES = [
  '사업화·자금',
  '기술개발(R&D)',
  '창업교육',
  '시설·공간·보육',
  '멘토링·컨설팅',
  '행사·네트워크',
  '글로벌·수출',
  '판로·마케팅',
  '인력',
  '융자·보증',
  '기타',
];

/** Longest-match-first keyword table for free-text region detection. */
const REGION_KEYWORDS = [
  ['서울특별시', '서울'], ['부산광역시', '부산'], ['대구광역시', '대구'],
  ['인천광역시', '인천'], ['광주광역시', '광주'], ['대전광역시', '대전'],
  ['울산광역시', '울산'], ['세종특별자치시', '세종'], ['세종시', '세종'],
  ['강원특별자치도', '강원'], ['강원도', '강원'],
  ['제주특별자치도', '제주'], ['제주도', '제주'],
  ['전북특별자치도', '전북'], ['전라북도', '전북'], ['전라남도', '전남'],
  ['충청북도', '충북'], ['충청남도', '충남'],
  ['경상북도', '경북'], ['경상남도', '경남'],
  ['경기도', '경기'],
  ['서울', '서울'], ['부산', '부산'], ['대구', '대구'], ['인천', '인천'],
  ['광주', '광주'], ['대전', '대전'], ['울산', '울산'], ['세종', '세종'],
  ['경기', '경기'], ['강원', '강원'], ['충북', '충북'], ['충남', '충남'],
  ['전북', '전북'], ['전남', '전남'], ['경북', '경북'], ['경남', '경남'],
  ['제주', '제주'], ['전국', '전국'],
];

/** K-Startup's LCxx region codes. LC18 covers the merged 광주·전남 area. */
const KSTARTUP_REGION_CODES = {
  LC00: ['전국'], LC01: ['서울'], LC02: ['부산'], LC03: ['대구'], LC04: ['인천'],
  LC18: ['광주', '전남'], LC06: ['대전'], LC07: ['울산'], LC17: ['세종'],
  LC09: ['강원'], LC08: ['경기'], LC12: ['경남'], LC13: ['경북'], LC15: ['전북'],
  LC10: ['충남'], LC11: ['충북'], LC16: ['제주'],
};

/** Source 지원분야 label → unified category. */
const CATEGORY_MAP = {
  // K-Startup
  '사업화': '사업화·자금',
  '창업교육': '창업교육',
  '시설ㆍ공간ㆍ보육': '시설·공간·보육',
  '멘토링ㆍ컨설팅ㆍ교육': '멘토링·컨설팅',
  '행사ㆍ네트워크': '행사·네트워크',
  '기술개발(R&D)': '기술개발(R&D)',
  '기술개발': '기술개발(R&D)',
  '융자': '융자·보증',
  '인력': '인력',
  '글로벌': '글로벌·수출',
  '정책자금': '사업화·자금',
  // 기업마당
  '금융': '융자·보증',
  '기술': '기술개발(R&D)',
  '수출': '글로벌·수출',
  '내수': '판로·마케팅',
  '창업': '사업화·자금',
  '경영': '멘토링·컨설팅',
  '제도': '기타',
};

/** Falls back to keyword sniffing on the title when the label is unknown. */
function normalizeCategory(rawLabel = '', title = '') {
  const label = rawLabel.replace(/\s+/g, '');
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (label && label.includes(key.replace(/\s+/g, ''))) return value;
  }
  const t = `${title}`;
  if (/융자|보증|대출/.test(t)) return '융자·보증';
  if (/R&D|연구개발|기술개발/i.test(t)) return '기술개발(R&D)';
  if (/입주|보육|공간|센터\s*모집/.test(t)) return '시설·공간·보육';
  if (/교육|아카데미|스쿨|캠프/.test(t)) return '창업교육';
  if (/데모데이|경진대회|공모전|밋업|네트워킹|포럼|세미나|IR/i.test(t)) return '행사·네트워크';
  if (/수출|해외|글로벌|해외진출/.test(t)) return '글로벌·수출';
  if (/멘토링|컨설팅|자문/.test(t)) return '멘토링·컨설팅';
  if (/채용|인력|일자리/.test(t)) return '인력';
  if (/마케팅|판로|전시회|박람회/.test(t)) return '판로·마케팅';
  if (/자금|지원금|바우처|투자|펀드/.test(t)) return '사업화·자금';
  return '기타';
}

/** Pulls every 광역시도 mentioned in a blob of text (기관명 + 제목 + 지역 필드). */
function detectRegions(...texts) {
  const blob = texts.filter(Boolean).join(' ');
  if (!blob) return [];
  const found = new Set();
  for (const [keyword, region] of REGION_KEYWORDS) {
    if (blob.includes(keyword)) found.add(region);
  }
  // 전국 is only meaningful on its own.
  if (found.size > 1) found.delete('전국');
  return [...found];
}

/** 기초자치단체(시·군·구) 이름으로 광역시도를 찾아냅니다. */
function detectDistrictRegions(...texts) {
  const blob = texts.filter(Boolean).join(' ');
  if (!blob) return [];
  const found = new Set();
  for (const { regex, region } of DISTRICT_PATTERNS) {
    if (regex.test(blob)) found.add(region);
  }
  return [...found];
}

/**
 * 지역 확정 규칙.
 *
 * 포털의 '지역' 값은 지자체 공고에도 '전국'이 박혀 있는 경우가 많아서, 주관기관명·사업명에
 * 남아 있는 지역 단서로 보정합니다. 단서의 강도에 따라 다르게 처리합니다.
 *
 *   1. 포털이 특정 시도를 지정 → 그대로 신뢰 (가장 정확)
 *   2. 기초자치단체(수원·구미·강동구…)가 잡힘 → 기초지자체 사업으로 보고 '전국'을 대체
 *   3. 광역기관명(서울창조경제혁신센터…)만 잡힘 → 광역기관은 전국 사업도 운영하므로,
 *      포털이 명시적으로 '전국'이라 한 경우에는 둘 다 유지
 *   4. 아무 단서도 없음 → 포털 값 유지
 *
 * @returns {{ regions: string[], regionBasis: string }}
 */
function resolveRegions({ portalText = '', hints = [] } = {}) {
  const portal = detectRegions(portalText);
  const explicitNationwide = portal.length === 1 && portal[0] === '전국';
  const specifiedByPortal = portal.length > 0 && !explicitNationwide;

  if (specifiedByPortal) return { regions: portal, regionBasis: 'portal' };

  const blob = hints.filter(Boolean).join(' ');
  const districts = detectDistrictRegions(blob);
  if (districts.length) {
    return { regions: districts, regionBasis: 'district' };
  }

  const wide = detectRegions(blob).filter((region) => region !== '전국');
  if (wide.length) {
    return explicitNationwide
      ? { regions: ['전국', ...wide], regionBasis: 'portal+organization' }
      : { regions: wide, regionBasis: 'organization' };
  }

  return { regions: portal.length ? portal : ['전국'], regionBasis: portal.length ? 'portal' : 'default' };
}

module.exports = {
  REGIONS,
  CATEGORIES,
  KSTARTUP_REGION_CODES,
  normalizeCategory,
  detectRegions,
  detectDistrictRegions,
  resolveRegions,
};
