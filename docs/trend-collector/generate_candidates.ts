/**
 * 정책 후보(PolicyCandidate) 자동 생성
 * ------------------------------------------------------------------
 * 파이프라인:
 *   (1) 최근 7일간 수집된 NewsItem 중 정책 키워드 히트 3건 이상인 토픽 선별
 *   (2) 동일 토픽이 이미 TrendKeyword에 잡혔는지 확인 (Naver/Google 급상승 여부)
 *   (3) 기존 Policy 테이블 제목과 cosine >= 0.85면 중복으로 판단, skip
 *   (4) 조건 통과한 토픽에 대해 PolicyCandidate(status=PENDING) upsert
 *
 * 후속 단계: 관리자가 /admin/trends 에서 수동으로 Approve → 실제 Policy 생성.
 * 자동으로 Policy를 만들지 않는다 (공신력/오탐 방지).
 */

import { PrismaClient, TrendSource, CandidateStatus } from '@prisma/client';
import { normalizeTopic, extractFromTitle, cosineSimilarity } from './keyword_extract';

const prisma = new PrismaClient();

const MIN_NEWS_COUNT_7D = 3; // 7일 내 3건 이상 언급
const SIMILARITY_THRESHOLD = 0.85; // 기존 정책과 중복 판정 임계값

interface TopicBucket {
  topic: string; // normalizedTopic
  displayKeyword: string; // 가장 자주 나온 원본 키워드
  newsItemIds: number[];
  newsCount: number;
  agencyCandidates: Map<string, number>; // 부처명 빈도
}

/**
 * 최근 7일 뉴스 + 트렌드 지표 → PolicyCandidate 생성
 * @returns 새로 생성된 후보 수
 */
export async function generateCandidates(): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 1) 최근 7일 뉴스 로드
  const news = await prisma.newsItem.findMany({
    where: { publishedAt: { gte: sevenDaysAgo } },
    select: { id: true, title: true, agency: true, matchedKeywords: true },
  });

  // 2) 토픽 버킷으로 그루핑
  const buckets = new Map<string, TopicBucket>();
  const keywordFreq = new Map<string, Map<string, number>>(); // topic → (rawKeyword → count)

  for (const item of news) {
    const extracted = extractFromTitle(item.title);
    const kwList = extracted.length > 0 ? extracted : (item.matchedKeywords ?? []);

    for (const raw of kwList) {
      const topic = normalizeTopic(raw);
      if (!topic || topic.length < 2) continue;

      if (!buckets.has(topic)) {
        buckets.set(topic, {
          topic,
          displayKeyword: raw,
          newsItemIds: [],
          newsCount: 0,
          agencyCandidates: new Map(),
        });
        keywordFreq.set(topic, new Map());
      }
      const bucket = buckets.get(topic)!;
      bucket.newsItemIds.push(item.id);
      bucket.newsCount += 1;
      if (item.agency) {
        bucket.agencyCandidates.set(
          item.agency,
          (bucket.agencyCandidates.get(item.agency) ?? 0) + 1,
        );
      }
      const kwMap = keywordFreq.get(topic)!;
      kwMap.set(raw, (kwMap.get(raw) ?? 0) + 1);
    }
  }

  // 가장 많이 등장한 원본 키워드를 displayKeyword로
  for (const [topic, bucket] of buckets) {
    const kwMap = keywordFreq.get(topic)!;
    let best = bucket.displayKeyword;
    let bestCount = 0;
    for (const [kw, cnt] of kwMap) {
      if (cnt > bestCount) {
        best = kw;
        bestCount = cnt;
      }
    }
    bucket.displayKeyword = best;
  }

  // 3) 필터링: 3건 이상 언급된 토픽만
  const qualified = [...buckets.values()].filter((b) => b.newsCount >= MIN_NEWS_COUNT_7D);

  // 4) 기존 Policy와 중복 체크
  const existingPolicies = await prisma.policy.findMany({
    select: { id: true, title: true },
  });
  const existingTopics = existingPolicies.map((p) => ({
    id: p.id,
    normalized: normalizeTopic(p.title),
  }));

  // 5) TrendKeyword 급상승 여부 조회 (최근 24h 기준)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentTrends = await prisma.trendKeyword.findMany({
    where: { capturedAt: { gte: oneDayAgo } },
    select: { normalizedTopic: true, score: true, source: true },
  });
  const trendByTopic = new Map<string, { score: number; sources: Set<TrendSource> }>();
  for (const t of recentTrends) {
    const key = t.normalizedTopic ?? '';
    if (!key) continue;
    if (!trendByTopic.has(key)) {
      trendByTopic.set(key, { score: 0, sources: new Set() });
    }
    const entry = trendByTopic.get(key)!;
    entry.score = Math.max(entry.score, t.score);
    entry.sources.add(t.source);
  }

  // 6) 후보 upsert
  let created = 0;
  for (const b of qualified) {
    // 기존 정책과 유사도 체크
    const dup = existingTopics.find(
      (ex) => cosineSimilarity(ex.normalized, b.topic) >= SIMILARITY_THRESHOLD,
    );
    if (dup) continue;

    // 트렌드 점수 가산
    const trendHit = trendByTopic.get(b.topic);
    const trendScore = trendHit
      ? trendHit.score + (trendHit.sources.size >= 2 ? 20 : 0) // 두 소스 모두 급상승이면 보너스
      : 0;

    // 대표 부처
    let bestAgency: string | null = null;
    let bestAgencyCount = 0;
    for (const [ag, cnt] of b.agencyCandidates) {
      if (cnt > bestAgencyCount) {
        bestAgency = ag;
        bestAgencyCount = cnt;
      }
    }

    // 이미 PENDING으로 등록된 동일 topic이면 갱신
    const existing = await prisma.policyCandidate.findFirst({
      where: { topic: b.topic, status: CandidateStatus.PENDING },
    });

    if (existing) {
      await prisma.policyCandidate.update({
        where: { id: existing.id },
        data: {
          newsItemIds: Array.from(new Set([...existing.newsItemIds, ...b.newsItemIds])),
          trendScore,
          agency: bestAgency,
        },
      });
    } else {
      await prisma.policyCandidate.create({
        data: {
          topic: b.topic,
          suggestedTitle: b.displayKeyword,
          agency: bestAgency,
          summary: `최근 7일간 ${b.newsCount}건의 관련 보도. 트렌드 점수 ${trendScore}.`,
          newsItemIds: b.newsItemIds,
          trendScore,
          status: CandidateStatus.PENDING,
        },
      });
      created += 1;
    }
  }

  console.log(
    `[generate_candidates] qualified topics: ${qualified.length}, new candidates: ${created}`,
  );
  return created;
}
