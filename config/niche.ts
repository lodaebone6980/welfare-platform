// config/niche.ts
// 이 파일만 바꾸면 새 니치 사이트가 됩니다

export type NicheType = 'welfare' | 'travel' | 'recipe' | 'shopping' | 'investment'

export interface NicheConfig {
  name: string
  domain: string
  rssSources: { name: string; url: string }[]
  mustKeywords: string[]
  gptSystemPrompt: string
  monetization: 'adsense' | 'cpa_booking' | 'coupang_partners' | 'securities_cpa'
  cpaConfig?: {
    provider: string
    commissionRate: string
    apiKey?: string
  }
}

const CONFIGS: Record<NicheType, NicheConfig> = {

  // ✅ 현재 운영 중
  welfare: {
    name: '복지길잡이',
    domain: 'yourdomain.com',
    rssSources: [
      { name: '보건복지부', url: 'https://www.mohw.go.kr/react/rss/rss.jsp' },
      { name: '고용노동부', url: 'https://www.moel.go.kr/rss/news.rss' },
      { name: '정책브리핑', url: 'https://www.korea.kr/rss/news.xml' },
      { name: '연합뉴스경제', url: 'https://www.yna.co.kr/rss/economy.xml' },
      { name: '뉴시스사회', url: 'https://www.newsis.com/RSS/society.xml' },
    ],
    mustKeywords: ['지원금','환급금','보조금','바우처','장려금','급여','혜택','신청'],
    gptSystemPrompt: `당신은 대한민국 정부 지원금 정보를 쉽게 전달하는 전문 블로거입니다.
30~70대 일반인이 이해할 수 있게 친근하게 작성합니다.
신청방법·대상·금액을 항상 명확히 포함합니다.`,
    monetization: 'adsense',
  },

  // 🔜 확장 예정 1
  travel: {
    name: '여행핫딜넷',
    domain: 'travel.yourdomain.com',
    rssSources: [
      { name: '투어비스', url: 'https://www.tourvis.com/rss' },
      { name: '네이버여행', url: 'https://news.naver.com/rss/section/103.xml' },
    ],
    mustKeywords: ['호텔','항공','여행','특가','할인','투어','렌트카'],
    gptSystemPrompt: `당신은 여행 정보를 감성적으로 전달하는 전문 여행 블로거입니다.
가격·날짜·예약방법을 항상 포함하고 설레는 톤으로 작성합니다.`,
    monetization: 'cpa_booking',
    cpaConfig: {
      provider: 'Booking.com',
      commissionRate: '7~10%',
    },
  },

  // 🔜 확장 예정 2
  recipe: {
    name: '레시피핫',
    domain: 'recipe.yourdomain.com',
    rssSources: [
      { name: '10분요리', url: 'https://www.10minutes.co.kr/rss' },
      { name: '만개의레시피', url: 'https://www.10000recipe.com/rss' },
    ],
    mustKeywords: ['레시피','요리','만드는법','재료','음식','쿠킹'],
    gptSystemPrompt: `당신은 쉽고 맛있는 요리 레시피를 전달하는 블로거입니다.
재료·순서·팁을 명확하게 작성하고 쿠팡 구매 링크를 자연스럽게 포함합니다.`,
    monetization: 'coupang_partners',
    cpaConfig: {
      provider: '쿠팡 파트너스',
      commissionRate: '3~12%',
    },
  },

  // 🔜 확장 예정 3
  shopping: {
    name: '핫딜모아',
    domain: 'deal.yourdomain.com',
    rssSources: [
      { name: '클리앙핫딜', url: 'https://www.clien.net/service/board/hotdeal?&sort=reg_date&boardType=G&isBoard=true' },
      { name: '뽐뿌', url: 'https://www.ppomppu.co.kr/rss.php?id=ppomppu' },
      { name: '루리웹핫딜', url: 'https://bbs.ruliweb.com/market/board/1020?page=1&v=rss' },
    ],
    mustKeywords: ['핫딜','특가','할인','쿠폰','타임세일','최저가'],
    gptSystemPrompt: `당신은 핫딜 정보를 빠르고 명확하게 전달하는 블로거입니다.
가격·할인율·구매링크·마감시간을 항상 포함합니다. 간결하게 작성합니다.`,
    monetization: 'coupang_partners',
    cpaConfig: {
      provider: '쿠팡 파트너스',
      commissionRate: '3~12%',
    },
  },

  // 🔜 확장 예정 4
  investment: {
    name: '재테크플러스',
    domain: 'invest.yourdomain.com',
    rssSources: [
      { name: '한국경제', url: 'https://www.hankyung.com/feed/economy' },
      { name: '매일경제', url: 'https://www.mk.co.kr/rss/40300001/' },
      { name: '연합뉴스금융', url: 'https://www.yna.co.kr/rss/market.xml' },
    ],
    mustKeywords: ['주식','부동산','재테크','금리','투자','펀드','ETF','코인'],
    gptSystemPrompt: `당신은 재테크·투자 정보를 쉽게 전달하는 블로거입니다.
수치·근거를 항상 포함하고 초보자도 이해할 수 있게 작성합니다.
투자 판단은 독자 본인의 책임임을 항상 안내합니다.`,
    monetization: 'securities_cpa',
    cpaConfig: {
      provider: '증권사 계좌개설 CPA',
      commissionRate: '건당 3~10만원',
    },
  },
}

export const CURRENT_NICHE: NicheType = 'welfare'
export const NICHE = CONFIGS[CURRENT_NICHE]
export default CONFIGS
