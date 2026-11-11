#!/usr/bin/env node
// 2D 사무실 서버: index.html 과 GET /state 를 제공한다.
// 사용법: node office/server.js [포트]   (기본 4777)
const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = Number(process.argv[2] || process.env.OFFICE_PORT || 4777);
const FILES = ['events.old.jsonl', 'events.jsonl'].map((f) => path.join(__dirname, f));
const PAGE = path.join(__dirname, 'index.html');
// 하위 에이전트는 도구를 쓸 때마다 신호(beat)를 남긴다. 이 시간 동안 아무 신호가 없으면
// Esc 로 중단돼 끝 기록을 못 남긴 것으로 보고 화면에서 내린다.
const AGENT_STALE_MS = 15 * 60 * 1000;
const MAIN_STALE_MS = 60 * 60 * 1000;

function readEvents() {
  const events = [];
  for (const file of FILES) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw err;
    }
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      let e;
      try {
        e = JSON.parse(line);
      } catch {
        e = null;
      }
      if (!e || typeof e !== 'object' || typeof e.event !== 'string' || !Number.isFinite(e.t)) {
        console.warn(`[office] 이상한 줄 무시 (${path.basename(file)}): ${line.slice(0, 80)}`);
        continue;
      }
      events.push(e);
    }
  }
  return events.sort((a, b) => a.t - b.t);
}

function buildState(events, now) {
  const active = new Map();
  const mainBySession = new Map();
  for (const e of events) {
    if (e.event === 'start' && e.id) {
      active.set(e.id, { id: e.id, type: e.type || '?', since: e.t, seen: e.t, session: e.session });
    } else if (e.event === 'beat' && e.id) {
      // 시작 기록이 오래돼 정리됐어도, 신호가 오면 다시 자리에 앉힌다
      const a = active.get(e.id);
      if (a) a.seen = e.t;
      else if (e.type) active.set(e.id, { id: e.id, type: e.type, since: e.t, seen: e.t, session: e.session });
    } else if (e.event === 'stop' && e.id) {
      active.delete(e.id);
    } else if (e.event === 'main_start') {
      mainBySession.set(e.session, e.t);
    } else if (e.event === 'main_stop') {
      mainBySession.delete(e.session);
    } else if (e.event === 'session' && (e.source === 'startup' || e.source === 'clear')) {
      // 새로 시작하거나 /clear 했을 때만 그 세션의 남은 기록을 정리 (compact·resume 은 일하는 중일 수 있음)
      mainBySession.delete(e.session);
      for (const [id, a] of active) if (a.session === e.session) active.delete(id);
    }
  }
  const mainSince = [...mainBySession.values()].filter((t) => now - t < MAIN_STALE_MS);
  return {
    now,
    main: { busy: mainSince.length > 0, since: mainSince.length ? Math.min(...mainSince) : null },
    active: [...active.values()]
      .filter((a) => now - a.seen < AGENT_STALE_MS)
      .map(({ id, type, since }) => ({ id, type, since })),
    recent: events
      .filter((e) => e.event !== 'beat')
      .slice(-20)
      .reverse()
      .map(({ t, event, type, id }) => ({ t, event, type, id })),
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
