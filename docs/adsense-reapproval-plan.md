# AdSense reapproval plan

Last updated: 2026-05-12

## Goal

Fix the likely "low value content" rejection by reducing thin/generated pages and making the public site clearly useful before requesting another review.

## What Google is looking for

Use these as the review baseline:

- AdSense policies require compliance with Google Publisher Policies and prohibit invalid or misleading ad behavior.
- Google's beginner guide says sites should have unique, relevant content that adds value to users.
- Google Publisher Policies call out inventory value issues such as pages without publisher content, low-value content, under-construction screens, or ads overwhelming content.

References:

- https://support.google.com/adsense/answer/48182
- https://support.google.com/adsense/answer/23921
- https://support.google.com/adsense/answer/10502938

## Diagnosis for govmate.co.kr

The site has useful intent, but the current risk is that many policy pages can look template-generated:

- Large numbers of similar welfare pages by category/region can look duplicated.
- Some policy descriptions are short and list-like.
- Pages may depend heavily on imported public-data text rather than original explanation.
- If ad slots appear before approval or near sparse content, reviewers may classify the inventory as low value.
- Trust signals exist, but they should be more explicit for a welfare/benefit information site.

## Content quality standard

Only publish pages that meet all of these:

- Minimum 900-1,500 Korean characters of original explanation, not counting copied official descriptions.
- Clear source link to the official application or announcement page.
- Visible "last checked" date.
- At least 5 structured sections:
  - who qualifies
  - benefit amount or support details
  - application period
  - how to apply
  - common mistakes or exclusion cases
- At least 3 FAQs written from a real user perspective.
- One short editor note explaining when this benefit is worth checking.
- No empty ad slots, placeholder ads, or ad-like boxes on sparse pages.

## Publish/noindex rules

Use this rule until reapproval:

- Keep reviewed, high-quality pages indexable.
- Set DRAFT or `noindex` for imported pages that have only short/generated content.
- Noindex internal search pages, paginated duplicates, account pages, notification pages, admin paths, and seed/test endpoints.
- Do not submit low-quality generated detail pages in the sitemap.

## First 30 pages to strengthen

Prioritize pages with broad search intent and practical user value:

- 청년 월세 지원
- 청년 전세자금 대출
- 국민내일배움카드
- 국가장학금
- 에너지바우처
- 첫만남이용권
- 부모급여
- 아동수당
- 기초연금
- 긴급복지 생계지원
- 실업급여
- 근로장려금
- 자녀장려금
- 자동차세 환급
- 건강보험료 환급
- 재난적 의료비 지원
- 문화누리카드
- 소상공인 정책자금
- 신혼부부 전세대출
- 버팀목 전세자금
- 주거급여
- 교육급여
- 의료급여
- 장애인 활동지원
- 한부모가족 양육비
- 산후조리비 지원
- 난임시술비 지원
- 보육료 지원
- 청년도약계좌
- 내집마련 디딤돌대출

## Page template

Use this editorial structure for every strengthened policy page:

1. One-paragraph summary: who should read this page and what they can get.
2. Eligibility checklist: age, income, residence, household, employment, exceptions.
3. Benefit details: amount, frequency, limit, payment method.
4. Application period: fixed deadline, rolling application, or expected annual window.
5. How to apply: official site, offline office, required login/certificate.
6. Required documents: default and case-specific documents.
7. Common mistakes: duplicate application, income standard misunderstanding, expired period, wrong local government.
8. Official source: government URL, source name, last checked date.
9. FAQ: 3-5 questions.
10. Related policies: 3 internal links with a reason.

## Trust improvements

Before resubmitting:

- Expand `/about` with operator identity, editorial purpose, and update policy.
- Expand `/contact` with response channel and correction request process.
- Add an editorial policy section: sources, update cycle, correction handling, AI-assisted drafting disclosure if applicable.
- Make footer business/operator information consistent with `.env.example`.
- Add visible source and last-checked metadata on policy detail pages.

## Technical cleanup before review

- Confirm canonical URLs use `https://www.govmate.co.kr`.
- Confirm `/og-image.png` returns 200.
- Confirm sitemap contains only public, useful URLs.
- Confirm robots.txt blocks admin/account/internal paths.
- Remove or hide empty AdSense slots until approval.
- In Search Console, request indexing for the strengthened pages after they are published.

## Reapproval timing

Do not request review immediately after edits.

Recommended sequence:

1. Publish 30 strengthened pages.
2. Noindex or unpublish thin/generated pages.
3. Submit updated sitemap in Search Console.
4. Wait until Google has crawled the updated pages.
5. Reapply after at least 7-14 days of stable indexed content.
