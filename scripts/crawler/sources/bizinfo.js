/**
 * 기업마당 (중소벤처기업부) — 정책정보 > 지원사업 공고
 * https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do
 *
 * Central-government + 지자체 support programmes. The listing is a plain table,
 * so one pass over the pagination gives 지원분야 / 신청기간 / 소관부처 / 수행기관.
 */
const { fetchText } = require('../lib/http');
const { toText, match1, toISODate, decodeEntities } = require('../lib/parse');
const { normalizeCategory, resolveRegions } = require('../lib/taxonomy');

const ORIGIN = 'https://www.bizinfo.go.kr';
const LIST = `${ORIGIN}/sii/siia/selectSIIA200View.do`;
const DETAIL = `${ORIGIN}/sii/siia/selectSIIA200Detail.do`;
const MAX_PAGES = 200;

const listUrl = (page) => `${LIST}?cpage=${page}&rows=15&schEndAt=N&orderGb=&sort=`;

function lastPage(html) {
  const explicit = match1(html, /cpage=(\d+)"[^>]*title="마지막페이지"/);
  if (explicit) return Number(explicit);
  const pages = [...html.matchAll(/cpage=(\d+)"/g)].map((m) => Number(m[1]));
  return pages.length ? Math.max(...pages) : 1;
}

function parseListPage(html) {
  const bodyStart = html.indexOf('<tbody>');
  if (bodyStart === -1) return [];
  const section = html.slice(bodyStart, html.indexOf('</tbody>', bodyStart));

  const rows = [];
  for (const rowMatch of section.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const row = rowMatch[1];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    if (cells.length < 7) continue;

    const pblancId = match1(row, /pblancId=(PBLN_[0-9A-Z_]+)/);
    if (!pblancId) continue;

    const [start, end] = toText(cells[3]).split('~');
    rows.push({
      pblancId,
      categoryLabel: toText(cells[1]),
      title: toText(match1(row, /<a[^>]*>([\s\S]*?)<\/a>/)),
      periodLabel: toText(cells[3]),
      startDate: toISODate(start || ''),
      endDate: toISODate(end || ''),
      ministry: toText(cells[4]),
      organization: toText(cells[5]),
      postedDate: toISODate(toText(cells[6])),
      views: Number(toText(cells[7] || '').replace(/[^\d]/g, '')) || 0,
    });
  }
  return rows;
}

async function collect({ maxPages = MAX_PAGES, log = console.log } = {}) {
  log('[기업마당] 지원사업 공고 목록 수집…');

  const first = await fetchText(listUrl(1));
  if (!first) {
    log('[기업마당] 첫 페이지를 가져오지 못했습니다.');
    return [];
  }

  const seen = new Map();
  for (const row of parseListPage(first)) seen.set(row.pblancId, row);

  const pages = Math.min(lastPage(first), maxPages);
  for (let page = 2; page <= pages; page++) {
    const html = await fetchText(listUrl(page), { referer: LIST });
    if (!html) continue;
    const rows = parseListPage(html);
    if (!rows.length) break;
    for (const row of rows) seen.set(row.pblancId, row);
    if (page % 10 === 0) log(`  · ${page}/${pages} 페이지 (${seen.size}건)`);
  }

  const items = [...seen.values()];
  log(`[기업마당] ${items.length}건 수집 완료.`);

  return items.map((item) => {
    // 소관부처가 지자체면 그 자체가 정답, 중앙부처면 사업수행기관·제목에서 지역을 찾습니다.
    const { regions, regionBasis } = resolveRegions({
      portalText: item.ministry,
      hints: [item.title.match(/^\[([^\]]+)\]/)?.[1] || '', item.organization, item.title],
    });
    return {
      source: '기업마당',
      sourceUrl: `${DETAIL}?pblancId=${item.pblancId}`,
      externalId: `bizinfo-${item.pblancId}`,
      title: item.title,
      businessName: '',
      organization: item.organization || item.ministry,
      supervisor: item.ministry,
      organizationType: /부$|처$|청$|위원회$/.test(item.ministry) ? '중앙부처' : '지자체·공공',
      regions,
      regionBasis,
      category: normalizeCategory(item.categoryLabel, item.title),
      categoryLabel: item.categoryLabel,
      startDate: item.startDate,
      endDate: item.endDate,
      postedDate: item.postedDate,
      target: '',
      targetAge: '',
      businessAge: '',
      applyMethod: '',
      applyPeriod: item.periodLabel,
      contact: '',
      noticeNo: '',
      description: '',
      eligibility: '',
      exclusion: '',
      guideUrl: '',
      views: item.views,
    };
  });
}

module.exports = { collect, parseListPage, lastPage };
