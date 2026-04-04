import { prisma } from './prisma'
import { nanoid } from 'nanoid'

const API_KEY = process.env.DATA_GO_KR_KEY ?? ''
const API_URL = 'https://apis.data.go.kr/B554287/NationalWelforeInformationsV001/getNationalWelforeInformationList'

const CATEGORIES = [
  { name: '지원금', slug: 'subsidy' },
  { name: '보조금', slug: 'grant' },
  { name: '바우처', slug: 'voucher' },
  { name: '환급금', slug: 'refund' },
  { name: '대출',   slug: 'loan' },
]

function xmlVal(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : ''
}

async function fetchFromAPI(): Promise<any[] | null> {
  if (!API_KEY) return null
  try {
    const url = `${API_URL}?serviceKey=${API_KEY}&numOfRows=50&pageNo=1`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const xml = await res.text()
    if (xml.includes('Unexpected errors') || xml.includes('<errMsg>')) return null
    const items = xml.match(/<servList>([\s\S]*?)<\/servList>/g)
    if (!items || items.length === 0) return null
    return items.map(item => ({
      title:   xmlVal(item, 'servNm'),
      excerpt: xmlVal(item, 'servDgst') || xmlVal(item, 'servNm'),
      content: xmlVal(item, 'servDgst') || '상세 내용은 해당 기관에 문의하세요.',
      applyUrl: xmlVal(item, 'servDtlLink') || null,
    })).filter(p => p.title)
  } catch {
    return null
  }
}

