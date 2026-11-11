#!/usr/bin/env node
// 2D 사무실 서버: index.html 과 GET /state 를 제공한다.
// 사용법: node office/server.js [포트]   (기본 4777)
const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = Number(process.argv[2] || process.env.OFFICE_PORT || 4777);
const EVENTS = path.join(__dirname, 'events.jsonl');
const PAGE = path.join(__dirname, 'index.html');
const STALE_MS = 60 * 60 * 1000; // 끝 기록 없이 1시간 지난 작업은 끊긴 것으로 본다
const MAX_BYTES = 512 * 1024;    // 이보다 커지면 오래된 줄을 잘라낸다

function readEvents() {
  let text;
  try {
    text = fs.readFileSync(EVENTS, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  if (text.length > MAX_BYTES) {
    text = text.slice(text.indexOf('\n', text.length - MAX_BYTES / 2) + 1);
    fs.writeFileSync(EVENTS, text);
  }
  const events = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      console.warn(`[office] 깨진 줄 무시: ${line.slice(0, 80)}`);
    }
  }
  return events;
}

function buildState(events, now) {
  const active = new Map();
  const mainBySession = new Map();
  for (const e of events) {
    if (e.event === 'start' && e.id) active.set(e.id, { id: e.id, type: e.type || '?', since: e.t, session: e.session });
    else if (e.event === 'stop' && e.id) active.delete(e.id);
    else if (e.event === 'main_start') mainBySession.set(e.session, e.t);
    else if (e.event === 'main_stop') mainBySession.delete(e.session);
    else if (e.event === 'session') {
      // 새 세션 시작: 같은 세션에 남아 있던 기록은 정리
      mainBySession.delete(e.session);
      for (const [id, a] of active) if (a.session === e.session) active.delete(id);
    }
  }
  const fresh = (t) => now - t < STALE_MS;
  const mainSince = [...mainBySession.values()].filter(fresh);
  return {
    now,
    main: { busy: mainSince.length > 0, since: mainSince.length ? Math.min(...mainSince) : null },
    active: [...active.values()].filter((a) => fresh(a.since)).map(({ id, type, since }) => ({ id, type, since })),
    recent: events.slice(-20).reverse().map(({ t, event, type, id }) => ({ t, event, type, id })),
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/state') {
      const body = JSON.stringify(buildState(readEvents(), Date.now()));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(body);
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = fs.readFileSync(PAGE);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    res.writeHead(404).end('not found');
  } catch (err) {
    console.error(`[office] 요청 처리 실패 ${url.pathname}:`, err);
    if (res.headersSent) return res.destroy(err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`서버 오류: ${err.message}`);
  }
});

if (require.main === module) {
server.on('error', (err) => {
  console.error(`[office] 서버를 켤 수 없습니다 (포트 ${PORT}): ${err.message}`);
  process.exit(1);
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`🏢 AI 팀 사무실: http://localhost:${PORT}`);
});

}

module.exports = { buildState };
