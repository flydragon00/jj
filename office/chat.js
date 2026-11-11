// 사무실 화면에서 보낸 메시지를 Claude Code(`claude -p`)로 실행한다.
// 화면이 연 대화는 같은 세션으로 이어지고(--resume), 진행 상황은 평소처럼 훅이 기록한다.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const EVENTS = path.join(__dirname, 'events.jsonl');
const SESSION_FILE = path.join(__dirname, 'web-session.json');
const PROJECT_DIR = path.dirname(__dirname);
// 화면에서는 권한을 물어볼 수 없다. 기본은 "파일 수정만 자동 허용"이고, 그 밖에 허락이 필요한 일은 Claude가 못 했다고 답한다.
const PERMISSION_MODE = process.env.OFFICE_PERMISSION_MODE || 'acceptEdits';
const CLAUDE_CMD = process.env.OFFICE_CLAUDE_CMD || 'claude';
const SESSION_ID = /^[0-9a-f-]{8,64}$/i;

let running = null; // { since }

function loadSession() {
  try {
    const id = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')).session_id;
    return SESSION_ID.test(id) ? id : null;
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`[office] 이어갈 대화 정보를 못 읽었어요: ${err.message}`);
    return null;
  }
}

// 실패를 대화창에 보이게 남긴다 (조용히 넘어가지 않기)
function report(text) {
  console.error(`[office] ${text}`);
  try {
    fs.appendFileSync(EVENTS, JSON.stringify({ t: Date.now(), event: 'main_stop', session: 'office-web', text: `⚠️ ${text}` }) + '\n');
  } catch (err) {
    console.error(`[office] 대화창에 오류를 남기지 못했어요: ${err.message}`);
  }
}

function status() {
  return { busy: !!running, since: running ? running.since : null, mode: PERMISSION_MODE, resumable: !!loadSession() };
}

function send(text, { fresh = false } = {}) {
  if (running) return { ok: false, code: 409, error: '앞의 메시지를 아직 처리하는 중이에요.' };
  const args = ['-p', '--output-format', 'json', '--permission-mode', PERMISSION_MODE];
  const resume = fresh ? null : loadSession();
  if (resume) args.push('--resume', resume);
  // 메시지는 인자가 아니라 표준 입력으로 넘긴다 (Windows 에서 shell 로 실행해도 안전하게)
  const child = spawn(CLAUDE_CMD, args, { cwd: PROJECT_DIR, shell: process.platform === 'win32', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  running = { since: Date.now() };
  let out = '';
  let err = '';
  child.stdout.on('data', (c) => (out += c));
  child.stderr.on('data', (c) => (err = (err + c).slice(-2000)));
  child.on('error', (e) => {
    running = null;
    report(e.code === 'ENOENT' ? 'claude 명령을 찾을 수 없어요. Claude Code가 설치돼 있고 PATH에 있는지 확인하세요.' : `Claude를 실행하지 못했어요: ${e.message}`);
  });
  child.on('close', (code) => {
    if (!running) return; // error 이벤트에서 이미 처리
    running = null;
    let result = null;
    try {
      result = JSON.parse(out);
    } catch {
      /* 아래에서 실패로 처리 */
    }
    if (result && SESSION_ID.test(result.session_id || '')) {
      try {
        fs.writeFileSync(SESSION_FILE, JSON.stringify({ session_id: result.session_id }));
      } catch (e) {
        report(`대화를 이어갈 정보를 저장하지 못했어요: ${e.message}`);
      }
    }
    if (code !== 0 || !result || result.is_error) {
      const why = (result && typeof result.result === 'string' && result.result) || err.trim() || out.trim().slice(-500) || '출력 없음';
      report(`Claude 실행이 실패했어요 (종료 코드 ${code}): ${why.slice(0, 600)}`);
    }
  });
  child.stdin.on('error', (e) => report(`메시지를 Claude에 넘기지 못했어요: ${e.message}`));
  child.stdin.end(text);
  return { ok: true };
}

module.exports = { send, status };
