/**
 * 인덱싱 센터 공통 타입
 */

export type IndexingTrigger =
  | 'MANUAL_ALL'
  | 'MANUAL_URL'
  | 'CRON_DAILY'
  | 'PUBLISH_HOOK';

export type IndexingEngine =
  | 'INDEXNOW'
  | 'GOOGLE_API'
  | 'SITEMAP_PING'
  | 'NAVER_MANUAL';

export type IndexingStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

/** 단일 엔진 푸시 결과 */
export interface EngineResult {
  engine: IndexingEngine;
  status: IndexingStatus;
  httpStatus?: number;
  urlCount: number;
  sampleUrls: string[]; // 디버그용 최대 10개
  errorMsg?: string;
  durationMs: number;
  meta?: Record<string, unknown>;
}

/** 푸시 오케스트레이터 최종 결과 */
export interface PushResult {
  trigger: IndexingTrigger;
  totalUrls: number;
  engines: EngineResult[];
  startedAt: string; // ISO
  finishedAt: string;
  overallStatus: IndexingStatus;
}

export const SITE_ORIGIN = 'https://www.govmate.co.kr';