const SAMPLE_POLICIES = [
  { title: '2026년 청년 월세 지원', excerpt: '월 최대 20만원, 12개월간 청년 월세 지원', content: '<h2>지원 대상</h2><p>만 19~34세 무주택 청년으로 중위소득 60% 이하</p><h2>지원 내용</h2><p>월 최대 20만원, 최대 12개월간 지원</p><h2>신청 방법</h2><p>복지로 온라인 신청 또는 주민센터 방문</p>', category: '지원금', region: '서울', faqs: [{ q: '소득 기준이 어떻게 되나요?', a: '중위소득 60% 이하 1인가구 기준 약 130만원입니다.' }] },
  { title: '기초생활 생계급여 인상', excerpt: '2026년 기초생활 생계급여 역대 최대 인상', content: '<h2>변경 내용</h2><p>2026년 생계급여 기준 중위소득 32%로 인상</p><h2>지원 금액</h2><p>1인가구 기준 월 약 71만원, 4인가구 기준 월 약 183만원</p>', category: '지원금', region: null, faqs: [{ q: '기존 수급자는 자동 적용되나요?', a: '네, 별도 신청 없이 인상된 금액이 자동 적용됩니다.' }] },
  { title: '청년도약계좌 정부기여금', excerpt: '월 70만원 납입 시 정부가 최대 6%까지 기여금 매칭', content: '<h2>가입 대상</h2><p>만 19~34세, 개인소득 7,500만원 이하</p><h2>혜택</h2><p>5년 만기 시 약 5,000만원 목돈 마련</p>', category: '지원금', region: null, faqs: [{ q: '중도해지하면?', a: '3년 이내 해지 시 정부기여금은 반환해야 합니다.' }] },
  { title: '긴급복지 생활지원금', excerpt: '위기 상황 시 최대 163만원 긴급 지원', content: '<h2>지원 대상</h2><p>갑작스러운 실직, 질병, 화재 등 위기 상황 가구</p><h2>지원 내용</h2><p>생계지원 4인가구 기준 163만원</p>', category: '지원금', region: null, faqs: [{ q: '신청 후 얼마나 걸리나요?', a: '선지원 후조사 원칙으로 3일 이내 지급됩니다.' }] },
  { title: '영유아 보육료 전액 지원', excerpt: '어린이집 이용 영유아 보육료 전액 정부 지원', content: '<h2>대상</h2><p>어린이집을 이용하는 0~5세 영유아</p><h2>지원 금액</h2><p>0세 월 51.4만원, 1세 45.3만원, 2세 37.5만원</p>', category: '바우처', region: null, faqs: [{ q: '맞벌이 가정도 받을 수 있나요?', a: '네, 소득 무관 전 계층 지원됩니다.' }] },
  { title: '국민취업지원제도 구직촉진수당', excerpt: '구직활동 중 월 50만원씩 6개월 지원', content: '<h2>대상</h2><p>15~69세 구직자 중 중위소득 60% 이하</p><h2>지원</h2><p>월 50만원 × 6개월 = 최대 300만원</p>', category: '지원금', region: null, faqs: [{ q: '재직자도 가능?', a: '현재 미취업 상태여야 합니다.' }] },
  { title: '주거급여 임차료 지원', excerpt: '저소득 가구 월세 최대 52만원 지원', content: '<h2>대상</h2><p>중위소득 48% 이하 임차가구</p><h2>지원</h2><p>서울 4인가구 최대 52.7만원</p>', category: '보조금', region: '서울', faqs: [{ q: '전세도 지원?', a: '네, 전세금 이자 상당액을 산정하여 지원합니다.' }] },
  { title: '근로장려금 (EITC)', excerpt: '일하는 저소득 가구에 최대 330만원 지급', content: '<h2>대상</h2><p>총소득 기준 단독 2,200만원 이하</p><h2>지급액</h2><p>맞벌이 최대 330만원</p>', category: '환급금', region: null, faqs: [{ q: '자녀장려금과 중복?', a: '네, 동시에 받을 수 있습니다.' }] },
  { title: '자녀장려금', excerpt: '18세 미만 자녀 1인당 최대 100만원', content: '<h2>대상</h2><p>18세 미만 부양자녀, 총소득 7,000만원 이하</p><h2>지급액</h2><p>자녀 1인당 최대 100만원</p>', category: '환급금', region: null, faqs: [{ q: '대학생 자녀는?', a: '만 18세 미만이어야 합니다.' }] },
  { title: '문화누리카드', excerpt: '연간 13만원 문화·관광·체육 이용권', content: '<h2>대상</h2><p>기초생활수급자 및 차상위 계층</p><h2>지원</h2><p>1인당 연간 13만원</p>', category: '바우처', region: null, faqs: [{ q: '잔액 이월?', a: '연말까지 미사용 잔액은 소멸됩니다.' }] },
  { title: '소상공인 정책자금 대출', excerpt: '연 2%대 저금리 최대 1억원 대출', content: '<h2>대상</h2><p>업력 7년 이하 소상공인</p><h2>조건</h2><p>대출한도 1억원, 금리 연 2%대</p>', category: '대출', region: null, faqs: [{ q: '신용등급 제한?', a: '하위 10% 이하는 제한됩니다.' }] },
  { title: '전세자금 대출 (버팀목)', excerpt: '무주택 세대주 전세자금 최대 2억원 저금리', content: '<h2>대상</h2><p>무주택 세대주, 부부합산 연소득 5,000만원 이하</p><h2>조건</h2><p>금리 1.8~2.4%</p>', category: '대출', region: null, faqs: [{ q: '이미 전세대출이 있으면?', a: '합산 한도 내에서 가능합니다.' }] },
  { title: '에너지 바우처 (난방비 지원)', excerpt: '저소득 가구 난방비 연간 최대 21만원', content: '<h2>대상</h2><p>기초생활수급자 중 취약계층</p><h2>지원</h2><p>1인가구 9.15만원 ~ 6인 이상 21만원</p>', category: '바우처', region: null, faqs: [{ q: '여름에도 사용?', a: '네, 냉방비(전기)로도 사용 가능합니다.' }] },
  { title: '경기도 청년 기본소득', excerpt: '경기도 거주 만 24세 청년 분기별 25만원', content: '<h2>대상</h2><p>경기도 1년 이상 거주 만 24세</p><h2>지원</h2><p>분기별 25만원, 연 100만원 지역화폐</p>', category: '지원금', region: '경기', faqs: [{ q: '소득 제한?', a: '소득 제한 없이 만 24세 모든 청년 대상입니다.' }] },
  { title: '서울시 희망두배 청년통장', excerpt: '월 15만원 저축 시 서울시가 동일 금액 매칭', content: '<h2>대상</h2><p>서울 거주 만 18~34세, 근로소득 월 255만원 이하</p><h2>혜택</h2><p>3년간 매칭 → 만기 시 1,080만원</p>', category: '지원금', region: '서울', faqs: [{ q: '중도해지하면?', a: '2년 이상 유지 시 매칭금 50% 수령 가능.' }] },
  { title: '출산축하금 (첫만남이용권)', excerpt: '출생아 1인당 200만원 바우처 지급', content: '<h2>대상</h2><p>2022년 이후 출생아</p><h2>지원</h2><p>출생아 1인당 200만원 국민행복카드</p>', category: '바우처', region: null, faqs: [{ q: '쌍둥이는?', a: '각 200만원씩 총 400만원 지원.' }] },
  { title: '부모급여 (영아수당)', excerpt: '0세 월 100만원, 1세 월 50만원 현금 지급', content: '<h2>대상</h2><p>만 0~1세 영아 부모</p><h2>지원</h2><p>0세 월 100만원, 1세 월 50만원</p>', category: '지원금', region: null, faqs: [{ q: '어린이집 보내면?', a: '보육료 차액만큼 현금 지급됩니다.' }] },
  { title: '국민연금 실업크레딧', excerpt: '실직 기간 국민연금 보험료 75% 정부 지원', content: '<h2>대상</h2><p>18~60세 구직급여 수급자</p><h2>지원</h2><p>최대 12개월, 보험료 75% 정부 부담</p>', category: '보조금', region: null, faqs: [{ q: '자영업자도?', a: '고용보험 가입 자영업자가 폐업 후 구직급여 수급 시 가능.' }] },
  { title: '장애인 활동지원 급여', excerpt: '장애인 일상생활 지원 월 최대 480시간', content: '<h2>대상</h2><p>만 6~65세 장애인</p><h2>지원</h2><p>월 기본 60~480시간 활동보조 서비스</p>', category: '보조금', region: null, faqs: [{ q: '65세 이상은?', a: '노인장기요양보험으로 전환됩니다.' }] },
  { title: '디지털 배움터 교육 지원', excerpt: '무료 디지털 역량 교육 + 수료 시 수당 지급', content: '<h2>대상</h2><p>디지털 역량 강화 필요 전 국민</p><h2>내용</h2><p>스마트폰, 키오스크, AI 활용 1:1 교육</p>', category: '바우처', region: null, faqs: [{ q: '교육비?', a: '전액 무료, 수료 시 소정의 수당도 지급.' }] },
]

