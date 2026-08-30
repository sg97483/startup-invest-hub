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
const { PROJECTS, matchProjects } = require('./lib/projects');

/** 공고 신청자격 판정 기준이 되는 창업 단계. */
const FOUNDER_STAGE = 'pre-founder';

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

/** 직전에 배포된 공고 데이터. 소스 하나가 실패했을 때 이월 원본으로 씁니다. */
const BASELINE_URL =
  process.env.BASELINE_URL || 'https://startup-invest-hub.vercel.app/data/programs.json';

async function loadBaseline() {
  try {
    // http(s) 가 아니면 로컬 파일로 읽습니다 (오프라인 실행·테스트용).
    const data = /^https?:\/\//.test(BASELINE_URL)
      ? await (async () => {
          const res = await fetch(BASELINE_URL, { signal: AbortSignal.timeout(30000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })()
      : JSON.parse(fs.readFileSync(BASELINE_URL.replace(/^file:\/\//, ''), 'utf8'));
    console.log(`기준 데이터: ${data.baseDate} 기준 ${data.total}건 (수집 실패 시 이월용)`);
    return data;
  } catch (err) {
    console.warn(`  ! 기준 데이터를 불러오지 못했습니다 (${err.message}). 이월 없이 진행합니다.`);
    return null;
  }
}

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
  const { projects, projectMatches } = matchProjects(program, { stage: FOUNDER_STAGE });
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
    projects,
    projectMatches,
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

  const tasks = [];
  if (!only || only === 'kstartup') tasks.push({ name: 'K-Startup', run: () => kstartup.collect({ withDetail }) });
  if (!only || only === 'bizinfo') tasks.push({ name: '기업마당', run: () => bizinfo.collect({}) });

  const [baseline, results] = await Promise.all([
    loadBaseline(),
    Promise.all(tasks.map(async (task) => ({ name: task.name, ...(await task.run()) }))),
  ]);

  // 한 소스가 실패해도 그날 배포 전체를 날리지 않도록, 직전에 배포된 데이터에서 이월합니다.
  for (const result of results) {
    const previous = baseline?.programs.filter((p) => p.source === result.name) ?? [];
    if (!previous.length) continue;

    if (result.programs.length < previous.length * 0.5) {
      const fresh = new Set(result.programs.map((p) => p.externalId));
      const carried = previous.filter((p) => !fresh.has(p.externalId));
      result.carriedOver = carried.length;
      // 이월이 며칠 이어질 때 '어제 것'이 아니라 '마지막으로 진짜 수집한 날'을 물려줍니다.
      // 이게 없으면 매일 하루 전 데이터를 이월하는 꼴이라 만성 실패 경보가 영영 울리지 않습니다.
      const previousHealth = baseline.sourceHealth?.find((h) => h.source === result.name);
      result.carriedFrom = previousHealth?.carriedFrom || baseline.baseDate;
      result.programs = [...result.programs, ...carried];
      console.warn(
        `  ! ${result.name} 수집량이 직전(${previous.length}건)의 절반에 못 미쳐 ${carried.length}건을 이월했습니다.`
      );
    }
  }

  const lists = results.map((result) => result.programs);
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
    founderStage: FOUNDER_STAGE,
    sources: countBy('source'),
    regionCounts: countBy('regions'),
    categoryCounts: countBy('category'),
    projectCounts: countBy('projects'),
    sourceHealth: results.map((result) => ({
      source: result.name,
      collected: result.programs.length - (result.carriedOver || 0),
      carriedOver: result.carriedOver || 0,
      requestsOk: result.health?.ok ?? 0,
      requestsFailed: result.health?.failed ?? 0,
      // 이월했다면 그 데이터가 언제 것인지. 며칠씩 이어지면 손을 봐야 한다는 신호입니다.
      carriedFrom: result.carriedFrom || null,
    })),
    regions: REGIONS,
    categories: CATEGORIES,
    projects: PROJECTS.map(({ id, name, tagline, description }) => ({
      id,
      name,
      tagline,
      description,
    })),
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
  console.log('프로젝트별:', payload.projectCounts, `(신청자격 기준: ${FOUNDER_STAGE})`);
  console.log('소스 상태  :');
  for (const health of payload.sourceHealth) {
    console.log(
      `  - ${health.source}: 신규 ${health.collected}건` +
        (health.carriedOver ? ` + 이월 ${health.carriedOver}건 (${health.carriedFrom} 기준)` : '') +
        ` / 요청 성공 ${health.requestsOk} 실패 ${health.requestsFailed}`
    );
  }
  console.log(`저장 위치 : ${path.relative(process.cwd(), OUT_FILE)}`);
  console.log(`소요 시간 : ${((Date.now() - started) / 1000).toFixed(1)}초`);
}

main().catch((err) => {
  console.error('크롤링 실패:', err);
  process.exit(1);
});
