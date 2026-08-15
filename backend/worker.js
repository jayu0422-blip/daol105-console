// 다올105 배포 퍼널 — Cloudflare Worker 백엔드 스캐폴드
// 역할: 비밀 토큰을 서버에만 두고, 콘솔의 발행키트 버튼이 실제 자동발행을 호출하게 해줌.
// 환경변수(Settings→Variables)에 등록: ALLOW_ORIGIN, IG_USER_ID, IG_ACCESS_TOKEN,
//   YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN, GH_TOKEN
//
// ⚠️ 정직성 메모(가이드와 동일):
//   - 인스타: 비즈니스 계정 + 앱심사 통과 + 이미지 공개 URL 있어야 실제 발행.
//   - 유튜브: 영상 업로드만 가능. 커뮤니티 글은 공개 API 없음(발행키트 유지).
//   - 네이버 블로그: API 없음(발행키트 유지).

export default {
  async fetch(req, env) {
    const origin = env.ALLOW_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(req.url);
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...cors } });

    try {
      if (url.pathname === '/publish/instagram' && req.method === 'POST') {
        const { imageUrl, caption } = await req.json();
        if (!imageUrl) return json({ error: 'imageUrl(공개 URL) 필요' }, 400);
        return json(await publishInstagram(env, imageUrl, caption || ''));
      }
      if (url.pathname === '/publish/youtube' && req.method === 'POST') {
        // 영상 업로드용. 본문에 { title, description, videoBase64 } 등을 받아 처리.
        return json(await publishYouTubeNote(env, await req.json()));
      }
      if (url.pathname === '/deploy/landing' && req.method === 'POST') {
        const { owner, repo, html } = await req.json();
        return json(await deployLanding(env, owner, repo, html));
      }
      return json({ ok: true, endpoints: ['/publish/instagram', '/publish/youtube', '/deploy/landing'] });
    } catch (e) {
      return json({ error: String(e.message || e) }, 500);
    }
  },
};

// ---------- 인스타그램 (사진/카드뉴스 자동발행) ----------
// 흐름: 1) 미디어 컨테이너 생성(image_url + caption) → creation_id
//       2) media_publish 로 실제 게시
async function publishInstagram(env, imageUrl, caption) {
  if (!env.IG_USER_ID || !env.IG_ACCESS_TOKEN) return { error: 'IG_USER_ID / IG_ACCESS_TOKEN 미설정(앱심사 후)' };
  const base = `https://graph.facebook.com/v21.0/${env.IG_USER_ID}`;
  const c = await (await fetch(`${base}/media`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: env.IG_ACCESS_TOKEN }),
  })).json();
  if (!c.id) return { step: 'create', raw: c };
  const p = await (await fetch(`${base}/media_publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ creation_id: c.id, access_token: env.IG_ACCESS_TOKEN }),
  })).json();
  return { ok: !!p.id, mediaId: p.id, raw: p };
}
// 캐러셀(카드뉴스 10장)은 각 이미지를 is_carousel_item=true 로 만든 뒤
// children=[...ids] 로 컨테이너 생성 → publish. 앱심사 통과 후 이 함수 확장.

// ---------- 유튜브 (영상 업로드) ----------
async function ytAccessToken(env) {
  const r = await (await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.YT_CLIENT_ID, client_secret: env.YT_CLIENT_SECRET,
      refresh_token: env.YT_REFRESH_TOKEN, grant_type: 'refresh_token',
    }),
  })).json();
  return r.access_token;
}
async function publishYouTubeNote(env, body) {
  // 정직: 커뮤니티 '게시글'은 공개 API가 없음. 영상 업로드만 지원.
  if (!env.YT_REFRESH_TOKEN) return { error: 'YT_REFRESH_TOKEN 미설정(OAuth 후)', note: '커뮤니티 글은 API 불가 → 발행키트 사용' };
  const token = await ytAccessToken(env);
  // 실제 영상 바이너리 업로드는 resumable upload로 처리(용량 큼).
  // 스캐폴드: 액세스 토큰 정상 발급 여부만 확인.
  return { ok: !!token, tokenReady: !!token, note: '영상 업로드는 resumable upload로 연결 예정. 커뮤니티 글은 발행키트.' };
}

// ---------- 랜딩 배포(토큰 서버화, 옵션) ----------
async function deployLanding(env, owner, repo, html) {
  if (!env.GH_TOKEN) return { error: 'GH_TOKEN 미설정(옵션)' };
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/index.html`;
  const H = { Authorization: 'Bearer ' + env.GH_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'daol-funnel' };
  let sha = null;
  const g = await fetch(api, { headers: H });
  if (g.ok) sha = (await g.json()).sha;
  const content = btoa(unescape(encodeURIComponent(html)));
  const p = await fetch(api, {
    method: 'PUT', headers: H,
    body: JSON.stringify({ message: `deploy ${repo} (worker)`, content, ...(sha ? { sha } : {}) }),
  });
  return { ok: p.ok, url: `https://${owner}.github.io/${repo}/` };
}
