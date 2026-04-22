/**
 * lib/external-popularity.ts
 * ------------------------------------------------------------------
 * 외부 인기도 시그널(네이버/구글) 계산 모듈.
 *
 * 목적:
 *   "가장 많이 보는 지원금" 순위를 자체 PageView 뿐 아니라
 *   네이버/구글 검색에서 실제로 자주 노출/검색되는 정책 기준으로도 반영.
 *
 * 전략:
 *   1) Naver News API — 정책 키워드로 검색해 매칭 기사 수를 점수화
 *      (제목 + 본문 포함, 100건 상한 → 0~100 점 맵핑)
 *   2) Google Trends API 는 공식 API 가 없으므로, 환경변수
 *      GOOGLE_TRENDS_ENDPOINT (self-host serpapi/pytrends 프록시) 가 있을 때만 사용.
 *      없으면 Naver 점수만 사용 — 기능적 퇴행 없음.
 *
 * 키워드 추출:
 *   - 정책 title 에서 cleanTitle 처리 후 핵심 2~3단어를 뽑아 OR 조합.
 *   - 너무 일반적인 단어(2글자 이하, "지원", "사업" 등)는 제외.
 *
 * 결과:
 *   externalScore (0~100) → trending.ts 가중합에서 사용.
 */

import { searchNaverNews } from '@/lib/collectors/naver-news';
import { cleanTitle } from '@/lib/policy-display';

// Naver API 일일 호출 제한(25,000) 고려 → 각 정책 1회 호출, 100건 제한
const NAVER_MAX_RESULTS = 100;

// 제외 일반어 (점수 왜곡 방지)
const STOPWORDS = new Set([
  '지원', '사업', '지원금', '보조금', '제도', '공고', '모집', '안내',
  '신청', '추가', '확대', '개편', '혜택', '프로그램', '청년', '노인',
]);

/** title → 검색용 핵심 키워드 2~3개 추출 */
export function extractKeywords(title: string | null | undefined): string[] {
  const t = cleanTitle(title);
  if (!t) return [];
  // 공백 분리 → 2글자 초과 + 숫자/특수문자 없는 것만
  const tokens = t
    .split(/[\s·ㆍ\-·/()[\]【】「」『』,]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !STOPWORDS.has(w));
  // 긴 것 우선 (정보량 ↑) → 최대 3개
  tokens.sort((a, b) => b.length - a.length);
  return tokens.slice(0, 3);
}

/**
 * 하나의 정책에 대해 네이버 인기도 점수 계산.
 * @returns 0~100 사이의 점수. API 실패/키 없음 → 0 반환.
 */
export async function computeNaverPopularity(title: string | null | undefined): Promise<number> {
  const keywords = extractKeywords(title);
  if (keywords.length === 0) return 0;

  // 핵심 키워드 1개로 검색 (가장 긴 토큰) — API 호출 절약
  const query = keywords[0];
  try {
    const items = await searchNaverNews(query, NAVER_MAX_RESULTS);
    // 매칭 수 기반 0~100 스케일. 100건 이상이면 100점 캡.
    const count = Math.min(items.length, NAVER_MAX_RESULTS);
    return count;
  } catch (err) {
    console.warn(
      `[external-popularity] naver "${query}" failed:`,
      (err as Error).message,
    );
    return 0;
  }
}

/**
 * 외부 인기도 배치 동기화 실행 (Cron/Admin 버튼 공통).
 * @returns 처리 개수 + 실제 업데이트 수 + 경과시간
 */
export async function runPopularitySync(options: {
  batchLimit?: number;
  concurrency?: number;
} = {}): Promise<{
  ok: boolean;
  processed: number;
  updated: number;
  durationMs: number;
  error?: string;
}> {
  const { prisma } = await import('@/lib/prisma');
  const hasKey =
    !!process.env.NAVER_CLIENT_ID && !!process.env.NAVER_CLIENT_SECRET;
  if (!hasKey) {
    return {
      ok: false,
      processed: 0,
      updated: 0,
      durationMs: 0,
      error: 'NAVER_CLIENT_ID/SECRET not set',
    };
  }

  const batchLimit = options.batchLimit ?? 300;
  const started = Date.now();

  const policies = await prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, title: true },
    orderBy: [{ externalSyncedAt: 'asc' }],
    take: batchLimit,
  });
  if (policies.length === 0) {
    return { ok: true, processed: 0, updated: 0, durationMs: 0 };
  }

  const scores = await computeBatchPopularity(policies, options.concurrency ?? 3);

  const now = new Date();
  const entries = Array.from(scores.entries());
  let updated = 0;
  for (let i = 0; i < entries.length; i += 50) {
    const chunk = entries.slice(i, i + 50);
    await Promise.all(
      chunk.map(([id, score]) =>
        prisma.policy
          .update({
            where: { id },
            data: { externalScore: score, externalSyncedAt: now },
          })
          .then(() => {
            updated++;
          })
          .catch(() => {}),
      ),
    );
  }

  return {
    ok: true,
    processed: policies.length,
    updated,
    durationMs: Date.now() - started,
  };
}

/**
 * 여러 정책을 배치로 처리 (Naver API rate limit 고려, 병렬 제한).
 * @param policies title + id 쌍의 배열
 * @param concurrency 동시 호출 수 (기본 3)
 */
export async function computeBatchPopularity(
  policies: { id: number; title: string | null }[],
  concurrency = 3,
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  let idx = 0;

  async function worker() {
    while (idx < policies.length) {
      const cur = idx++;
      const p = policies[cur];
      const score = await computeNaverPopularity(p.title);
      result.set(p.id, score);
      // 간헐적 throttle (호출 폭주 방지)
      if (cur % 20 === 19) await new Promise((r) => setTimeout(r, 500));
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);
  return result;
}
