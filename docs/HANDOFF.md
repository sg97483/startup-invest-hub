# StartupInvestHub — 인수인계 문서

> 다른 에이전트(또는 사람)가 이 프로젝트를 처음 맡을 때 읽는 문서입니다.
> 최신 상태를 반영하려 하지만, 실제 코드·Actions 실행 이력이 항상 우선합니다.
> 갱신일: 2026-09-17

## 한 줄 요약

정부·지자체 창업지원 공고(K-Startup, 기업마당)를 매일 자동 수집해서 보여주는 사이트.
사용자 본인의 두 프로젝트(**CodiPop**, **KachiApp**)가 지원 가능한 공고를 찾으려고 만들었다.

| 항목 | 값 |
|---|---|
| 프로젝트명 (package.json) | `startup-support-hub` |
| 로컬 폴더명 | `StartupInvestHub` |
| 배포 주소 | https://startup-invest-hub.vercel.app |
| GitHub | https://github.com/sg97483/startup-invest-hub |
| Vercel 프로젝트 | `startup-invest-hub` (팀 `sg97483-4596s-projects`) |
| 사용자 계정 | GitHub/이메일 `sg97483` |

## 지금 뭘 하면 되는지 (자동화 상태)

**매일 자동으로 돌아간다.** 06:35 KST + 백업 10:35 KST에 GitHub Actions가
`npm run crawl` → 검증 → `vercel deploy --prod`를 실행한다.
**사용자가 평소에 손댈 일은 없다.**

방금 확인한 라이브 상태(참고용, 실제로는 다시 확인할 것):
```bash
curl -s https://startup-invest-hub.vercel.app/data/programs.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['generatedAt'], d['total'], d['sources'])"
```

Actions 실행 이력 확인:
```bash
curl -s "https://api.github.com/repos/sg97483/startup-invest-hub/actions/runs?per_page=10" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d['workflow_runs']:
    print(r['run_number'], r['conclusion'], r['run_started_at'])
"
```

실행이 실패해 있다면 → **아래 "장애 대응" 섹션**부터 읽을 것.

## 왜 만들었는지 (이걸 모르면 엉뚱한 방향으로 "개선"하게 됨)

사용자는 두 앱을 만들고 있고, 그 앱들로 정부 창업지원을 받고 싶어서 이 사이트를 만들었다.
- **CodiPop**: 온라인 패션몰에 붙이는 AI 가상피팅 위젯. B2B 월 구독 SaaS. 기술축은 이미지 생성 AI.
- **KachiApp**: 해외 K-컬처 팬 대상 AI 여행일정 앱. 인바운드 관광, LLM 기반 일정 생성.
- 창업 단계: **예비창업자** (2026-08 기준). 지역 가중치 없음 (전국 어디든 상관없음).

사이트의 "내 프로젝트" 필터가 이 두 프로젝트에 맞는 공고만 골라 보여준다.
판정 규칙과 근거는 `scripts/crawler/lib/projects.js` 상단 주석 및 `README.md` 6장 참고.

**절대 잊으면 안 되는 것**: CodiPop은 몰에 "소프트웨어를 파는" 쪽이다.
라이브커머스·쇼핑몰 입점·판로개척처럼 "상품을 파는" 소상공인 지원사업과는 정반대라
전부 제외 대상이다 (`EXCLUSIONS`에 이미 반영됨).

## 아키텍처 한눈에

```
scripts/crawler/          Node 크롤러 (외부 라이브러리 없음, 내장 fetch만 사용)
├── index.js              전체 실행: 수집 → 이월 → 중복제거 → 마감제외 → JSON 저장
├── lib/http.js           재시도·백오프·타임아웃·쿠키·동시요청 제어
├── lib/parse.js          HTML → 텍스트, 날짜 정규화
├── lib/taxonomy.js       지역/지원분야 통합 분류
├── lib/districts.js      시·군·구 → 광역시도 사전 (포털의 '전국' 오표기 보정용)
├── lib/projects.js       CodiPop/KachiApp 적합도 판정 ← 매칭 로직 고치려면 여기
└── sources/
    ├── kstartup.js       K-Startup 창업지원포털 (모집중 목록 + 상세페이지)
    └── bizinfo.js        기업마당 (중소벤처기업부)

public/data/programs.json  크롤러 출력. 정적 파일로 서빙 (JS 번들에 안 들어감, ~2MB)
src/data/summary.json      programs 배열 뺀 요약. 로딩 전 화면에 숫자 보여주는 용도
src/lib/api.ts             프론트에서 programs.json 읽는 로직 (캐시버스팅 쿼리 포함)
src/types/index.ts         SupportProgram, ProgramDataset 타입 정의

.github/workflows/crawl-and-deploy.yml   자동 수집·배포 워크플로
```

