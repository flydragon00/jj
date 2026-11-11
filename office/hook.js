#!/usr/bin/env node
// Claude Code 훅: 이벤트 한 줄을 office/events.jsonl 에 덧붙인다.
// 사무실 화면이 꺼져 있어도 Claude 작업을 막지 않도록 항상 exit 0 으로 끝난다.
// 실패하면 stderr 와 office/hook-errors.log 에 남긴다 (stderr 는 Ctrl+O 화면에서만 보이므로).
const fs = require('fs');
const path = require('path');

const EVENTS = path.join(__dirname, 'events.jsonl');
const OLD_EVENTS = path.join(__dirname, 'events.old.jsonl');
const ERRORS = path.join(__dirname, 'hook-errors.log');
const ROTATE_BYTES = 512 * 1024;
const KIND = {
  SubagentStart: 'start',
  SubagentStop: 'stop',
  PostToolUse: 'beat', // 하위 에이전트가 도구를 쓸 때마다 "아직 일하는 중" 신호
  UserPromptSubmit: 'main_start',
  Stop: 'main_stop',
  SessionStart: 'session',
};

function fail(message) {
  const line = `[office] ${message}`;
  console.error(line);
  try {
    fs.appendFileSync(ERRORS, `${new Date().toISOString()} ${line}\n`);
  } catch (err) {
    console.error(`[office] 오류 기록도 실패: ${err.message}`);
  }
}

function rotateIfLarge() {
  let size;
  try {
    size = fs.statSync(EVENTS).size;
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
  // 이름 바꾸기는 한 번에 일어나므로, 동시에 쓰던 훅의 줄은 old 파일에 남고 서버가 둘 다 읽는다
  if (size > ROTATE_BYTES) fs.renameSync(EVENTS, OLD_EVENTS);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    if (!input || typeof input !== 'object') return fail(`훅 입력이 객체가 아니에요: ${raw.slice(0, 80)}`);
    const event = KIND[input.hook_event_name];
    if (!event) return fail(`모르는 훅 이벤트: ${input.hook_event_name}`);
    // 메인 대화의 도구 사용은 기록할 필요 없음 (agent_id 는 하위 에이전트 안에서만 있음)
    if (event === 'beat' && !input.agent_id) return;
    if ((event === 'start' || event === 'stop') && !input.agent_id) {
      return fail(`${input.hook_event_name} 에 agent_id 가 없어요. 훅 입력 형식이 바뀌었을 수 있어요.`);
    }
    const line = { t: Date.now(), event, session: input.session_id };
    if (input.agent_id) line.id = input.agent_id;
    if (input.agent_type) line.type = input.agent_type;
    if (input.source) line.source = input.source;
    rotateIfLarge();
    fs.appendFileSync(EVENTS, JSON.stringify(line) + '\n');
  } catch (err) {
    fail(`이벤트 기록 실패: ${err.message}`);
  }
});
