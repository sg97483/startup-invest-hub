# 스타트업 투자/지원 정보 애그리게이터 (Startup Support Hub)

정부·지자체·공공기관에 흩어져 있는 창업 지원사업 공고를 한곳에 모아 보여주는 웹 서비스입니다.

- **배포 주소**: https://startup-invest-hub.vercel.app
- **현재 수집량**: 약 1,760건 (K-Startup 229건 + 기업마당 1,533건)

## 1. 데이터 소스

| 소스 | 수집 방식 | 가져오는 정보 |
| --- | --- | --- |
| [K-Startup 창업지원포털](https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do) (창업진흥원) | 「모집중」 목록 페이지 전량 + 공고별 상세 페이지 | 제목, 사업명, 주관기관, 지원분야, 지원지역, 접수기간, 지원대상, 대상연령, 창업업력, 신청방법, 신청/제외 대상, 공고 본문, 문의처, 접수 사이트 링크 |
| [기업마당](https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do) (중소벤처기업부) | 지원사업 공고 목록 전량(103페이지) | 제목, 지원분야, 신청기간, 소관부처·지자체, 사업수행기관, 등록일, 조회수 |

두 포털 모두 별도의 API 키 없이 접근 가능한 공개 페이지를 사용합니다. 외부 라이브러리 없이
Node 내장 `fetch` 만으로 동작하므로 추가 의존성 설치가 필요 없습니다.

> 공공데이터포털(data.go.kr)의 K-Startup / 기업마당 공식 OpenAPI 를 쓰면 더 안정적이지만
> 발급받은 서비스키가 필요합니다. 키를 발급받으면 `scripts/crawler/sources/` 에 소스를 추가하는
> 구조로 확장할 수 있습니다.

## 2. 데이터 수집 실행

```bash
npm run crawl              # 전체 수집 (K-Startup 상세 보강 포함, 약 20초)
npm run crawl -- --fast    # K-Startup 상세 페이지 생략 (더 빠름, 정보는 적음)
npm run crawl -- --only=kstartup
npm run crawl -- --only=bizinfo
```

결과물

- `public/data/programs.json` — 전체 공고 데이터(약 2MB). 정적 파일로 서빙되어 JS 번들 크기에 영향을 주지 않습니다.
- `src/data/summary.json` — 총계/지역별·분야별 집계. 첫 화면이 데이터 로딩 전에도 숫자를 보여주는 데 사용합니다.

수집 로직 구성

```
scripts/crawler/
├── index.js              수집 → 중복 제거 → 마감 공고 제외 → JSON 저장
├── lib/http.js           재시도·타임아웃·동시 요청 제어
├── lib/parse.js          HTML → 텍스트, 날짜 정규화
├── lib/taxonomy.js       지역/지원분야 통합 분류 사전
└── sources/
    ├── kstartup.js
    └── bizinfo.js
```

새 소스를 추가하려면 `sources/` 에 `collect()` 를 export 하는 모듈을 만들고 `index.js` 의
`jobs` 배열에 넣으면 됩니다. 반환 형식은 `src/types/index.ts` 의 `SupportProgram` 과 같습니다.

## 3. 주요 기능

- **리스트 뷰**: 지역(18) · 지원분야(11) · 출처별 필터, 통합 검색(사업명/기관명/지원대상), 마감임박·최신등록·조회순 정렬, 60건 단위 더보기
- **캘린더 뷰**: 월별 마감일 표시 (하루 4건 초과 시 "외 N건 마감")
- **상세 페이지**: 접수기간, 지원대상, 창업업력, 대상연령, 신청방법, 신청/제외 대상, 문의처, 원본 공고 및 접수 사이트 링크

## 4. 개발 / 배포

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npx vercel --prod
```

기술 스택: Next.js 15 (App Router), React 19, Vanilla CSS(글래스모피즘), Vercel 배포.

### 데이터 갱신 주기

공고는 매일 새로 올라오므로 주기적으로 `npm run crawl` 후 재배포해야 합니다.

```bash
npm run crawl && npx vercel --prod
```

깃 저장소를 연결하면 GitHub Actions 로 매일 자동 수집·배포하도록 확장할 수 있습니다.
