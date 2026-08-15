# 2단계 — 실제 API 자동발행 세팅 가이드

> 원장님이 선택하신 "실제 API 자동발행까지 도전" 경로.
> **콘솔(1단계)은 이미 동작합니다.** 여기 세팅이 끝나면 발행키트 버튼이 "진짜 자동발행"으로 바뀝니다.
> ⚠️ 먼저 **정직하게 각 채널이 실제로 되는 범위**부터 못 박습니다.

---

## 0. 채널별 자동발행 현실 (중요)

| 채널 | 자동발행 되나 | 조건 / 한계 |
|---|---|---|
| **랜딩페이지** | ✅ 완전 자동 (이미 됨) | 깃허브 토큰만. 콘솔에서 원클릭. |
| **인스타그램** | ✅ 사진/카드뉴스 자동발행 가능 | ① **비즈니스/크리에이터 계정**이어야 함 ② 페이스북 페이지 연결 ③ 메타 앱 + `instagram_business_content_publish` **앱 심사 통과** ④ 이미지가 **공개 URL**에 있어야 함(카드 PNG를 깃허브에 올리면 해결) |
| **유튜브** | ⚠️ **영상 업로드만** 자동 가능 | 구글 OAuth + Data API. **커뮤니티 글(게시글)은 공개 API가 아예 없음** → 커뮤니티 글은 계속 발행키트(복붙)로 |
| **네이버 블로그** | ❌ 불가 | 네이버가 글쓰기 공개 API를 닫음. **항상 발행키트(복붙)** |

즉, 세팅을 다 해도 **네이버 블로그와 유튜브 커뮤니티 글은 수동(발행키트)**입니다. 인스타 카드뉴스 자동발행 + 유튜브 영상 자동업로드가 "진짜 자동"이 되는 부분.

---

## 1. 백엔드가 왜 필요한가 (한 줄)

인스타·유튜브 API는 **비밀 토큰**을 써야 하는데, 그 토큰을 브라우저에 두면 누구나 볼 수 있어 위험합니다. 그래서 토큰을 감춰줄 **작은 서버(백엔드)**가 하나 필요합니다. 추천 = **Cloudflare Workers**(무료, 항상 켜짐, 관리할 서버 없음). 스캐폴드 코드는 `backend/worker.js`에 있습니다.

---

## 2. 세팅 순서 (긴 병목부터)

### A. 인스타그램 자동발행
1. **인스타 계정을 프로페셔널(비즈니스/크리에이터)로 전환** — 앱에서 설정 → 프로페셔널 계정 전환.
2. **페이스북 페이지 생성 후 인스타와 연결** (없으면 하나 만들기).
3. **Meta for Developers**(developers.facebook.com)에서 앱 생성 → 제품에 **Instagram Graph API** 추가.
4. **앱 심사(App Review)** 에서 `instagram_business_content_publish`, `pages_show_list`, `business_management` 권한 신청 → 사용 사례 설명 + 시연 영상 제출. **여기가 며칠~2주 걸림.**
5. 승인되면 **장기 액세스 토큰(long-lived, 60일)** 발급 → 백엔드 환경변수에 저장. (만료 갱신 로직은 worker에 포함)
6. 인스타 발행 흐름(worker가 대신 함): `POST /{ig-user-id}/media`(image_url+caption) → creation_id → `POST /{ig-user-id}/media_publish`.

### B. 유튜브 영상 자동업로드
1. **Google Cloud Console**에서 프로젝트 생성 → **YouTube Data API v3** 사용 설정.
2. **OAuth 동의 화면** 구성(외부, 채널 소유 구글 계정) → 범위 `https://www.googleapis.com/auth/youtube.upload`.
3. OAuth 클라이언트(웹) 생성 → 최초 1회 동의로 **refresh token** 확보 → 백엔드에 저장(자동 갱신).
4. 업로드는 `videos.insert`(할당량 1건 ≈ 1600유닛, 기본 일 10,000유닛 = 하루 약 6건). 그 이상 필요하면 할당량 증설 신청.
5. **커뮤니티 글은 API 없음** → 유튜브 게시글은 발행키트로.

### C. 랜딩(이미 됨) 토큰을 서버로 옮기고 싶으면
- 지금은 브라우저 토큰으로 충분. 원하면 worker의 `/deploy/landing`으로 옮겨 토큰을 서버에만 둘 수 있음.

---

## 3. 백엔드 배포 (Cloudflare Workers)
1. cloudflare.com 무료 가입 → Workers & Pages.
2. `npm i -g wrangler` → `wrangler login`.
3. `backend/` 폴더에서 `wrangler deploy`.
4. 대시보드 → 해당 Worker → **Settings → Variables**에 시크릿 등록:
   - `IG_USER_ID`, `IG_ACCESS_TOKEN`, `FB_APP_ID`, `FB_APP_SECRET`
   - `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`
   - `GH_TOKEN`(옵션), `ALLOW_ORIGIN`(콘솔 URL, CORS용)
5. 배포되면 나온 주소(예 `https://daol-funnel.<계정>.workers.dev`)를 콘솔 설정에 넣으면(추후 연결) 발행키트 버튼이 자동발행으로 승격.

---

## 4. 지금 당장 원장님이 하실 일 (요약)
- [ ] 인스타 계정 프로페셔널 전환 + 페이스북 페이지 연결
- [ ] Meta 앱 만들고 **앱 심사 신청**(가장 오래 걸림 — 오늘 시작 권장)
- [ ] 구글 클라우드에서 YouTube Data API 사용 설정 + OAuth
- [ ] Cloudflare 가입

이 4개의 승인/발급이 끝나는 대로 제가 worker에 토큰만 연결하면 **인스타 카드뉴스 자동발행 + 유튜브 영상 자동업로드**가 켜집니다.
그 전까지는 **콘솔 1단계(발행키트)로 이미 실전 사용 가능**합니다.
