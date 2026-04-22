-- ============================================================
-- Policy 테이블 마크다운 노이즈 제거
--   - 대상: title, content, description, excerpt, eligibility,
--          applicationMethod, requiredDocuments, metaDesc, focusKeyword
--   - **text** / *text* / # 제목 / [링크](url) / 불릿 → plain text
--   - Faq 테이블의 question / answer 도 함께 정리
-- ============================================================
-- 실행 전 스냅샷 권장. BEGIN/COMMIT 트랜잭션 내에서 실행됩니다.
-- ============================================================

BEGIN;

-- ============ POLICY ============

-- 1) **bold** / __bold__
UPDATE "Policy"
SET
  title = regexp_replace(title, '\*\*([^*\n]+)\*\*', '\1', 'g'),
  content = regexp_replace(content, '\*\*([^*\n]+)\*\*', '\1', 'g'),
  description = regexp_replace(coalesce(description, ''), '\*\*([^*\n]+)\*\*', '\1', 'g'),
  excerpt = regexp_replace(coalesce(excerpt, ''), '\*\*([^*\n]+)\*\*', '\1', 'g'),
  eligibility = regexp_replace(coalesce(eligibility, ''), '\*\*([^*\n]+)\*\*', '\1', 'g'),
  "applicationMethod" = regexp_replace(coalesce("applicationMethod", ''), '\*\*([^*\n]+)\*\*', '\1', 'g'),
  "requiredDocuments" = regexp_replace(coalesce("requiredDocuments", ''), '\*\*([^*\n]+)\*\*', '\1', 'g'),
  "metaDesc" = regexp_replace(coalesce("metaDesc", ''), '\*\*([^*\n]+)\*\*', '\1', 'g')
WHERE
     title ~ '\*\*[^*\n]+\*\*'
  OR content ~ '\*\*[^*\n]+\*\*'
  OR coalesce(description, '') ~ '\*\*[^*\n]+\*\*'
  OR coalesce(excerpt, '') ~ '\*\*[^*\n]+\*\*'
  OR coalesce(eligibility, '') ~ '\*\*[^*\n]+\*\*'
  OR coalesce("applicationMethod", '') ~ '\*\*[^*\n]+\*\*'
  OR coalesce("requiredDocuments", '') ~ '\*\*[^*\n]+\*\*'
  OR coalesce("metaDesc", '') ~ '\*\*[^*\n]+\*\*';

-- 2) Heading `# ~ ######` → 본문화 (줄 시작 한정)
UPDATE "Policy"
SET
  content = regexp_replace(content, '(^|\n)[ \t]{0,3}#{1,6}[ \t]+', '\1', 'g'),
  description = regexp_replace(coalesce(description, ''), '(^|\n)[ \t]{0,3}#{1,6}[ \t]+', '\1', 'g'),
  eligibility = regexp_replace(coalesce(eligibility, ''), '(^|\n)[ \t]{0,3}#{1,6}[ \t]+', '\1', 'g'),
  "applicationMethod" = regexp_replace(coalesce("applicationMethod", ''), '(^|\n)[ \t]{0,3}#{1,6}[ \t]+', '\1', 'g'),
  "requiredDocuments" = regexp_replace(coalesce("requiredDocuments", ''), '(^|\n)[ \t]{0,3}#{1,6}[ \t]+', '\1', 'g')
WHERE
     content ~ '(^|\n)[ \t]{0,3}#{1,6}[ \t]+'
  OR coalesce(description, '') ~ '(^|\n)[ \t]{0,3}#{1,6}[ \t]+'
  OR coalesce(eligibility, '') ~ '(^|\n)[ \t]{0,3}#{1,6}[ \t]+'
  OR coalesce("applicationMethod", '') ~ '(^|\n)[ \t]{0,3}#{1,6}[ \t]+'
  OR coalesce("requiredDocuments", '') ~ '(^|\n)[ \t]{0,3}#{1,6}[ \t]+';

-- 3) 불릿 리스트 - * + 1. → "· "
UPDATE "Policy"
SET
  content = regexp_replace(content, '(^|\n)[ \t]*[-*+][ \t]+', '\1· ', 'g'),
  description = regexp_replace(coalesce(description, ''), '(^|\n)[ \t]*[-*+][ \t]+', '\1· ', 'g'),
  eligibility = regexp_replace(coalesce(eligibility, ''), '(^|\n)[ \t]*[-*+][ \t]+', '\1· ', 'g'),
  "applicationMethod" = regexp_replace(coalesce("applicationMethod", ''), '(^|\n)[ \t]*[-*+][ \t]+', '\1· ', 'g'),
  "requiredDocuments" = regexp_replace(coalesce("requiredDocuments", ''), '(^|\n)[ \t]*[-*+][ \t]+', '\1· ', 'g');

