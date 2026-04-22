/**
 * 대한민국 17개 광역시·도 데이터.
 * - slug: URL 용 라틴 약어
 * - name: 한글 전체 명
 * - short: 한글 약어
 * - iso: ISO 3166-2:KR 코드 (geo.region 메타)
 * - aliases: DB의 geoRegion 필드와 매칭할 때 쓰는 후보 문자열들
 */

export interface KrRegion {
  slug: string
  name: string
  short: string
  iso: string
  aliases: string[]
}

export const KR_REGIONS: KrRegion[] = [
  { slug: 'seoul',     name: '서울특별시',     short: '서울', iso: 'KR-11', aliases: ['서울', '서울시', '서울특별시'] },
  { slug: 'busan',     name: '부산광역시',     short: '부산', iso: 'KR-26', aliases: ['부산', '부산시', '부산광역시'] },
  { slug: 'daegu',     name: '대구광역시',     short: '대구', iso: 'KR-27', aliases: ['대구', '대구시', '대구광역시'] },
  { slug: 'incheon',   name: '인천광역시',     short: '인천', iso: 'KR-28', aliases: ['인천', '인천시', '인천광역시'] },
  { slug: 'gwangju',   name: '광주광역시',     short: '광주', iso: 'KR-29', aliases: ['광주', '광주시', '광주광역시'] },
  { slug: 'daejeon',   name: '대전광역시',     short: '대전', iso: 'KR-30', aliases: ['대전', '대전시', '대전광역시'] },
  { slug: 'ulsan',     name: '울산광역시',     short: '울산', iso: 'KR-31', aliases: ['울산', '울산시', '울산광역시'] },
  { slug: 'sejong',    name: '세종특별자치시', short: '세종', iso: 'KR-50', aliases: ['세종', '세종시', '세종특별자치시'] },
  { slug: 'gyeonggi',  name: '경기도',         short: '경기', iso: 'KR-41', aliases: ['경기', '경기도'] },
  { slug: 'gangwon',   name: '강원특별자치도', short: '강원', iso: 'KR-42', aliases: ['강원', '강원도', '강원특별자치도'] },
  { slug: 'chungbuk',  name: '충청북도',       short: '충북', iso: 'KR-43', aliases: ['충북', '충청북도'] },
  { slug: 'chungnam',  name: '충청남도',       short: '충남', iso: 'KR-44', aliases: ['충남', '충청남도'] },
  { slug: 'jeonbuk',   name: '전북특별자치도', short: '전북', iso: 'KR-45', aliases: ['전북', '전라북도', '전북특별자치도'] },
  { slug: 'jeonnam',   name: '전라남도',       short: '전남', iso: 'KR-46', aliases: ['전남', '전라남도'] },
  { slug: 'gyeongbuk', name: '경상북도',       short: '경북', iso: 'KR-47', aliases: ['경북', '경상북도'] },
  { slug: 'gyeongnam', name: '경상남도',       short: '경남', iso: 'KR-48', aliases: ['경남', '경상남도'] },
  { slug: 'jeju',      name: '제주특별자치도', short: '제주', iso: 'KR-49', aliases: ['제주', '제주도', '제주특별자치도'] },
]

export const REGION_BY_SLUG: Record<string, KrRegion> = Object.fromEntries(
  KR_REGIONS.map((r) => [r.slug, r])
)

export function resolveRegionByAlias(text: string | null | undefined): KrRegion | null {
  if (!text) return null
  const t = text.trim()
  for (const r of KR_REGIONS) {
    if (r.aliases.some((a) => t === a || t.startsWith(a))) return r
  }
  return null
}

/** geoRegion 필드를 대략 매칭할 때 쓰는 WHERE 조각 (Prisma 용) */
export function regionAliasContainsFilter(region: KrRegion) {
  return {
    OR: region.aliases.map((a) => ({
      geoRegion: { contains: a, mode: 'insensitive' as const },
    })),
  }
}
