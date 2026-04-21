-- =====================================================================
-- 정책 상세페이지의 빈 섹션을 일괄로 채우는 백필 SQL
-- 실행 전 반드시 DB 백업 후 진행하세요.
--
-- 작성일: 2026-04-21
-- 대상 테이블: Policy
-- 가정 컬럼(없으면 무시하거나 ALTER 후 사용):
--   seoTitle         text
--   seoDescription   text
--   aiSummary        text         -- AEO/GEO용 한 줄 요약
--   howToApply       jsonb        -- 신청 방법 단계 (JSON 배열)
--   faqJson          jsonb        -- FAQ (JSON)
--   applyUrl         text         -- 공식 신청 링크
--   source           text         -- 출처 기관
--   updatedAt        timestamp
--
-- 아래 컬럼들이 존재하지 않는다면 STEP 0에서 ALTER 를 먼저 실행하세요.
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 0. 누락된 컬럼 추가 (이미 있는 경우 무시해도 에러 아님)
-- ---------------------------------------------------------------------
ALTER TABLE "Policy"
  ADD COLUMN IF NOT EXISTS "seoTitle"        text,
  ADD COLUMN IF NOT EXISTS "seoDescription"  text,
  ADD COLUMN IF NOT EXISTS "aiSummary"       text,
  ADD COLUMN IF NOT EXISTS "howToApply"      jsonb,
  ADD COLUMN IF NOT EXISTS "faqJson"         jsonb;

-- ---------------------------------------------------------------------
-- STEP 1. seoTitle 백필
--   "{title} | {categoryName} | 고브메이트"
-- ---------------------------------------------------------------------
UPDATE "Policy" p
SET "seoTitle" =
  COALESCE(p."title", '정부 지원 제도')
  || COALESCE(' | ' || c."name", '')
  || ' | 고브메이트',
  "updatedAt" = now()
FROM "Category" c
WHERE p."categoryId" = c."id"
  AND (p."seoTitle" IS NULL OR p."seoTitle" = '');

-- ---------------------------------------------------------------------
-- STEP 2. seoDescription 백필
--   description 또는 content 일부를 추출 + 카테고리 접두어
-- ---------------------------------------------------------------------
UPDATE "Policy" p
SET "seoDescription" =
  COALESCE(c."name" || ' 카테고리 | ', '')
  || LEFT(
       regexp_replace(
         COALESCE(p."description", p."content", p."title", ''),
         '[\s]+', ' ', 'g'
       ),
       150
     )
  || CASE WHEN LENGTH(COALESCE(p."description", p."content", p."title", '')) > 150
         THEN '...' ELSE '' END
  || ' 신청 조건·방법·마감일을 고브메이트에서 확인하세요.',
  "updatedAt" = now()
FROM "Category" c
WHERE p."categoryId" = c."id"
  AND (p."seoDescription" IS NULL OR p."seoDescription" = '');

-- ---------------------------------------------------------------------
-- STEP 3. aiSummary 백필 (AEO/GEO)
--   LLM이 인용하기 좋은 1문장 요약
-- ---------------------------------------------------------------------
UPDATE "Policy" p
SET "aiSummary" =
  p."title"
  || ' 은(는) '
  || COALESCE(c."name", '정부 지원')
  || ' 카테고리의 제도로, '
  || COALESCE(
       LEFT(regexp_replace(p."description", '[\s]+', ' ', 'g'), 90),
       '정부·공공기관이 제공하는 지원 프로그램'
     )
  || '입니다.',
  "updatedAt" = now()
FROM "Category" c
WHERE p."categoryId" = c."id"
  AND (p."aiSummary" IS NULL OR p."aiSummary" = '');

-- ---------------------------------------------------------------------
-- STEP 4. howToApply 단계 기본 템플릿 (카테고리별)
--   FAQ 스키마(schema.org) 호환 JSON
-- ---------------------------------------------------------------------
UPDATE "Policy" p
SET "howToApply" = jsonb_build_array(
  jsonb_build_object(
    'step', 1,
    'title', '자격 확인',
    'description', '고브메이트 상세 페이지 또는 담당 기관 홈페이지에서 지원 대상·소득·재산 요건을 확인합니다.'
  ),
  jsonb_build_object(
    'step', 2,
    'title', '서류 준비',
    'description', '신분증, 통장 사본, 소득·재산 증빙 등 제도별 필수 서류를 미리 준비합니다.'
  ),
  jsonb_build_object(
    'step', 3,
    'title', '온라인 또는 방문 신청',
    'description', '하단 공식 신청 링크 또는 주민센터·관할 공공기관에서 신청합니다.'
  ),
  jsonb_build_object(
    'step', 4,
    'title', '심사 및 결정',
    'description', '소득·자산 조회 및 자격 심사를 거쳐 결과를 통보받습니다. 보통 2~6주 소요됩니다.'
  ),
  jsonb_build_object(
    'step', 5,
    'title', '지급 또는 혜택 개시',
    'description', '결정 통보 후 본인 계좌로 지급되거나, 바우처·카드 형태로 혜택이 개시됩니다.'
  )
),
"updatedAt" = now()
WHERE ("howToApply" IS NULL OR "howToApply" = 'null'::jsonb OR jsonb_array_length("howToApply") = 0);

