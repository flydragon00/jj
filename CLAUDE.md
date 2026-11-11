# 프로젝트 메모

## 내 AI 팀

별명으로 부르면 아래 에이전트를 쓴다. (플러그인 에이전트는 `pr-review-toolkit:<이름>` 으로 호출)

| 부서 | 별명 | 역할 | 에이전트 |
|---|---|---|---|
| 전략실 | 🌰 쿠리만쥬 | 대표·책사 | 메인 대화 (Claude 본인) |
| 전략실 | 🐱 하치와레 | 실장·지휘 | orchestrator |
| 개발실 | 🔭 탐색가 | 조사 | Explore |
| 개발실 | 📐 설계자 | 설계 | Plan |
| 개발실 | 🐹 치이카와 | 빌더 | general-purpose |
| 개발실 | 🦁 시사 | 정밀수정공 | precise-fixer |
| 품질관리 | 🧐 코드리뷰어 | 리뷰 | pr-review-toolkit:code-reviewer |
| 품질관리 | 🦦 랏코 | 에러헌터 | pr-review-toolkit:silent-failure-hunter |
| 품질관리 | 🧪 테스트분석가 | 테스트 | pr-review-toolkit:pr-test-analyzer |
| 품질관리 | 🐰 우사기 | 단순화공 | pr-review-toolkit:code-simplifier |
| 크리에이티브 | 🐿 모몽가 | 디자이너 | designer (frontend-design 스킬 활용) |
| 크리에이티브 | 🎬 미디어팀 | 미디어 | media |
| 지식·운영 | 📚 후루혼야 | 사서 | librarian |
| 지식·운영 | 🛡 갑옷씨 | 관리인 | ops |
| 지식·운영 | 🥷 외부용병 | 교차검증 | second-opinion |

### 호출 규칙

- 새 기능: 설계자 → 치이카와 → 코드리뷰어·랏코·우사기 순서
- 작은 수정: 시사
- 화면 작업: 모몽가
- 3번 이상 막히면: 외부용병
- 작업 끝: 후루혼야가 기록

## 2D 사무실

- 무엇: `office/` 폴더. 훅(`office/hook.js`)이 대화·도구 사용·일 맡기기를 `office/events.jsonl` 에 기록 → `office/server.js`(포트 4777)가 `GET /state` 제공 → `office/index.html` 이 1초마다 폴링. 자세한 건 `office/README.md`.
- 화면(v3): 나무 바닥 오픈 사무실 + 오른쪽 대화창. 직접 그린 SVG 마스코트, 직급 배지, "프로젝트: 하는 일" 말풍선, 질문이 오면 전원이 자리로 뛰어가는 "우다다다". 참고: 인스타 릴스 DfYxnKWxVkH (대표 이미지와 캡션만 확인, 영상은 못 봄).
- 결정: 원작 캐릭터 그림은 따라 그리지 않고 오리지널 마스코트만 쓴다.
- 캐릭터 교체: `office/avatars/sheet.png`(git 제외, 사용자가 직접 넣음) + `office/avatars.json`(칸 위치·직원 배정)이 있으면 마스코트 대신 그 이미지를 쓴다. 저작권 있는 캐릭터 이미지는 레포에 올리지 않는다.
- 결정: 세션 시작 때 `office/launch.js` 가 서버를 자동으로 켜고 브라우저를 연다. 화면을 30분 안 보면 서버는 스스로 꺼진다.
- 화면에서 대화: 입력창 → `POST /send` → `office/chat.js` 가 `claude -p --resume` 실행(권한 모드 기본 `acceptEdits`, 페이지 토큰·Origin 확인). 가짜 claude 로만 시험했고 실제 claude 실행은 내 PC에서 확인 필요.
- 결정: 훅은 Claude 작업을 막지 않도록 항상 exit 0, 실패는 `office/hook-errors.log` 에 남김.
- 결정: 기록 파일이 512KB 넘으면 훅이 `events.old.jsonl` 로 rename. 새로 시작·`/clear` 때만 세션 기록 정리.
- 결정: Esc 중단 시 퇴근 기록이 없으므로 PreToolUse 신호 기준 15분 무신호면 화면에서 내림.
- 다음: 내 PC 실제 세션으로 확인(자동 실행, 훅 기록). v2·v3 코드는 코드리뷰어·랏코·우사기 검토를 아직 안 받음.
- 남은 흠: 360px 에서 두 줄 말풍선이 부서 라벨을 가림, 쉬는 직원 이름표가 가끔 겹침.