function guessCategory(title: string): string {
  if (/대출|전세자금|금리/.test(title)) return '대출'
  if (/바우처|이용권|카드|누리|보육료|교육/.test(title)) return '바우처'
  if (/환급|장려금|EITC|크레딧/.test(title)) return '환급금'
  if (/보조|급여|활동지원|주거급여|실업/.test(title)) return '보조금'
  return '지원금'
}

function makeSlug(title: string): string {
  return title.replace(/[^\w가-힣\s]/g, '').replace(/\s+/g, '-').toLowerCase().slice(0, 60) + '-' + nanoid(6)
}

/** DB가 비어있으면 자동으로 시드 데이터를 채운다 */
export async function autoSeedIfEmpty() {
  try {
    const count = await prisma.policy.count()
    if (count > 0) return // 이미 데이터 있음

    console.log('[auto-seed] DB가 비어있어 자동 시드를 시작합니다...')

    // 카테고리 upsert
    const categoryMap: Record<string, number> = {}
    for (const cat of CATEGORIES) {
      const result = await prisma.category.upsert({
        where:  { slug: cat.slug },
        update: { name: cat.name },
        create: { name: cat.name, slug: cat.slug },
      })
      categoryMap[cat.name] = result.id
    }

    // 공공API 시도 → fallback
    let policies = await fetchFromAPI()
    if (!policies) policies = SAMPLE_POLICIES

    for (const p of policies) {
      const title = p.title
      const categoryName = p.category ?? guessCategory(title)
      const categoryId = categoryMap[categoryName] ?? categoryMap['지원금']
      const existing = await prisma.policy.findFirst({ where: { title } })
      if (existing) continue

      const faqs = p.faqs ?? []
      await prisma.policy.create({
        data: {
          slug: makeSlug(title),
          title,
          content:      p.content ?? `<p>${p.excerpt ?? title}</p>`,
          excerpt:      p.excerpt ?? title,
          focusKeyword: title.split(' ').slice(0, 3).join(' '),
          metaDesc:     p.excerpt ?? title,
          status:       'PUBLISHED',
          categoryId,
          geoRegion:    p.region ?? null,
          publishedAt:  new Date(),
          faqs: faqs.length > 0
            ? { create: faqs.map((f: any, i: number) => ({ question: f.q, answer: f.a, order: i })) }
            : undefined,
        },
      })
    }

    console.log(`[auto-seed] 완료: ${policies.length}건`)
  } catch (e) {
    console.error('[auto-seed] 실패:', e)
  }
}
