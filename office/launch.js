// 사무실 서버가 꺼져 있으면 백그라운드로 켜고 브라우저를 연다.
// hook.js 가 세션 시작 때 부른다. 직접 실행해도 된다: node office/launch.js
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const PORT = Number(process.env.OFFICE_PORT || 4777);
const URL_ = `http://localhost:${PORT}`;
const LOG = path.join(__dirname, 'server.log');

// 'office' = 우리 서버가 응답, 'free' = 아무도 안 씀, 'other' = 다른 프로그램이 포트를 씀
function probe() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}/state`, { timeout: 800 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve(typeof JSON.parse(body).now === 'number' ? 'office' : 'other');
        } catch {
          // 500 등 우리 서버의 오류 응답도 "켜져 있음"으로 본다
          resolve(body.startsWith('서버 오류') ? 'office' : 'other');
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (err) => resolve(err.code === 'ECONNREFUSED' ? 'free' : 'other'));
  });
}

function openBrowser() {
  if (process.env.OFFICE_NO_OPEN === '1') return;
  const [cmd, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '', URL_]]
    : process.platform === 'darwin' ? ['open', [URL_]]
    : ['xdg-open', [URL_]];
  const child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.on('error', (err) => console.error(`[office] 브라우저를 못 열었어요. 직접 ${URL_} 을 여세요: ${err.message}`));
  child.unref();
}

async function ensureServer() {
  const state = await probe();
  if (state === 'office') return 'running';
  if (state === 'other') {
    throw new Error(`포트 ${PORT} 을 다른 프로그램이 쓰고 있어요. OFFICE_PORT 환경변수로 다른 번호를 지정하세요.`);
  }
  const out = fs.openSync(LOG, 'a');
  const child = spawn(process.execPath, [path.join(__dirname, 'server.js'), String(PORT)], {
    detached: true,
    stdio: ['ignore', out, out],
    windowsHide: true,
  });
  child.unref();
  fs.closeSync(out);
  // 서버가 실제로 떴는지 확인하고, 안 떴으면 크게 알린다
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if ((await probe()) === 'office') {
      openBrowser();
      return 'started';
    }
  }
  throw new Error(`서버가 2초 안에 켜지지 않았어요. ${LOG} 를 확인하세요.`);
}

if (require.main === module) {
  ensureServer()
    .then((r) => console.log(r === 'running' ? `이미 켜져 있어요: ${URL_}` : `켰어요: ${URL_}`))
    .catch((err) => {
      console.error(`[office] ${err.message}`);
      process.exit(1);
    });
}

module.exports = { ensureServer };
