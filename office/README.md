# 🏢 AI 팀 2D 사무실

Claude Code와 대화하면 사무실 화면에서 직원들이 걸어 다니며 일을 주고받고, 오른쪽 대화창에 내 질문·Claude 답변·도구 사용이 실시간으로 쌓여요. 터미널을 따로 볼 필요 없이 이 화면 하나로 지켜볼 수 있어요.

## 켜는 법

이 레포 폴더에서 Claude Code를 켜기만 하면 돼요 (Node.js 18 이상 필요).

```bash
claude
```

- 세션이 시작될 때 사무실 서버가 꺼져 있으면 저절로 켜지고, 브라우저에 http://localhost:4777 이 열려요.
- 이미 켜져 있으면 브라우저를 다시 열지 않아요. 탭을 닫았다면 주소를 직접 여세요.
- 화면을 30분 동안 아무도 안 보면 서버는 스스로 꺼지고, 다음 세션 때 다시 켜져요.
- 처음 켤 때 Claude Code가 이 폴더 설정(훅)을 믿을지 물어보면 허용해야 동작해요.

직접 켜고 싶을 때:

```bash
node office/launch.js
```

포트를 바꾸려면 환경변수 `OFFICE_PORT=5000`, 브라우저 자동 열기를 끄려면 `OFFICE_NO_OPEN=1` 을 쓰세요.

## 화면에 나오는 것

- **사무실**: 쉬는 직원은 라운지를 어슬렁거리고, 일을 받으면 자기 책상으로 걸어가요. 머리 위 말풍선에 지금 하는 일("📖 server.js 읽는 중")이 떠요. 일을 맡기면 서류가 날아가고, 끝나면 결과 서류를 돌려줘요.
- **대화창**: 내 질문, 쿠리만쥬(Claude) 답변, 도구 사용, 일 맡기기, 출근·퇴근 기록. 위쪽 칩으로 "대화만" 볼 수도 있어요.

## 화면에서 바로 대화하기

대화창 아래 입력창에 쓰고 Enter를 누르면 서버가 이 폴더에서 Claude Code(`claude -p`)를 실행해요. 진행 상황과 답변은 사무실과 대화창에 그대로 나와요.

- 화면에서 시작한 대화는 다음 메시지에서 이어져요. 새로 시작하려면 "새 대화"를 누르고 보내세요.
- 터미널에서 따로 켠 Claude Code 대화와는 별개의 대화예요 (둘 다 화면에는 보여요).
- 화면에서는 허락을 물어볼 수 없어요. 기본은 **파일 수정만 자동 허용**(`acceptEdits`)이고, 허락이 필요한 명령 실행 등은 Claude가 못 했다고 답해요. 바꾸려면 서버를 켜기 전에 환경변수 `OFFICE_PERMISSION_MODE` 를 지정하세요 (`default` 는 수정도 막음).
- 한 번에 메시지 하나만 처리해요. 답이 올 때까지 보내기 버튼이 잠겨요.
- 이 PC에서 연 화면만 보낼 수 있어요. 서버는 내 PC 안에서만 접속되고, 다른 웹사이트가 몰래 보내지 못하게 화면마다 열쇠를 확인해요.

## 캐릭터를 내 이미지로 바꾸기

`office/avatars/` 폴더에 이미지를 넣으면 직원 캐릭터가 그 이미지로 바뀌어요. 이 폴더는 git에 올라가지 않아서 내 PC에서만 쓰여요.

1. 캐릭터 15개가 가로 5칸 × 세로 3줄로 놓인 이미지를 `office/avatars/sheet.png` 로 저장하세요 (폴더가 없으면 만드세요).
2. 화면을 새로고침하면 적용돼요. 이미지가 없으면 기본 마스코트가 나와요.

어느 칸을 어느 직원에게 쓸지, 칸의 위치는 `office/avatars.json` 에서 바꿀 수 있어요.

- `staff`: 직원 → 칸 번호 (왼쪽 위가 1, 오른쪽으로 번호가 늘어요)
- `cells`: 칸마다 `[x, y, 너비, 높이]`, 이미지 크기에 대한 비율
- `image`: 이미지 파일 경로, `round`: 동그랗게 자를지

## 어떻게 연결되나

```
Claude Code 훅 ──▶ office/hook.js ──▶ office/events.jsonl ──▶ office/server.js /state ──(1초마다)──▶ index.html
                         └─ 세션 시작 때 office/launch.js 로 서버 자동 실행
```

| 훅 | 기록 |
|---|---|
| `SessionStart` | 새 세션 구분선, 서버 자동 실행 (새로 시작·`/clear` 때 남은 기록 정리) |
| `UserPromptSubmit` | 내 질문 (최대 1000자) |
| `PreToolUse` | 도구 사용 실황, `Agent` 도구면 일 맡기기 |
| `SubagentStart` / `SubagentStop` | 직원 출근·퇴근, 퇴근 때 결과 요약 |
| `Stop` | Claude 최종 답변 (최대 2000자) |

- 기록은 내 PC의 `office/events.jsonl` 에만 남고 git에 올라가지 않아요. 대화 내용이 들어 있으니 공유하지 마세요.
- 512KB가 넘으면 `events.old.jsonl` 로 넘어가고, 서버는 둘 다 읽어요.
- Esc로 중단하면 퇴근 기록이 안 남아요. 15분 동안 도구 사용이 없는 직원은 끊긴 것으로 보고 화면에서 내려요.
- 도구를 쓸 때마다 훅이 한 번 실행돼서 도구 한 번에 0.05초 정도 늦어질 수 있어요.

## 문제가 생기면

- "서버 연결 안 됨"이 뜨면 `node office/launch.js` 로 켜세요. 서버 없이도 "데모 보기"로 화면은 볼 수 있어요.
- "서버 오류"가 뜨면 서버는 켜져 있지만 기록을 못 읽은 거예요. `office/server.log` 를 보세요.
- 직원을 불렀는데 화면이 그대로면 `office/hook-errors.log` 를 보세요. 훅이 실패해도 Claude 작업은 멈추지 않는 대신 거기에 이유를 남겨요.
- 훅 설정을 바꾼 뒤에는 Claude Code를 새로 시작해야 적용돼요.

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
