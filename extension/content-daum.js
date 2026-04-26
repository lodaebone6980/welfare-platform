/**
 * Daum 페이지등록 자동입력 콘텐트 스크립트
 *
 * 대상 페이지: https://register.search.daum.net/index.daum
 *
 * Daum 페이지등록은 단순 form (name="url") 이라 비교적 안정적이지만
 * 캡차가 동반되는 경우가 잦으므로 캡차 감지 시 사용자에게 위임한다.
 */

console.log('[govmate-indexer/daum] content script loaded');

function $(sel) {
  return document.querySelector(sel);
}
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function submitOne(url) {
  // 1) URL input
  const input =
    document.querySelector('input[name="url"]') ||
    document.querySelector('input[placeholder*="URL"]') ||
    document.querySelector('input[type="text"]');
  if (!input) return { status: 'FAILED', error: 'URL input not found' };

  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, url);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  await sleep(400);

  // 2) 캡차 존재 여부 사전 확인
  const captcha =
    document.querySelector('img[src*="captcha"]') ||
    document.querySelector('iframe[src*="recaptcha"]') ||
    document.querySelector('.g-recaptcha');
  if (captcha) {
    return {
      status: 'CAPTCHA',
      error: '캡차가 있습니다. 직접 풀어주신 뒤 다음 풀링에 자동 진행됩니다.',
    };
  }

  // 3) 제출 버튼 클릭
  const submitBtn =
    document.querySelector('button[type="submit"]') ||
    document.querySelector('input[type="submit"]') ||
    Array.from(document.querySelectorAll('button')).find((b) =>
      /등록|제출|확인/.test(b.innerText || '')
    );
  if (!submitBtn) return { status: 'FAILED', error: '제출 버튼 없음' };
  submitBtn.click();

  await sleep(2500);

  const bodyText = document.body.innerText || '';
  if (/자동입력|보안문자|reCAPTCHA/i.test(bodyText)) {
    return { status: 'CAPTCHA', error: '제출 후 캡차 등장' };
  }
  if (/이미\s*등록|이미\s*수집/i.test(bodyText)) {
    return { status: 'SKIPPED', error: '이미 등록된 URL' };
  }
  if (/등록되었|완료|성공|접수/i.test(bodyText)) {
    return { status: 'SUCCESS' };
  }
  return { status: 'FAILED', error: '결과 텍스트를 인식하지 못했습니다.' };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'INDEX_REQUEST') return;
  if (msg.job.engine !== 'DAUM_MANUAL') return;
  (async () => {
    try {
      const r = await submitOne(msg.job.url);
      sendResponse(r);
    } catch (e) {
      sendResponse({ status: 'FAILED', error: String(e?.message || e) });
    }
  })();
  return true;
});
