/**
 * K-Startup (창업진흥원 창업지원포털) — 사업공고 > 모집중
 * https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do
 *
 * The list is server-rendered, so we page through the HTML and then (optionally)
 * open each announcement's detail page for 지역 / 신청방법 / 지원대상 / 본문.
 */
const { fetchText, mapPool } = require('../lib/http');
const { toText, match1, toISODate, decodeEntities } = require('../lib/parse');
const { normalizeCategory, resolveRegions } = require('../lib/taxonomy');

const BASE = 'https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do';
const MAX_PAGES = 60;

const listUrl = (page) => `${BASE}?schM=list&page=${page}&pbancClssCd=`;
const viewUrl = (sn) => `${BASE}?schM=view&pbancSn=${sn}`;

/** Highest page number advertised by the pagination widget. */
function maxAdvertisedPage(html) {
  const pages = [...html.matchAll(/fn_egov_link_page\((\d+)\)/g)].map((m) => Number(m[1]));
  return pages.length ? Math.max(...pages) : 1;
}

function parseListPage(html) {
  // Only the main board list — the page also renders a duplicate "top" slider.
  const start = html.indexOf('id="bizPbancList"');
  if (start === -1) return [];
  const end = html.indexOf('</ul>', html.lastIndexOf('</li>', html.indexOf('pagination', start)));
  const section = html.slice(start, end > start ? end : start + 400000);

  const items = [];
  for (const chunk of section.split(/<li(?=[\s>])/).slice(1)) {
    const sn = match1(chunk, /go_view\((\d+)\)/);
    if (!sn) continue;

    const labels = [...chunk.matchAll(/<span class="list">[\s\S]*?<\/i>([^<]*)<\/span>/g)].map((m) =>
      toText(m[1])
    );
    const pick = (prefix) => {
      const hit = labels.find((l) => l.startsWith(prefix));
      return hit ? hit.slice(prefix.length).trim() : '';
    };

    items.push({
      externalId: sn,
      title: toText(match1(chunk, /<p class="tit">([\s\S]*?)<\/p>/)),
      categoryLabel: toText(match1(chunk, /<span class="flag type\d+">([\s\S]*?)<\/span>/)),
      dDayLabel: toText(match1(chunk, /<span class="flag day">([\s\S]*?)<\/span>/)),
      agencyType: toText(match1(chunk, /<span class="flag_agency">([\s\S]*?)<\/span>/)),
      businessName: labels[0] && !labels[0].includes('일자') ? labels[0] : '',
      organization: labels[1] && !labels[1].includes('일자') ? labels[1] : '',
      postedDate: toISODate(pick('등록일자')),
      startDate: toISODate(pick('시작일자')),
      endDate: toISODate(pick('마감일자')),
      views: Number(pick('조회').replace(/[^\d]/g, '')) || 0,
    });
  }
  return items;
}

