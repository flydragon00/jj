# 🏢 AI 팀 2D 사무실

Claude Code가 직원(하위 에이전트)을 부르면 그 직원 책상에 불이 켜지고, 일이 끝나면 꺼지는 실시간 사무실 화면이에요.

## 켜는 법 (내 PC)

1. 이 레포 폴더에서 서버를 켜요 (Node.js 18 이상 필요).

   ```bash
   node office/server.js
   ```

2. 브라우저에서 http://localhost:4777 을 열어요.
3. 같은 레포에서 Claude Code를 열고 평소처럼 "탐색가한테 ~ 조사해줘"처럼 일을 시키면 화면에 바로 나타나요.

포트를 바꾸려면 `node office/server.js 5000` 처럼 뒤에 번호를 붙이세요.

## 어떻게 연결되나

```
Claude Code 훅 ──(이벤트 한 줄)──▶ office/events.jsonl ──▶ server.js /state ──(1초마다)──▶ index.html
```

- `.claude/settings.json` 의 훅이 아래 순간마다 `office/hook.js` 를 실행해요.
  - `SubagentStart` / `SubagentStop`: 직원 출근·퇴근
  - `PostToolUse`: 직원이 도구를 쓸 때마다 "아직 일하는 중" 신호 (메인 대화의 도구 사용은 기록하지 않음)
  - `UserPromptSubmit` / `Stop`: 쿠리만쥬(메인 대화) 작업 시작·끝
  - `SessionStart` (새로 시작·`/clear` 때만): 그 세션에 남아 있던 기록 정리
- `events.jsonl` 은 512KB가 넘으면 `events.old.jsonl` 로 넘어가고, 서버는 둘 다 읽어요. 둘 다 git에 올라가지 않아요.
- Esc로 중단하면 퇴근 기록이 안 남아요. 그래서 15분 동안 아무 신호가 없는 직원은 끊긴 것으로 보고 화면에서 내려요 (쿠리만쥬는 다음 질문을 보내면 바로 맞춰져요).
  - 주의: 도구 신호는 하위 에이전트 안의 훅 입력에 `agent_id` 가 들어온다는 전제로 만들었어요. 아직 실제 세션으로 확인하지 못했어요. 15분 넘게 일하는 직원이 화면에서 사라지면 이 신호가 안 들어오는 거예요.

## 문제가 생기면

- 화면 위에 "서버 연결 안 됨"이 뜨면 서버가 꺼진 거예요. 1번 명령으로 다시 켜세요. 서버 없이도 "데모 보기"로 화면은 볼 수 있어요.
- "서버 오류 — 서버 터미널을 확인하세요"가 뜨면 서버는 켜져 있지만 기록을 못 읽은 거예요. 서버를 켠 터미널의 `[office]` 메시지를 보세요.
- 직원을 불렀는데 화면이 그대로면 `office/hook-errors.log` 를 열어 보세요. 훅이 실패해도 Claude 작업은 멈추지 않는 대신 거기에 이유를 남겨요 (Claude Code 화면에서는 Ctrl+O 를 눌러야 보여요).
- 훅 설정은 Claude Code를 새로 시작해야 적용돼요.

## 직원 목록

| 별명 | 에이전트 |
|---|---|
| 🌰 쿠리만쥬 | 메인 대화 |
| 🐱 하치와레 | orchestrator |
| 🔭 탐색가 | Explore |
| 📐 설계자 | Plan |
| 🐹 치이카와 | general-purpose |
| 🦁 시사 | precise-fixer |
| 🧐 코드리뷰어 | pr-review-toolkit:code-reviewer |
| 🦦 랏코 | pr-review-toolkit:silent-failure-hunter |
| 🧪 테스트분석가 | pr-review-toolkit:pr-test-analyzer |
| 🐰 우사기 | pr-review-toolkit:code-simplifier |
| 🐿 모몽가 | designer |
| 🎬 미디어팀 | media |
| 📚 후루혼야 | librarian |
| 🛡 갑옷씨 | ops |
| 🥷 외부용병 | second-opinion |

목록에 없는 에이전트는 "손님석"에 이름 그대로 앉아요.