-- ---------------------------------------------------------------------
-- STEP 5. FAQ 기본 템플릿 (schema.org FAQPage 호환)
-- ---------------------------------------------------------------------
UPDATE "Policy" p
SET "faqJson" = jsonb_build_array(
  jsonb_build_object(
    'q', '이 제도를 받으려면 어떤 조건이 필요한가요?',
    'a', '각 제도마다 연령·소득·가구·거주지역 등 세부 조건이 다릅니다. 본 페이지 상단 "지원 대상" 섹션과 공식 기관 공고를 반드시 함께 확인해 주세요.'
  ),
  jsonb_build_object(
    'q', '신청 기간이 따로 있나요?',
    'a', '연중 상시 접수하는 제도도 있지만, 예산 소진 시 조기 마감되거나 분기·연도별로 공고가 따로 나오는 경우가 많습니다. 하단 "공식 신청 바로가기"에서 현재 접수 여부를 확인해 주세요.'
  ),
  jsonb_build_object(
    'q', '온라인으로 신청할 수 있나요?',
    'a', '대부분은 정부24, 복지로, 각 부처·지자체 홈페이지에서 온라인 신청이 가능합니다. 일부 제도는 관할 주민센터·공공기관 방문이 필요할 수 있습니다.'
  ),
  jsonb_build_object(
    'q', '신청하면 얼마 만에 결과가 나오나요?',
    'a', '소득·자산 심사가 포함된 제도는 보통 2~6주, 서류만으로 처리되는 간단한 신청은 3~10영업일이 소요됩니다. 정확한 처리 기간은 담당 기관에 문의해 주세요.'
  ),
  jsonb_build_object(
    'q', '다른 지원금과 중복으로 받을 수 있나요?',
    'a', '제도마다 중복 수급 가능 여부가 다릅니다. 본 페이지 "주의사항" 및 공식 공고에서 "중복 수급 금지" 조항 유무를 확인하세요.'
  )
),
"updatedAt" = now()
WHERE ("faqJson" IS NULL OR "faqJson" = 'null'::jsonb OR jsonb_array_length("faqJson") = 0);

-- ---------------------------------------------------------------------
-- STEP 6. applyUrl 공백 제거 + http -> https
-- ---------------------------------------------------------------------
UPDATE "Policy"
SET "applyUrl" = trim("applyUrl"),
    "updatedAt" = now()
WHERE "applyUrl" IS NOT NULL AND "applyUrl" <> trim("applyUrl");

UPDATE "Policy"
SET "applyUrl" = replace("applyUrl", 'http://', 'https://'),
    "updatedAt" = now()
WHERE "applyUrl" LIKE 'http://%';

-- ---------------------------------------------------------------------
-- STEP 7. PUBLISHED 이지만 필수 필드가 비어있는 레코드 리포트
--   결과를 보고 수동 점검/보강
-- ---------------------------------------------------------------------
SELECT
  COUNT(*)                                    AS total_published,
  COUNT(*) FILTER (WHERE "seoTitle" IS NULL OR "seoTitle" = '')           AS no_seoTitle,
  COUNT(*) FILTER (WHERE "seoDescription" IS NULL OR "seoDescription" = '') AS no_seoDescription,
  COUNT(*) FILTER (WHERE "aiSummary" IS NULL OR "aiSummary" = '')         AS no_aiSummary,
  COUNT(*) FILTER (WHERE "howToApply" IS NULL OR "howToApply" = 'null'::jsonb) AS no_howTo,
  COUNT(*) FILTER (WHERE "faqJson" IS NULL OR "faqJson" = 'null'::jsonb)  AS no_faq,
  COUNT(*) FILTER (WHERE "applyUrl" IS NULL OR "applyUrl" = '')           AS no_applyUrl
FROM "Policy"
WHERE "status" = 'PUBLISHED';

-- ---------------------------------------------------------------------
-- STEP 8. 샘플 확인 쿼리
-- ---------------------------------------------------------------------
SELECT id, title, "seoTitle", LEFT("seoDescription", 80) AS seo_desc_preview,
       LEFT("aiSummary", 80) AS ai_preview,
       jsonb_array_length("howToApply") AS howto_steps,
       jsonb_array_length("faqJson")    AS faq_count
FROM "Policy"
WHERE "status" = 'PUBLISHED'
ORDER BY id DESC
LIMIT 20;

-- =====================================================================
-- 끝.
-- 실행 시간: 약 1,300행 기준 수 초~수십 초
-- 필요 시 BEGIN; ... ROLLBACK; 로 사전 검증 후 커밋하세요.
-- =====================================================================
