/**
 * Naver 검색어드바이저 자동입력 콘텐트 스크립트
 *
 * 대상 페이지: https://searchadvisor.naver.com/console/board
 *
 * UI 구조는 네이버 측 변경에 따라 변할 수 있으므로 다음 셀렉터들을 차례대로 시도하고
 * 한 번이라도 실패하면 사용자가 직접 처리할 수 있도록 status='CAPTCHA' 또는 'FAILED' 로 회신한다.
 */

console.log('[govmate-indexer/naver] content script loaded');

// 자주 쓰는 헬퍼
function $(sel, root = document) {
  return root.querySelector(sel);
}
function waitFor(sel, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const el = $(sel);
      if (el) return resolve(el);
      if (Date.now() - start > timeoutMs) return resolve(null);
      requestAnimationFrame(tick);
    };
    tick();
  });
}
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * 한 URL 색인 요청 시도.
 * 성공/실패 여부를 status 로 반환.
 *
 * 참고: 네이버 검색어드바이저는 SPA + 사이트 선택이 필요해서
 * 사용자가 govmate.co.kr 사이트를 미리 콘솔에서 선택해 둔 상태여야 합니다.
 */
async function submitOne(url) {
  // 1) URL 입력칸 후보 (네이버는 react 기반이라 placeholder 텍스트 기준으로 잡는다)
  const inputCandidates = [
    'input[placeholder*="URL"]',
    'input[placeholder*="페이지"]',
    'input[type="text"][maxlength]',
  ];
  let input = null;
  for (const sel of inputCandidates) {
    input = await waitFor(sel, 3000);
    if (input) break;
  }
  if (!input) {
    return {
      status: 'FAILED',
      error: 'URL 입력칸을 찾지 못했습니다. govmate.co.kr 사이트가 선택돼 있는지 확인하세요.',
    };
  }

  // 2) 값 입력 (React 컨트롤드 인풋 호환을 위해 native setter 사용)
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, url);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  await sleep(400);

  // 3) "확인" 또는 "제출" 또는 "수집요청" 버튼
  const buttons = Array.from(document.querySelectorAll('button')).filter(
    (b) =>
      /확인|제출|수집요청|요청|등록/.test(b.innerText || '') &&
      !b.disabled &&
      b.offsetParent !== null
  );
  if (buttons.length === 0) {
    return { status: 'FAILED', error: '제출 버튼을 찾지 못했습니다.' };
  }
  buttons[0].click();

  // 4) 응답 대기 (성공 메시지 / 캡차 / 실패 메시지)
  await sleep(2500);

  const bodyText = document.body.innerText || '';
  if (/자동입력|보안문자|reCAPTCHA|로봇이 아닙니다/i.test(bodyText)) {
    return { status: 'CAPTCHA', error: '캡차가 표시되었습니다. 직접 풀어주세요.' };
  }
  if (/일일\s*요청\s*한도|요청 한도|초과/i.test(bodyText)) {
    return { status: 'RATE_LIMITED', error: '네이버 일일 한도 초과로 확인됩니다.' };
  }
  if (/완료|등록되었|성공|요청되었/i.test(bodyText)) {
    return { status: 'SUCCESS' };
  }
  // 디폴트: 가시적인 에러 메시지를 못 잡았으면 일단 FAILED 로 두되 사용자가 사이트에서 확인 가능
  return { status: 'FAILED', error: '결과 텍스트를 인식하지 못했습니다. 페이지에서 확인 필요.' };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'INDEX_REQUEST') return;
  if (msg.job.engine !== 'NAVER_MANUAL') return;
  (async () => {
    try {
      const r = await submitOne(msg.job.url);
      sendResponse(r);
    } catch (e) {
      sendResponse({ status: 'FAILED', error: String(e?.message || e) });
    }
  })();
  return true; // async
});
