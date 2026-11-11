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