/** Turns the detail page's `<p class="tit">라벨</p><p class="txt">값</p>` pairs into a map. */
function parseDetail(html) {
  const fields = {};
  // The lookaheads stop a label from swallowing everything up to a far-away </p>
  // (the page leaves a few <p class="tit"> tags unclosed in the header markup).
  const pairRe =
    /<p class="tit"[^>]*>((?:(?!<\/p>)[\s\S])*)<\/p>\s*(?:<!--[\s\S]*?-->\s*)?<(p|div) class="txt"[^>]*>((?:(?!<\/\2>)[\s\S])*)<\/\2>/g;
  for (const m of html.matchAll(pairRe)) {
    const key = toText(m[1]);
    const value = toText(m[3], { keepLines: true });
    if (key && key.length <= 12 && value && !fields[key]) fields[key] = value;
  }

  // 공고 본문 인사말: the first .txt paragraph after the bold title block.
  let intro = '';
  const titleAt = html.indexOf('class="tit_bl"');
  if (titleAt !== -1) {
    const txtAt = html.indexOf('<p class="txt">', titleAt);
    if (txtAt !== -1 && txtAt - titleAt < 1500) {
      intro = toText(html.slice(txtAt + 15, html.indexOf('</p>', txtAt)), { keepLines: true });
    }
  }

  let guideUrl = decodeEntities(match1(html, /fn_open_window\('([^']+)'\)/));
  if (guideUrl && !/^https?:\/\//i.test(guideUrl)) guideUrl = `https://${guideUrl}`;

  return {
    fields,
    noticeNo: toText(match1(html, /<p class="num_txt">((?:(?!<\/p>)[\s\S])*)<\/p>/)),
    intro,
    guideUrl,
  };
}

async function collect({ withDetail = true, detailConcurrency = 6, log = console.log } = {}) {
  log('[K-Startup] 모집중 공고 목록 수집…');

  const first = await fetchText(listUrl(1));
  if (!first) {
    log('[K-Startup] 첫 페이지를 가져오지 못했습니다.');
    return [];
  }

  const seen = new Map();
  for (const item of parseListPage(first)) seen.set(item.externalId, item);

  let lastPage = maxAdvertisedPage(first);
  for (let page = 2; page <= Math.min(lastPage, MAX_PAGES); page++) {
    const html = await fetchText(listUrl(page), { referer: BASE });
    if (!html) continue;
    const rows = parseListPage(html);
    if (!rows.length) break;
    for (const item of rows) seen.set(item.externalId, item);
    lastPage = Math.max(lastPage, maxAdvertisedPage(html));
    if (page % 5 === 0) log(`  · ${page}/${Math.min(lastPage, MAX_PAGES)} 페이지 (${seen.size}건)`);
  }

  const items = [...seen.values()];
  log(`[K-Startup] 목록 ${items.length}건 수집 완료.`);

  let details = [];
  if (withDetail) {
    log(`[K-Startup] 상세 정보 보강 중 (동시 요청 ${detailConcurrency})…`);
    let done = 0;
    details = await mapPool(items, detailConcurrency, async (item) => {
      const html = await fetchText(viewUrl(item.externalId), { referer: BASE });
      done += 1;
      if (done % 50 === 0) log(`  · 상세 ${done}/${items.length}`);
      return html ? parseDetail(html) : null;
    });
  }

  return items.map((item, i) => {
    const detail = details[i];
    const f = detail?.fields ?? {};
    const organization = f['주관기관명'] || item.organization;
    const { regions, regionBasis } = resolveRegions({
      portalText: f['지역'] || '',
      hints: [organization, f['담당부서'], item.businessName, item.title],
    });

    const period = f['접수기간'] || '';
    const [periodStart, periodEnd] = period.split('~').map((s) => toISODate(s || ''));

    return {
      source: 'K-Startup',
      sourceUrl: viewUrl(item.externalId),
      externalId: `kstartup-${item.externalId}`,
      title: item.title,
      businessName: item.businessName,
      organization,
      supervisor: f['담당부서'] || '',
      organizationType: f['기관구분'] || item.agencyType,
      regions,
      regionBasis,
      category: normalizeCategory(f['지원분야'] || item.categoryLabel, item.title),
      categoryLabel: f['지원분야'] || item.categoryLabel,
      startDate: item.startDate || periodStart || '',
      endDate: item.endDate || periodEnd || '',
      postedDate: item.postedDate,
      target: f['대상'] || '',
      targetAge: f['대상연령'] || '',
      businessAge: f['창업업력'] || '',
      applyMethod: f['신청방법'] || '',
      applyPeriod: f['신청기간'] || period,
      contact: f['연락처'] || '',
      noticeNo: detail?.noticeNo || '',
      description: detail?.intro || '',
      eligibility: f['신청대상'] || '',
      exclusion: f['제외대상'] || '',
      guideUrl: detail?.guideUrl || '',
      views: item.views,
    };
  });
}

module.exports = { collect, parseListPage, parseDetail };
