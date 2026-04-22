/**
 * 공공데이터포털 (data.go.kr) REST 어댑터.
 * - 서버 전용 모듈. 절대 클라이언트 번들에 들어가면 안됩니다.
 * - 키는 DATA_GO_KR_KEY 환경변수에서 읽음 (URL 인코딩된 key 와 raw key 모두 지원)
 *
 * 지원 카탈로그 (최소 세트, 필요시 여기에 추가하면 UI 자동 확장됨):
 *  - 복지로 서비스목록
 *  - 복지로 서비스상세
 *  - 정부24 (minwon) 신청서비스
 *  - 소상공인24 지원정책
 *  - 온통청년 청년정책 통합
 *  - KOSIS 통계지표 (복지)
 */

export interface DataGoKrEndpoint {
  key: string // 카탈로그 키
  name: string // 사람이 읽는 이름
  base: string // 전체 URL (query string 제외)
  defaultParams?: Record<string, string>
  responseType?: 'json' | 'xml' // 포털 기본은 xml, type=json 지원 시 json
}

export const DATA_GO_KR_CATALOG: DataGoKrEndpoint[] = [
  {
    key: 'bokjiro.list',
    name: '복지로 서비스목록',
    base: 'https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001',
    defaultParams: { numOfRows: '50', pageNo: '1' },
    responseType: 'xml',
  },
  {
    key: 'bokjiro.detail',
    name: '복지로 서비스상세',
    base: 'https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfaredetailedV001',
    responseType: 'xml',
  },
  {
    key: 'gov24.minwon',
    name: '정부24 민원서비스',
    base: 'https://apis.data.go.kr/1741000/MinwonSvc',
    responseType: 'xml',
  },
  {
    key: 'kstartup.policy',
    name: '온통청년 청년정책',
    base: 'https://www.youthcenter.go.kr/opi/youthPlcyList.do',
    defaultParams: { rtnType: 'json', pageSize: '50', pageIndex: '1' },
    responseType: 'json',
  },
  {
    key: 'sbiz.policy',
    name: '소상공인24 지원정책',
    base: 'https://apis.data.go.kr/1130000/BizSupportPolicyService/getBizSupportPolicyList',
    defaultParams: { numOfRows: '50', pageNo: '1', type: 'json' },
    responseType: 'json',
  },
]

export function getServiceKey(): string {
  const k = process.env.DATA_GO_KR_KEY || ''
  if (!k) throw new Error('DATA_GO_KR_KEY not set')
  return k
}

export function buildUrl(
  ep: DataGoKrEndpoint,
  params: Record<string, string | number | undefined> = {}
): string {
  const serviceKey = getServiceKey()
  const sp = new URLSearchParams()
  // serviceKey 는 포털에서 이미 URL-encoded 된 값을 많이 내려주므로
  // URLSearchParams 가 재인코딩하지 않도록 수동 조립도 준비.
  const merged: Record<string, string> = { ...(ep.defaultParams || {}) }
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    merged[k] = String(v)
  }
  for (const [k, v] of Object.entries(merged)) sp.set(k, v)
  const qs = sp.toString()
  const sep = ep.base.includes('?') ? '&' : '?'
  return `${ep.base}${sep}serviceKey=${serviceKey}${qs ? '&' + qs : ''}`
}

export interface FetchResult<T = unknown> {
  ok: boolean
  status: number
  endpoint: string
  data?: T
  raw?: string
  error?: string
}

export async function fetchFromDataGoKr<T = unknown>(
  ep: DataGoKrEndpoint,
  params: Record<string, string | number | undefined> = {},
  opts: { timeoutMs?: number } = {}
): Promise<FetchResult<T>> {
  const url = buildUrl(ep, params)
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    const raw = await res.text()
    let data: any = undefined
    if (ep.responseType === 'json') {
      try { data = JSON.parse(raw) } catch { /* keep raw */ }
    }
    return {
      ok: res.ok,
      status: res.status,
      endpoint: ep.key,
      data,
      raw: ep.responseType === 'xml' ? raw : undefined,
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      endpoint: ep.key,
      error: err?.name === 'AbortError' ? 'timeout' : String(err?.message || err),
    }
  } finally {
    clearTimeout(t)
  }
}

/**
 * 매우 단순한 XML → JS 객체 변환 (복지로/정부24 전용, 외부 라이브러리 의존 없음).
 * - <item>...</item> 단위를 모두 긁어서 { tag: text } 매핑으로 반환.
 * - 복잡한 중첩 구조는 지원하지 않음 (최상위 <item> 1단만 가정).
 */
export function parseItemsFromXml(xml: string): Record<string, string>[] {
  if (!xml) return []
  const out: Record<string, string>[] = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  const tagRe = /<([a-zA-Z][\w:-]*)>([\s\S]*?)<\/\1>/g
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(xml))) {
    const body = m[1]
    const obj: Record<string, string> = {}
    let t: RegExpExecArray | null
    while ((t = tagRe.exec(body))) {
      const tag = t[1]
      const val = t[2].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
      obj[tag] = val
    }
    out.push(obj)
  }
  return out
}