데이터 흐름: 크롤러 실행 → `public/data/programs.json` 생성 → Vercel 배포 →
브라우저가 런타임에 그 JSON을 fetch (수집 시각을 쿼리 파라미터로 붙여 캐시 무효화).

## 알아야 할 과거 결정들 (왜 이렇게 돼 있는지)

1. **Firebase 안 씀.** 원래 Firestore로 갈 계획이었으나 정적 JSON 방식으로 바꾸고
   Firebase 의존성을 완전히 제거했음 (`1bc873c` 커밋). 다시 도입할 이유 없음.

2. **API 키 안 씀.** data.go.kr 공식 OpenAPI는 서비스키 발급이 필요해서 안 쓰고,
   두 포털의 공개 HTML을 직접 파싱함. 이게 정상 동작 방식이다 — "왜 API를 안 쓰지?"
   하고 바꾸려 들지 말 것.

3. **지역 표기를 포털 값 그대로 믿지 않음.** K-Startup은 지자체 공고에도 '전국'을
   적어두는 경우가 많아서 (`districts.js`) 기관명·사업명으로 보정한다. 상세 페이지에
   보정 근거가 표시된다 ("원본은 전국 표기 — 주관기관 기준으로 보정" 등).

4. **한 소스가 실패해도 배포는 계속됨 (이월 로직).** GitHub 러너에서 기업마당 수집이
   간헐적으로 실패한 적이 있어 (`4dbe6cb`), 직전 배포 데이터에서 이월하는 안전장치를
   넣었다. 3일 넘게 갱신 안 되면 그때는 배포를 막고 알린다. `sourceHealth` 필드로
   상태를 추적한다.

5. **cron이 정시(:00)가 아님.** GitHub 예약 실행은 정시에 몰리면 몇 시간씩 밀리는 걸
   실측으로 확인했음 (28분~8시간 지연). 그래서 06:35 KST + 10:35 KST 백업으로 분산해둠.
   "몇 시 정각"이 아니라 "오전 중 갱신"으로 이해할 것.

## 장애 대응

**Actions가 빨간불이면:**
1. 실패한 run의 로그를 본다 (Settings 권한 없으면 API로 결론만 확인 가능:
   `curl -s "https://api.github.com/repos/sg97483/startup-invest-hub/actions/runs/<id>/jobs"`).
2. 대개 "수집 결과 검증" 단계에서 죽는다. 이건 아래 셋 중 하나가 실제로 터졌다는 뜻:
   - 전체 수집 500건 미만
   - 어떤 소스가 0건인데 이월할 과거 데이터도 없음
   - 같은 소스가 3일 넘게 갱신 안 됨 (포털 구조가 바뀌었을 가능성 높음)
3. 로컬에서 재현: `npm run crawl` 실행해서 같은 문제가 나오는지 확인.
   로컬은 되는데 CI만 실패하면 네트워크/IP 차단 문제 (`lib/http.js`의 재시도·쿠키 로직 점검).
   로컬도 안 되면 포털 HTML 구조가 바뀐 것 — `sources/kstartup.js` 또는 `sources/bizinfo.js`의
   셀렉터(정규식)를 실제 페이지와 대조.

**VERCEL_TOKEN 만료:** 배포 단계가 인증 오류로 실패한다. 사용자가 직접
https://vercel.com/account/tokens 에서 재발급 → GitHub 저장소 Secrets에 재등록해야 함
(자격증명이라 에이전트가 대신 할 수 없음).

**"이 공고는 우리랑 상관없는데" 피드백을 받으면:**
`scripts/crawler/lib/projects.js`에서 어떤 키워드에 걸렸는지 역추적 (`projectMatches[id].hits`
필드에 걸린 키워드가 기록됨) → `EXCLUSIONS` 배열에 추가하거나 signal 가중치 조정.

## 자주 쓰는 명령

```bash
npm run crawl                    # 전체 수집 (~20-30초)
npm run crawl -- --fast          # K-Startup 상세페이지 생략 (빠름, 정보는 적음)
npm run crawl -- --only=kstartup # 특정 소스만
npm run dev                      # 로컬 개발 서버
npm run build                    # 프로덕션 빌드 (타입체크 포함)
npx vercel --prod --yes          # 수동 배포
```

## 더 자세한 내용

- `README.md` — 데이터 소스, 지역 분류 규칙, 프로젝트 매칭 규칙 전체 설명 (6개 장, 이 문서보다 상세함)
- `.github/workflows/crawl-and-deploy.yml` — 자동화 파이프라인 전체, 주석에 설계 이유 적혀 있음
- git log — 각 커밋 메시지에 "왜 이렇게 바꿨는지"가 자세히 적혀 있음 (`git log --stat`)
