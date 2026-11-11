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

function fail(message) {
  const line = `[office] ${message}`;
  console.error(line);
  try {
    fs.appendFileSync(ERRORS, `${new Date().toISOString()} ${line}\n`);
  } catch (err) {
    console.error(`[office] 오류 기록도 실패: ${err.message}`);
  }
}

function clip(text, max) {
  if (typeof text !== 'string') return undefined;
  const t = text.trim();
  return t.length > max ? t.slice(0, max) + '…' : t;
}

// 도구 사용을 사무실 말풍선용 짧은 한국어 문장으로 바꾼다
function describeTool(name, input = {}) {
  const file = (p) => (typeof p === 'string' ? path.basename(p) : '');
  switch (name) {
    case 'Read': return `📖 ${file(input.file_path)} 읽는 중`;
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit': return `✏️ ${file(input.file_path || input.notebook_path)} 고치는 중`;
    case 'Write': return `📝 ${file(input.file_path)} 쓰는 중`;
    case 'Bash': return `💻 ${clip(input.description || input.command, 50)}`;
    case 'Grep': return `🔍 '${clip(input.pattern, 30)}' 찾는 중`;
    case 'Glob': return `🗂 ${clip(input.pattern, 30)} 둘러보는 중`;
    case 'WebFetch': {
      try { return `🌐 ${new URL(input.url).hostname} 보는 중`; } catch { return '🌐 웹페이지 보는 중'; }
    }
    case 'WebSearch': return `🌐 '${clip(input.query, 30)}' 검색 중`;
    case 'TodoWrite':
    case 'TaskCreate':
    case 'TaskUpdate': return '🗒 할 일 정리 중';
    default: return `🛠 ${name.replace(/^mcp__/, '').replace(/__/g, ' · ')} 쓰는 중`;
  }
}

function toLine(input) {
  const base = { t: Date.now(), session: input.session_id };
  if (input.agent_id) base.id = input.agent_id;
  if (input.agent_type) base.type = input.agent_type;
  switch (input.hook_event_name) {
    case 'SessionStart':
      return { ...base, event: 'session', source: input.source };
    case 'UserPromptSubmit':
      return { ...base, event: 'user', text: clip(input.prompt, 1000) };
    case 'Stop':
      return { ...base, event: 'main_stop', text: clip(input.last_assistant_message, 2000) };
    case 'SubagentStart':
    case 'SubagentStop':
      if (!input.agent_id) {
        fail(`${input.hook_event_name} 에 agent_id 가 없어요. 훅 입력 형식이 바뀌었을 수 있어요.`);
        return null;
      }
      return input.hook_event_name === 'SubagentStart'
        ? { ...base, event: 'start' }
        : { ...base, event: 'stop', text: clip(input.last_assistant_message, 600) };
    case 'PreToolUse': {
      const ti = input.tool_input || {};
      if (input.tool_name === 'Agent' || input.tool_name === 'Task') {
        return { ...base, event: 'handoff', to: ti.subagent_type || 'general-purpose', text: clip(ti.description || ti.prompt, 120) };
      }
      return { ...base, event: 'tool', tool: input.tool_name, text: describeTool(String(input.tool_name || '?'), ti) };
    }
    default:
      fail(`모르는 훅 이벤트: ${input.hook_event_name}`);
      return null;
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

if (require.main === module) {
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', async () => {
  try {
    const input = JSON.parse(raw);
    if (!input || typeof input !== 'object') return fail(`훅 입력이 객체가 아니에요: ${raw.slice(0, 80)}`);
    const line = toLine(input);
    if (!line) return;
    rotateIfLarge();
    fs.appendFileSync(EVENTS, JSON.stringify(line) + '\n');
    // 새로 시작하거나 이어서 열 때 사무실 서버를 자동으로 켠다
    if (line.event === 'session' && (line.source === 'startup' || line.source === 'resume')) {
      await require('./launch.js').ensureServer();
    }
  } catch (err) {
    fail(`이벤트 기록 실패: ${err.message}`);
  }
});
}

module.exports = { describeTool, toLine };
