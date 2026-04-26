async function init() {
  const { serverBase, secret, enabled } = await chrome.storage.sync.get([
    'serverBase',
    'secret',
    'enabled',
  ]);
  document.getElementById('server').textContent = '서버: ' + (serverBase || '(미설정)');
  document.getElementById('status').textContent =
    '상태: ' + (enabled !== false ? '활성' : '비활성') + (secret ? ' (시크릿OK)' : ' (시크릿없음)');
}
init();

document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('runNow').addEventListener('click', async () => {
  const msg = document.getElementById('msg');
  msg.textContent = '실행 중…';
  try {
    const r = await chrome.runtime.sendMessage({ type: 'RUN_NOW' });
    msg.textContent = r?.ok ? '완료. 다음 자동 풀링은 5분 뒤.' : '실패: ' + (r?.error || '');
  } catch (e) {
    msg.textContent = '오류: ' + e.message;
  }
});
