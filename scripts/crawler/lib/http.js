const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 아주 단순한 쿠키 보관함.
 * 기업마당은 첫 요청에서 받은 세션 쿠키를 이후 요청에 실어야 목록이 안정적으로 나옵니다.
 * (로컬에서는 없어도 되지만 GitHub 러너 같은 낯선 IP 에서는 이게 없으면 간헐적으로 빈 응답이 옵니다)
 */
function createCookieJar() {
  const jar = new Map();
  return {
    header() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    store(setCookie) {
      if (!setCookie) return;
      for (const raw of Array.isArray(setCookie) ? setCookie : [setCookie]) {
        const [pair] = raw.split(';');
        const index = pair.indexOf('=');
        if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
      }
    },
  };
}

/**
 * GET a page as text, with retries + timeout.
 * Returns null instead of throwing so one bad page never kills a crawl.
 *
 * `stats` 를 넘기면 성공/실패 횟수를 세어줍니다. 수집이 반쯤 실패한 채로
 * 배포되는 일을 막으려면 이 숫자가 필요합니다.
 */
async function fetchText(
  url,
  { retries = 3, timeout = 30000, referer, jar, stats, delayMs = 0 } = {}
) {
  if (delayMs) await sleep(delayMs);

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const cookie = jar?.header();
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'ko-KR,ko;q=0.9',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...(referer ? { Referer: referer } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      jar?.store(res.headers.getSetCookie?.() ?? res.headers.get('set-cookie'));

      const text = await res.text();
      if (!text || text.length < 500) throw new Error(`응답이 너무 짧음 (${text.length}b)`);

      if (stats) stats.ok += 1;
      return text;
    } catch (err) {
      if (attempt === retries) {
        if (stats) stats.failed += 1;
        console.warn(`  ! 요청 실패 (${url.slice(0, 90)}): ${err.message}`);
        return null;
      }
      // 지수 백오프 — 상대 서버가 순간적으로 막았을 때 바로 다시 두드리지 않습니다.
      await sleep(800 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

/** Run `worker` over `items` with a bounded number of parallel requests. */
async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

module.exports = { fetchText, mapPool, sleep, createCookieJar, UA };
