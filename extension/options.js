async function load() {
  const { serverBase, secret, enabled } = await chrome.storage.sync.get([
    'serverBase',
    'secret',
    'enabled',
  ]);
  document.getElementById('serverBase').value = serverBase || 'https://www.govmate.co.kr';
  document.getElementById('secret').value = secret || '';
  document.getElementById('enabled').checked = enabled !== false;
}
load();

document.getElementById('save').addEventListener('click', async () => {
  const serverBase = document.getElementById('serverBase').value.trim().replace(/\/$/, '');
  const secret = document.getElementById('secret').value.trim();
  const enabled = document.getElementById('enabled').checked;
  await chrome.storage.sync.set({ serverBase, secret, enabled });
  document.getElementById('msg').innerHTML = '<span class="ok">저장되었습니다.</span>';
});

document.getElementById('test').addEventListener('click', async () => {
  const msg = document.getElementById('msg');
  msg.textContent = '테스트 중…';
  const serverBase = document.getElementById('serverBase').value.trim().replace(/\/$/, '');
  const secret = document.getElementById('secret').value.trim();
  try {
    const r = await fetch(`${serverBase}/api/indexing-queue/pull?engine=NAVER_MANUAL&limit=1`, {
      headers: { 'x-indexing-secret': secret },
    });
    const j = await r.json();
    if (r.ok && j.ok) {
      msg.innerHTML = `<span class="ok">연결 OK. 오늘 ${j.consumedToday || 0}/${j.dailyLimit || 0}건 사용.</span>`;
    } else {
      msg.innerHTML = `<span class="err">실패: ${JSON.stringify(j)}</span>`;
    }
  } catch (e) {
    msg.innerHTML = `<span class="err">오류: ${e.message}</span>`;
  }
});
