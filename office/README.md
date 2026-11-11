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
  - `UserPromptSubmit` / `Stop`: 쿠리만쥬(메인 대화) 작업 시작·끝
  - `SessionStart`: 새 세션이면 남아 있던 기록 정리
- `events.jsonl` 은 git에 올라가지 않아요 (`.gitignore`).
- 끝 기록 없이 1시간이 지난 작업은 끊긴 것으로 보고 화면에서 내려요.

## 문제가 생기면

- 화면 위에 "서버 연결 안 됨"이 뜨면 서버가 꺼진 거예요. 1번 명령으로 다시 켜세요. 서버 없이도 "데모 보기"로 화면은 볼 수 있어요.
- 직원을 불렀는데 화면이 그대로면 Claude Code 화면에 `[office] ...` 오류가 찍혔는지 보세요. 훅이 실패해도 Claude 작업은 멈추지 않아요.
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