UPDATE "Policy"
SET
  content = regexp_replace(content, '(^|\n)[ \t]*\d+\.[ \t]+', '\1· ', 'g'),
  description = regexp_replace(coalesce(description, ''), '(^|\n)[ \t]*\d+\.[ \t]+', '\1· ', 'g'),
  eligibility = regexp_replace(coalesce(eligibility, ''), '(^|\n)[ \t]*\d+\.[ \t]+', '\1· ', 'g');

-- 4) [text](url) → text
UPDATE "Policy"
SET
  title = regexp_replace(title, '\[([^\]]+)\]\([^)]+\)', '\1', 'g'),
  content = regexp_replace(content, '\[([^\]]+)\]\([^)]+\)', '\1', 'g'),
  description = regexp_replace(coalesce(description, ''), '\[([^\]]+)\]\([^)]+\)', '\1', 'g'),
  excerpt = regexp_replace(coalesce(excerpt, ''), '\[([^\]]+)\]\([^)]+\)', '\1', 'g'),
  eligibility = regexp_replace(coalesce(eligibility, ''), '\[([^\]]+)\]\([^)]+\)', '\1', 'g'),
  "applicationMethod" = regexp_replace(coalesce("applicationMethod", ''), '\[([^\]]+)\]\([^)]+\)', '\1', 'g')
WHERE
     title ~ '\[[^\]]+\]\([^)]+\)'
  OR content ~ '\[[^\]]+\]\([^)]+\)'
  OR coalesce(description, '') ~ '\[[^\]]+\]\([^)]+\)'
  OR coalesce(excerpt, '') ~ '\[[^\]]+\]\([^)]+\)'
  OR coalesce(eligibility, '') ~ '\[[^\]]+\]\([^)]+\)'
  OR coalesce("applicationMethod", '') ~ '\[[^\]]+\]\([^)]+\)';

-- 5) 공백 정리 (double space → single)
UPDATE "Policy"
SET
  content = regexp_replace(content, '[ \t]{2,}', ' ', 'g'),
  description = regexp_replace(coalesce(description, ''), '[ \t]{2,}', ' ', 'g'),
  excerpt = regexp_replace(coalesce(excerpt, ''), '[ \t]{2,}', ' ', 'g'),
  eligibility = regexp_replace(coalesce(eligibility, ''), '[ \t]{2,}', ' ', 'g');

-- 6) applyUrl 정리 (trim + http→https)
UPDATE "Policy" SET "applyUrl" = NULLIF(btrim("applyUrl"), '') WHERE "applyUrl" IS NOT NULL;
UPDATE "Policy" SET "applyUrl" = regexp_replace("applyUrl", '^http://', 'https://') WHERE "applyUrl" LIKE 'http://%';

-- ============ FAQ ============
UPDATE "Faq"
SET
  question = regexp_replace(question, '\*\*([^*\n]+)\*\*', '\1', 'g'),
  answer = regexp_replace(answer, '\*\*([^*\n]+)\*\*', '\1', 'g')
WHERE question ~ '\*\*[^*\n]+\*\*' OR answer ~ '\*\*[^*\n]+\*\*';

UPDATE "Faq"
SET
  question = regexp_replace(question, '(^|\n)[ \t]{0,3}#{1,6}[ \t]+', '\1', 'g'),
  answer = regexp_replace(answer, '(^|\n)[ \t]{0,3}#{1,6}[ \t]+', '\1', 'g')
WHERE question ~ '(^|\n)[ \t]{0,3}#{1,6}[ \t]+' OR answer ~ '(^|\n)[ \t]{0,3}#{1,6}[ \t]+';

-- ============ 결과 리포트 ============
SELECT
  'Policy' AS table_name,
  COUNT(*) FILTER (WHERE content ~ '\*\*|##|\[[^\]]+\]\([^)]+\)') AS remaining_content_noise,
  COUNT(*) FILTER (WHERE coalesce(description, '') ~ '\*\*|##') AS remaining_desc_noise,
  COUNT(*) FILTER (WHERE coalesce("applyUrl", '') LIKE 'http://%') AS http_urls_remaining
FROM "Policy";

COMMIT;
