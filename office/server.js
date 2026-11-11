#!/usr/bin/env node
// 2D 사무실 서버: index.html 과 GET /state 를 제공한다.
// 사용법: node office/server.js [포트]   (기본 4777)
const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const chat = require('./chat.js');
const VERSION = require('./version.js').codeVersion(); // 켜질 때의 코드 지문

const PORT = Number(process.argv[2] || process.env.OFFICE_PORT || 4777);
const FILES = ['events.old.jsonl', 'events.jsonl'].map((f) => path.join(__dirname, f));
const PAGE = path.join(__dirname, 'index.html');
// 다른 웹사이트가 몰래 메시지를 보내지 못하게, 이 페이지에만 심어 주는 일회용 열쇠
const TOKEN = crypto.randomBytes(24).toString('hex');
const MAX_MESSAGE = 8000;
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
  const mainBySession = new Map(); // session -> { since, doing }
  for (const e of events) {
    const agent = e.id ? active.get(e.id) : null;
    switch (e.event) {
      case 'start':
        if (e.id) active.set(e.id, { id: e.id, type: e.type || '?', since: e.t, seen: e.t, doing: null, session: e.session });
        break;
      case 'tool':
      case 'handoff':
      case 'beat':
        if (e.id) {
          // 시작 기록이 정리됐어도 도구를 쓰고 있으면 다시 자리에 앉힌다
          let a = agent;
          if (!a && e.type) {
            a = { id: e.id, type: e.type, since: e.t, seen: e.t, doing: null, session: e.session };
            active.set(e.id, a);
          }
          if (a) {
            a.seen = e.t;
            if (e.event === 'tool') a.doing = e.text || null;
          }
        } else if (mainBySession.has(e.session)) {
          const m = mainBySession.get(e.session);
          if (e.event === 'tool') m.doing = e.text || null;
          if (e.event === 'handoff') m.doing = '📨 일 맡기고 기다리는 중';
        }
        break;
      case 'stop':
        if (e.id) active.delete(e.id);
        break;
      case 'user':
      case 'main_start':
        mainBySession.set(e.session, { since: e.t, doing: null });
        break;
      case 'main_stop':
        mainBySession.delete(e.session);
        break;
      case 'session':
        // 새로 시작하거나 /clear 했을 때만 그 세션의 남은 기록을 정리 (compact·resume 은 일하는 중일 수 있음)
        if (e.source === 'startup' || e.source === 'clear') {
          mainBySession.delete(e.session);
          for (const [id, a] of active) if (a.session === e.session) active.delete(id);
        }
        break;
    }
  }
  const mains = [...mainBySession.values()].filter((m) => now - m.since < MAIN_STALE_MS).sort((a, b) => a.since - b.since);
  const lastProject = [...events].reverse().find((e) => typeof e.project === 'string');
  return {
    now,
    project: lastProject ? lastProject.project : null,
    main: { busy: mains.length > 0, since: mains.length ? mains[0].since : null, doing: mains.length ? mains[mains.length - 1].doing : null },
    active: [...active.values()]
      .filter((a) => now - a.seen < AGENT_STALE_MS)
      .map(({ id, type, since, doing }) => ({ id, type, since, doing })),
    recent: events
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.event !== 'beat' && e.event !== 'main_start')
      // 대화창에는 새로 시작·/clear 만 구분선으로 보여준다
      .filter(({ e }) => e.event !== 'session' || e.source === 'startup' || e.source === 'clear')
      .slice(-80)
      .map(({ e, i }) => {
        const out = { k: `${e.t}-${i}`, t: e.t, event: e.event === 'main_stop' && e.text ? 'assistant' : e.event };
        for (const f of ['id', 'type', 'to', 'text']) if (e[f] != null) out[f] = e[f];
        return out;
      }),
  };
}

function reply(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(obj));
}

function handleSend(req, res) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (req.headers['x-office-token'] !== TOKEN || (origin && origin !== `http://${host}`)) {
    return reply(res, 403, { error: '이 페이지에서 보낸 요청이 아니에요. 화면을 새로고침한 뒤 다시 보내세요.' });
  }
  let raw = '';
  req.setEncoding('utf8');
  req.on('data', (c) => {
    raw += c;
    if (raw.length > MAX_MESSAGE * 4) req.destroy();
  });
  req.on('end', () => {
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return reply(res, 400, { error: '요청 형식이 잘못됐어요.' });
    }
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return reply(res, 400, { error: '빈 메시지는 보낼 수 없어요.' });
    if (text.length > MAX_MESSAGE) return reply(res, 400, { error: `메시지가 너무 길어요 (최대 ${MAX_MESSAGE}자).` });
    const r = chat.send(text, { fresh: body.fresh === true });
    if (!r.ok) return reply(res, r.code, { error: r.error });
    reply(res, 202, { ok: true });
  });
}

// 화면이 30분 동안 한 번도 묻지 않으면 (탭을 닫았으면) 스스로 꺼진다. 다음 세션 시작 때 다시 켜진다.
const IDLE_EXIT_MS = 30 * 60 * 1000;
let lastPoll = Date.now();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/state') {
      lastPoll = Date.now();
      const body = JSON.stringify({ ...buildState(readEvents(), Date.now()), web: chat.status(), v: VERSION, pid: process.pid });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(body);
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = fs.readFileSync(PAGE, 'utf8').replace('</head>', `<meta name="office-token" content="${TOKEN}"></head>`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    if (url.pathname === '/avatars.json') {
      const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'avatars.json'), 'utf8'));
      // 정해 둔 이름(sheet.png)이 없으면 avatars 폴더의 첫 이미지를 쓴다 (다른 이름으로 저장해도 되게)
      const dir = path.join(__dirname, 'avatars');
      let found = [];
      try {
        found = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f)).sort();
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      const wanted = path.basename(String(cfg.image || ''));
      if (!found.includes(wanted) && found.length) cfg.image = 'avatars/' + encodeURIComponent(found[0]);
      cfg.found = found.length; // 화면이 "이미지가 없어요" 를 알려줄 수 있게
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(cfg));
    }
    // 내 PC에만 두는 캐릭터 이미지 (office/avatars/ 바로 아래 파일만)
    const av = /^\/avatars\/([^/\\]+\.(png|jpe?g|webp|gif))$/i.exec(decodeURIComponent(url.pathname));
    if (av && !av[1].includes('..')) {
      let img;
      try {
        img = fs.readFileSync(path.join(__dirname, 'avatars', av[1]));
      } catch (err) {
        if (err.code === 'ENOENT') return res.writeHead(404).end('not found');
        throw err;
      }
      const ext = av[2].toLowerCase();
      const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      return res.end(img);
    }
    if (url.pathname === '/send' && req.method === 'POST') return handleSend(req, res);
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
  setInterval(() => {
    if (!chat.status().busy && Date.now() - lastPoll > IDLE_EXIT_MS) {
      console.log('[office] 30분 동안 화면이 열려 있지 않아 서버를 끕니다.');
      process.exit(0);
    }
  }, 60 * 1000).unref();
}

module.exports = { buildState };
