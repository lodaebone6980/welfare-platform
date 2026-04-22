# URL 구조 리팩토링: /welfare/:slug → /:category/:slug

## 왜 바꾸나

현재 모든 정책 상세가 `/welfare/:slug` 한 단계로 퍼져있어서,

- 구글이 **"이 사이트는 welfare 한 카테고리짜리"**로 인식함 (사이트 토픽 다양성 X)
- 내부 링크 허브(카테고리 랜딩 → 상세)로 주제 권위가 흐르는 구조가 아님
- 사람도 URL만 보고 무슨 주제인지 구분이 안 됨 (UX)

## 새 구조

| 기존                              | 신규                                       |
| --------------------------------- | ------------------------------------------ |
| `/welfare/unemployment-benefit`   | `/subsidy/unemployment-benefit`            |
| `/welfare/car-tax-refund`         | `/refund/car-tax-refund`                   |
| `/welfare/energy-voucher`         | `/voucher/energy-voucher`                  |
| `/welfare/jeonse-loan`            | `/loan/jeonse-loan`                        |
| `/welfare/national-scholarship`   | `/education/national-scholarship`          |
| …                                 | …                                          |
| `/welfare` (목록)                 | `/subsidy`, `/refund`, `/voucher`, … (11개)|

카테고리 11종:
`refund · voucher · subsidy · loan · grant · education · housing · medical · employment · culture · pregnancy-childcare`

## 301 리다이렉트 유지 (SEO 보호)

기존 `/welfare/*` URL은 구글에 이미 색인되어 있을 수 있으므로 **모두 301 리다이렉트**로 새 경로로 흘려보낸다. Next.js `next.config.js`의 `redirects()`와 middleware 조합으로 처리.

## 적용 순서

1. Prisma `Category` / `Policy.category` 확인 — 이미 존재
2. DB에 category enum 값이 위 11종과 동일한지 확인
3. 라우트 파일 이동: `app/(public)/welfare/[slug]/page.tsx` → `app/(public)/[category]/[slug]/page.tsx`
4. `next.config.js` redirects 추가
5. `sitemap.ts` 수정 (/welfare 제거, 11개 카테고리 + 상세 추가)
6. 내부 링크(카드, 검색, 카테고리 랜딩) 모두 새 경로 사용
7. Search Console에 새 sitemap 제출, 기존 URL은 "주소 변경 도구" 불필요 (301이면 충분)
8. 1~2주 후 로그/GSC로 크롤 이상 없는지 확인

## 파일 목록

- `next.config.redirects.ts` — `/welfare/*` → `/:category/*` 301 규칙 생성 함수
- `middleware_redirect.ts` — DB 룩업 기반 동적 리다이렉트 (slug로 category 찾기)
- `app_category_slug_page.tsx` — 새 동적 라우트 골격
- `sitemap.ts` — 교체용 sitemap.ts (11개 카테고리 + 정책 상세)
- `category_guard.ts` — 잘못된 category 접근 시 404
