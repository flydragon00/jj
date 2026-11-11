// 사무실 서버가 꺼져 있으면 백그라운드로 켜고 브라우저를 연다.
// hook.js 가 세션 시작 때 부른다. 직접 실행해도 된다: node office/launch.js
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { codeVersion } = require('./version.js');

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
          const j = JSON.parse(body);
          if (typeof j.now !== 'number') return resolve('other');
          resolve(j.v === codeVersion() ? 'office' : { stale: true, pid: Number.isInteger(j.pid) ? j.pid : null });
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

// 옛 버전 서버는 pid 를 알려주지 않으므로 포트로 찾는다
function pidOnPort() {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8', windowsHide: true });
      const line = out.split('\n').find((l) => /LISTENING/.test(l) && new RegExp(`[:.]${PORT}\\s`).test(l));
      return line ? Number(line.trim().split(/\s+/).pop()) : null;
    }
    const out = execFileSync('lsof', ['-ti', `tcp:${PORT}`, '-sTCP:LISTEN'], { encoding: 'utf8' });
    return Number(out.trim().split('\n')[0]) || null;
  } catch (err) {
    console.error(`[office] 포트 ${PORT} 을 쓰는 프로세스를 찾지 못했어요: ${err.message}`);
    return null;
  }
}

async function stopStale(pid) {
  pid = pid || pidOnPort();
  if (!pid) throw new Error(`옛 버전 사무실 서버가 켜져 있는데 끌 수 없어요. 포트 ${PORT} 을 쓰는 node 를 직접 끄고 다시 실행하세요.`);
  process.kill(pid);
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if ((await probe()) === 'free') return;
  }
  throw new Error(`옛 버전 사무실 서버(pid ${pid})가 꺼지지 않았어요. 직접 끄고 다시 실행하세요.`);
}

async function ensureServer() {
  let state = await probe();
  if (state === 'office') return 'running';
  let restarted = false;
  if (state && state.stale) {
    await stopStale(state.pid);
    state = 'free';
    restarted = true;
  }
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
      // 다시 켠 경우엔 열려 있던 화면이 알아서 새로고침하므로 브라우저를 또 열지 않는다
      if (!restarted) openBrowser();
      return restarted ? 'restarted' : 'started';
    }
  }
  throw new Error(`서버가 2초 안에 켜지지 않았어요. ${LOG} 를 확인하세요.`);
}

// 켜져 있는 사무실 서버를 끈다: node office/launch.js --stop
async function stopServer() {
  const state = await probe();
  if (state === 'free') return 'not-running';
  if (state === 'other') throw new Error(`포트 ${PORT} 은 사무실 서버가 아닌 다른 프로그램이 쓰고 있어서 끄지 않았어요.`);
  let pid = state.stale ? state.pid : null;
  if (!pid) pid = pidOnPort();
  await stopStale(pid);
  return 'stopped';
}

if (require.main === module && process.argv.includes('--stop')) {
  stopServer()
    .then((r) => console.log(r === 'stopped' ? '사무실 서버를 껐어요.' : '사무실 서버가 켜져 있지 않아요.'))
    .catch((err) => {
      console.error(`[office] ${err.message}`);
      process.exit(1);
    });
} else if (require.main === module) {
  ensureServer()
    .then((r) => console.log({ running: '이미 켜져 있어요', started: '켰어요', restarted: '옛 버전 서버를 끄고 새로 켰어요' }[r] + `: ${URL_}`))
    .catch((err) => {
      console.error(`[office] ${err.message}`);
      process.exit(1);
    });
}

module.exports = { ensureServer };
