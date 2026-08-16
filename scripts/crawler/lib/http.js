const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * GET a page as text, with retries + timeout.
 * Returns null instead of throwing so one bad page never kills a crawl.
 */
async function fetchText(url, { retries = 2, timeout = 25000, referer } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'ko-KR,ko;q=0.9',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...(referer ? { Referer: referer } : {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === retries) {
        console.warn(`  ! 요청 실패 (${url.slice(0, 90)}): ${err.message}`);
        return null;
      }
      await sleep(600 * (attempt + 1));
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

module.exports = { fetchText, mapPool, sleep, UA };
