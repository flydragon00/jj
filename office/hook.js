#!/usr/bin/env node
// Claude Code 훅: 이벤트 한 줄을 office/events.jsonl 에 덧붙인다.
// 사무실 화면이 꺼져 있어도 Claude 작업을 막지 않도록 항상 exit 0, 실패는 stderr 로 알린다.
const fs = require('fs');
const path = require('path');

const EVENTS = path.join(__dirname, 'events.jsonl');
const KIND = {
  SubagentStart: 'start',
  SubagentStop: 'stop',
  UserPromptSubmit: 'main_start',
  Stop: 'main_stop',
  SessionStart: 'session',
};

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    const event = KIND[input.hook_event_name];
    if (!event) {
      console.error(`[office] 모르는 훅 이벤트: ${input.hook_event_name}`);
      return;
    }
    const line = { t: Date.now(), event, session: input.session_id };
    if (input.agent_id) line.id = input.agent_id;
    if (input.agent_type) line.type = input.agent_type;
    fs.appendFileSync(EVENTS, JSON.stringify(line) + '\n');
  } catch (err) {
    console.error(`[office] 이벤트 기록 실패: ${err.message}`);
  }
});
