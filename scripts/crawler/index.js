#!/usr/bin/env node
/**
 * 창업지원 공고 수집기
 *
 *   npm run crawl              전체 소스 수집 (K-Startup 상세 보강 포함)
 *   npm run crawl -- --fast    K-Startup 상세 페이지 생략 (빠름, 정보는 적음)
 *   npm run crawl -- --only=kstartup|bizinfo
 *
 * 결과물: public/data/programs.json  (정적 파일로 서빙 → JS 번들이 커지지 않음)
 */
const fs = require('fs');
const path = require('path');

const kstartup = require('./sources/kstartup');
const bizinfo = require('./sources/bizinfo');
const { REGIONS, CATEGORIES } = require('./lib/taxonomy');

const ROOT = path.join(__dirname, '..', '..');
const OUT_FILE = path.join(ROOT, 'public', 'data', 'programs.json');
/** 크롤링을 돌리지 않아도 빌드가 되도록 남겨두는 요약 스냅샷 */
const SUMMARY_FILE = path.join(ROOT, 'src', 'data', 'summary.json');

const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(`--${name}`);
const flagValue = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : '';
};

const ALWAYS_OPEN = /상시|수시|예산\s*소진|소진\s*시|연중/;

const today = () => new Date().toISOString().slice(0, 10);

function dedupeKey(program) {
  return `${program.title.replace(/[\s[\]()「」『』·ㆍ,.]/g, '')}|${program.endDate}`;
}

/** Cross-source merge: same 공고 posted to both portals keeps the richer record. */
function merge(lists) {
  const byExternalId = new Map();
  const byTitle = new Map();

  for (const program of lists.flat()) {
    if (!program.title) continue;
    if (byExternalId.has(program.externalId)) continue;

    const key = dedupeKey(program);
    const existing = byTitle.get(key);
    if (existing) {
      // Keep whichever record carries more filled-in fields.
      const score = (p) => Object.values(p).filter((v) => v && v !== '' ).length;
      if (score(program) <= score(existing)) continue;
      byExternalId.delete(existing.externalId);
    }
    byExternalId.set(program.externalId, program);
    byTitle.set(key, program);
  }
  return [...byExternalId.values()];
}

function finalize(program) {
  const alwaysOpen = !program.endDate && ALWAYS_OPEN.test(program.applyPeriod || '');
  const searchText = [
    program.title,
    program.businessName,
    program.organization,
    program.supervisor,
    program.categoryLabel,
    program.target,
    program.regions.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return {
    id: program.externalId,
    ...program,
    region: program.regions[0] || '전국',
    alwaysOpen,
    searchText,
  };
}

function isOpen(program) {
  if (program.alwaysOpen) return true;
  if (!program.endDate) return Boolean(program.startDate) || Boolean(program.applyPeriod);
  return program.endDate >= today();
}

/** 마감이 가까운 순. 마감일 없는(상시) 공고는 뒤로. */
function byDeadline(a, b) {
  if (!a.endDate && !b.endDate) return (b.postedDate || '').localeCompare(a.postedDate || '');
  if (!a.endDate) return 1;
  if (!b.endDate) return -1;
  return a.endDate.localeCompare(b.endDate);
}

async function main() {
  const started = Date.now();
  const only = flagValue('only');
  const withDetail = !hasFlag('fast');

  console.log('=== 창업지원 공고 수집 시작 ===');
  console.log(`기준일: ${today()} / 상세 보강: ${withDetail ? 'ON' : 'OFF'}`);

  const jobs = [];
  if (!only || only === 'kstartup') jobs.push(kstartup.collect({ withDetail }));
  if (!only || only === 'bizinfo') jobs.push(bizinfo.collect({}));

  const lists = await Promise.all(jobs);

  const merged = merge(lists).map(finalize);
  const open = merged.filter(isOpen).sort(byDeadline);

  const countBy = (key) =>
    open.reduce((acc, p) => {
      const values = Array.isArray(p[key]) ? p[key] : [p[key]];
      for (const v of values) acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {});

  const payload = {
    generatedAt: new Date().toISOString(),
    baseDate: today(),
    total: open.length,
    sources: countBy('source'),
    regionCounts: countBy('regions'),
    categoryCounts: countBy('category'),
    regions: REGIONS,
    categories: CATEGORIES,
    programs: open,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 0), 'utf8');

  const { programs, ...summary } = payload;
  fs.mkdirSync(path.dirname(SUMMARY_FILE), { recursive: true });
  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2), 'utf8');

  console.log('--------------------------------');
  console.log(`수집 원본 : ${lists.reduce((n, l) => n + l.length, 0)}건`);
  console.log(`중복 제거 : ${merged.length}건`);
  console.log(`모집중    : ${open.length}건`);
  console.log('소스별    :', payload.sources);
  console.log('분야별    :', payload.categoryCounts);
  console.log(`저장 위치 : ${path.relative(process.cwd(), OUT_FILE)}`);
  console.log(`소요 시간 : ${((Date.now() - started) / 1000).toFixed(1)}초`);
}

main().catch((err) => {
  console.error('크롤링 실패:', err);
  process.exit(1);
});
