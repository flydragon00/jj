#!/usr/bin/env node
// 사무실 점검: node office/doctor.js  → 나온 내용을 그대로 붙여 주세요.
const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.dirname(__dirname);
const PORT = Number(process.env.OFFICE_PORT || 4777);
const IMG = /\.(png|jpe?g|webp|gif)$/i;
const say = (k, v) => console.log(`${k}: ${v}`);

function git(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (err) {
    return `(git 실패: ${err.message.split('\n')[0]})`;
  }
}
function list(dir) {
  try {
    return fs.readdirSync(dir);
  } catch (err) {
    return err.code === 'ENOENT' ? null : [`(읽기 실패: ${err.message})`];
  }
}
function get(p) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}${p}`, { timeout: 1500 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (err) => resolve({ error: err.code || err.message }));
  });
}

(async () => {
  say('OS / node', `${process.platform} / ${process.version}`);
  say('폴더', ROOT);
  say('코드 버전', git(['log', '--oneline', '-1']));
  say('브랜치', git(['rev-parse', '--abbrev-ref', 'HEAD']));
  say('안 올린 수정', git(['status', '--short']).replace(/\n/g, ' | ') || '없음');

  const av = list(path.join(__dirname, 'avatars'));
  say('office/avatars 폴더', av === null ? '없음' : av.length ? av.join(', ') : '비어 있음');
  const rootAll = list(ROOT) || [];
  say('jj 폴더의 이미지', rootAll.filter((f) => IMG.test(f)).join(', ') || '없음');
  say('jj 폴더의 다른 파일', rootAll.filter((f) => !IMG.test(f) && !f.startsWith('.')).join(', '));

  const localV = require('./version.js').codeVersion();
  const st = await get('/state');
  if (st.error) say('서버', `꺼져 있음 (${st.error}) → node office/launch.js 로 켜세요`);
  else {
    let v = '(없음)';
    try { v = JSON.parse(st.body).v || '(없음: 옛 버전)'; } catch { v = '(응답이 JSON 아님)'; }
    say('서버', `켜져 있음, 버전 ${v} / 내 코드 ${localV} → ${v === localV ? '최신' : '옛 버전! node office/launch.js 로 다시 켜세요'}`);
    const a = await get('/avatars.json');
    if (a.error || a.status !== 200) say('avatars.json', `못 읽음 (${a.error || a.status})`);
    else {
      try {
        const j = JSON.parse(a.body);
        say('서버가 고른 이미지', `${j.image} (찾은 이미지 ${j.found === undefined ? '정보 없음: 옛 서버' : j.found + '개'})`);
        const img = await get('/' + j.image);
        say('이미지 응답', img.error || `${img.status}, ${img.body ? img.body.length : 0}자`);
      } catch (err) {
        say('avatars.json', `해석 실패: ${err.message}`);
      }
    }
  }
  for (const f of ['hook-errors.log', 'server.log']) {
    try {
      say(f, '\n' + fs.readFileSync(path.join(__dirname, f), 'utf8').trim().split('\n').slice(-5).join('\n'));
    } catch (err) {
      say(f, err.code === 'ENOENT' ? '없음' : `읽기 실패: ${err.message}`);
    }
  }
})();
