# FOLLOWUPS — 2026-04-21 upgrade-v2026 에서 다음 스프린트로 미룬 항목

이 커밋(`upgrade-v2026` @ 2026-04-21)은 **즉시 반영 가능한 UX/법무/컨텐츠 정합성 개선**만 포함합니다.
아래 항목들은 스키마 변경·외부 의존성 추가가 필요해 별도 스프린트로 분리합니다.
각 항목별 초안(코드/SQL/문서)은 `docs/<bundle>/` 에 reference 로 남겨뒀습니다.

---

## ✅ 이번 커밋에서 반영된 것

| 영역 | 파일 | 설명 |
|---|---|---|
| 공통 유틸 | `lib/sanitize.ts` | `**bold**`, `##`, `[text](url)`, 불릿, HTML 태그 제거 유틸 (`sanitizePlainText`, `sanitizeDeep`) |
| 푸터 | `components/common/Footer.tsx` | 서비스명/운영사(블루엣지)/주소/문의·이용약관·개인정보처리방침·사이트맵 + 공공누리 1유형 고지. 외부 링크는 전부 `rel="nofollow"` + 같은 창. |
| 루트 레이아웃 | `app/layout.tsx` | `<main>` 안쪽, BottomNav 위로 `<Footer />` 편입 (pb-24 로 모바일 네비 여백 확보) |
| 정적 페이지 | `app/(public)/about/page.tsx` | 서비스 소개 (블루엣지·공공누리 1유형 고지) |
| 정적 페이지 | `app/(public)/contact/page.tsx` | 문의 (contact@govmate.co.kr, rel=nofollow) |
| 정적 페이지 | `app/(public)/terms/page.tsx` | 이용약관 8조 |
| 정적 페이지 | `app/(public)/privacy/page.tsx` | 개인정보처리방침 8절 |
| 카드 v2 | `components/home/PolicyCard.tsx` | `min-h-[196px]` 높이 균일화, excerpt `min-h-[2.5rem]`, 외부 `applyUrl` → `신청하기` 버튼 (같은 창, rel=nofollow), 하단 `자료: 정부24·복지로 · 일부 내용 AI 요약` |
| DB 정리 | `prisma/migrations_manual/20260421_sanitize_policy_content.sql` | Policy·Faq 본문/제목에서 마크다운 노이즈 일괄 제거 (idempotent). **수동 실행** |

### 📌 배포 전 체크

1. **SQL 마이그레이션 실행** — `prisma/migrations_manual/20260421_sanitize_policy_content.sql`
   ```bash
   psql "$DIRECT_URL" -f prisma/migrations_manual/20260421_sanitize_policy_content.sql
   ```
   하단 `SELECT` 리포트로 잔존 노이즈 확인 (전부 0이어야 함).

2. **ENV 확인**
   - `NEXT_PUBLIC_CONTACT_EMAIL` (기본: `contact@govmate.co.kr`)
   - `NEXT_PUBLIC_BIZ_NO` (선택)
   - `NEXT_PUBLIC_REPRESENTATIVE` (선택)

3. **푸터 링크 확인**
   - `/about`, `/contact`, `/terms`, `/privacy`, `/sitemap.xml` 전부 200

---

## ⏭ 다음 스프린트 (upgrade-v2026 이후)

### 1) Trend Collector — 실시간 정책 발굴 파이프라인
`docs/trend-collector/*` 참조.

**필요한 것:**
- [ ] Prisma 스키마 추가: `NewsItem`, `TrendKeyword`, `PolicyCandidate` + `TrendSource` / `CandidateStatus` enum (`docs/trend-collector/schema_patch.sql`)
- [ ] 새 의존성: `rss-parser`, (선택) `google-trends-api`
- [ ] ENV: `CRON_SECRET`, `NAVER_DATALAB_CLIENT_ID`, `NAVER_DATALAB_CLIENT_SECRET`
- [ ] 라이브러리: `lib/trends/{news_rss_sources,collect_news,naver_datalab,google_trends,keyword_extract,generate_candidates}.ts`
- [ ] 어드민 페이지: `app/(admin)/trends/page.tsx` — 후보 승인 UI (approve → Policy.status DRAFT 생성)
- [ ] Vercel Cron: `app/api/cron/trends/route.ts` 에서 `collectNews` → `extractKeywords` → `generateCandidates` 실행. `vercel.json` 에 schedule 등록.

**리스크:**
- 뉴스 스크래핑은 약관/robots 확인 필요. 1차 버전은 공공 RSS (연합뉴스/정책브리핑) 만 사용 권장.
- Google Trends 무료 엔드포인트 rate limit 이슈 → Naver DataLab 병용 전제.

---

### 2) URL 리팩터 (`/welfare/[slug]` → 카테고리 prefix)
`docs/url-refactor/*` 참조.

**왜 미뤘나:**
현재 DB 는 `Policy.categoryId` 로 FK 연결되어 있고, **live 트래픽이 `/welfare/<slug>` 로 이미 유입**되고 있음 (sitemap, 소셜 공유, 검색엔진 인덱싱).
새 구조로 가려면:
1. 301 redirect 맵 정교화 + 구버전 sitemap 한 번 더 재발행
2. `UrlMapping` 테이블 활용한 leg-by-leg 이관
3. 구글 서치콘솔 인덱싱 재요청

**필요한 것:**
- [ ] `middleware.ts` 에 카테고리 slug prefix redirect 추가
- [ ] `app/welfare/[category]/[slug]/page.tsx` 신규 (기존 `[slug]` 는 redirect 후 보존 기간 운영)
- [ ] `app/sitemap.ts` 업데이트
- [ ] 카테고리 guard (`lib/category-guard.ts`): 잘못된 (카테고리, 슬러그) 조합 차단

---

### 3) 컨텐츠 팩 (카테고리 랜딩 + 가이드)
`docs/content-pack/*` 참조.

**왜 미뤘나:**
초안은 11개 카테고리 + 10개 가이드를 상정했는데 **현재 DB 의 Category 는 10개** 이고 **이름·슬러그가 전부 한국어+영어 다름** (`living-stability`, `housing`, `education`, `employment`, `health`, `administration`, `pregnancy`, `care`, `culture`, `agriculture`).
→ 컨텐츠를 그대로 backfill 하면 정합성 깨짐.

**필요한 것:**
- [ ] `docs/content-pack/categories/*.md` 를 실제 10개 카테고리 슬러그에 맞춰 매핑 + 재작성
- [ ] 가이드 10편은 `/guide/<slug>` 라우트 신설 후 하나씩 배포 (검색 컨텐츠 강화)
- [ ] `docs/content-pack/sql/*.sql` 은 UPSERT 전제. 슬러그 매핑 후 실행.

---

## 🗂 docs 내용

```
docs/
├── FOLLOWUPS.md                # ← 이 파일
├── trend-collector/            # Prisma patch + lib + admin + cron 초안
├── url-refactor/               # middleware redirect + new page + guard + sitemap 초안
└── content-pack/               # 카테고리 랜딩 + 가이드 + static + SQL 초안
```

각 디렉토리의 `README.md` 에 해당 번들의 설계 의도·의존성·적용 순서가 적혀 있습니다.
