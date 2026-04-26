/**
 * GovMate Indexer - Background Service Worker (MV3)
 *
 * 5분마다 server 의 /api/indexing-queue/pull 을 호출해서
 * NAVER_MANUAL / DAUM_MANUAL 작업을 가져온 뒤,
 * 해당 작업을 처리할 탭(검색어드바이저 / 페이지등록) 으로 콘텐트 스크립트에 메시지로 위임한다.
 *
 * 처리 흐름:
 *   1) chrome.alarms 가 trigger
 *   2) options 에서 serverBase, secret 읽기
 *   3) GET /api/indexing-queue/pull?engine=NAVER_MANUAL&limit=3
 *   4) 받은 항목마다 적절한 탭을 열거나 활성화 → content script 가 자동 입력 + submit
 *   5) content script 가 결과를 다시 background 에 보고 → POST /result
 */

const ALARM_NAME = 'govmate-indexer-pull';
const PULL_INTERVAL_MIN = 5;
const ENGINES = ['NAVER_MANUAL', 'DAUM_MANUAL'];

const TARGET_URLS = {
  NAVER_MANUAL: 'https://searchadvisor.naver.com/console/board',
  DAUM_MANUAL: 'https://register.search.daum.net/index.daum',
};

// ---- 헬퍼 ----
async function getConfig() {
  const { serverBase, secret, enabled } = await chrome.storage.sync.get([
    'serverBase',
    'secret',
    'enabled',
  ]);
  return {
    serverBase: (serverBase || 'https://www.govmate.co.kr').replace(/\/$/, ''),
    secret: secret || '',
    enabled: enabled !== false,
  };
}

async function pullJobs(engine, limit = 3) {
  const { serverBase, secret } = await getConfig();
  if (!secret) throw new Error('INDEXING_QUEUE_SECRET 가 설정되지 않았습니다. 옵션에서 등록하세요.');
  const r = await fetch(`${serverBase}/api/indexing-queue/pull?engine=${engine}&limit=${limit}`, {
    method: 'GET',
    headers: { 'x-indexing-secret': secret },
  });
  const j = await r.json();
  if (!j.ok) throw new Error(`pull failed: ${JSON.stringify(j)}`);
  return j.items || [];
}

async function reportResult({ id, status, error, meta }) {
  const { serverBase, secret } = await getConfig();
  const r = await fetch(`${serverBase}/api/indexing-queue/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-indexing-secret': secret },
    body: JSON.stringify({ id, status, error: error || null, meta: meta || null }),
  });
  return r.json();
}

async function ensureTab(targetUrl) {
  const tabs = await chrome.tabs.query({ url: targetUrl + '*' });
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: false });
    return tabs[0];
  }
  return chrome.tabs.create({ url: targetUrl, active: false });
}

async function delegateJob(job) {
  const targetUrl = TARGET_URLS[job.engine];
  if (!targetUrl) {
    await reportResult({ id: job.id, status: 'FAILED', error: 'unknown engine ' + job.engine });
    return;
  }
  const tab = await ensureTab(targetUrl);

  // 탭이 완전히 로드될 때까지 잠깐 기다림
  await new Promise((res) => setTimeout(res, 2500));

  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'INDEX_REQUEST', job });
    if (res?.status) {
      await reportResult({ id: job.id, status: res.status, error: res.error, meta: res.meta });
    } else {
      await reportResult({ id: job.id, status: 'FAILED', error: 'no response from content script' });
    }
  } catch (e) {
    await reportResult({ id: job.id, status: 'FAILED', error: String(e?.message || e) });
  }
}

async function tick() {
  const { enabled } = await getConfig();
  if (!enabled) return;
  for (const engine of ENGINES) {
    try {
      const jobs = await pullJobs(engine, 3);
      for (const job of jobs) {
        await delegateJob(job);
        // 너무 빠르게 연속 처리하지 않도록 약간 쉼
        await new Promise((res) => setTimeout(res, 4000));
      }
    } catch (e) {
      console.warn('[govmate-indexer] tick error', engine, e);
    }
  }
}

// ---- 라이프사이클 ----
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: PULL_INTERVAL_MIN,
    delayInMinutes: 1,
  });
  console.log('[govmate-indexer] installed, alarm scheduled');
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) tick();
});

// 팝업에서 "지금 실행" 버튼 누르면 즉시 tick
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'RUN_NOW') {
    tick().then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (msg?.type === 'PING') {
    sendResponse({ ok: true });
    return true;
  }
});
