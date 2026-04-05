import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const regions = ['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'];

const categories = [
  { name: '환급금', slug: 'refund', icon: '💰', displayOrder: 1 },
  { name: '바우처', slug: 'voucher', icon: '🎫', displayOrder: 2 },
  { name: '지원금', slug: 'subsidy', icon: '💳', displayOrder: 3 },
  { name: '대출', slug: 'loan', icon: '🏦', displayOrder: 4 },
  { name: '보조금', slug: 'grant', icon: '📋', displayOrder: 5 },
  { name: '교육', slug: 'education', icon: '📚', displayOrder: 6 },
  { name: '주거', slug: 'housing', icon: '🏠', displayOrder: 7 },
  { name: '의료', slug: 'medical', icon: '⚕️', displayOrder: 8 },
  { name: '고용', slug: 'employment', icon: '💼', displayOrder: 9 },
  { name: '문화', slug: 'culture', icon: '🎭', displayOrder: 10 }
];

const T = [
  {t:'청년 기본소득 지원',c:'지원금',e:'만 18~39세 청년',m:'온라인 신청 또는 주민센터',d:'신분증, 주민등록등본, 통장사본',x:'청년들의 경제적 자립을 위해 월 최대 100만원의 기본소득을 제공합니다.'},
  {t:'청년 전세자금 대출',c:'대출',e:'만 19~39세 무주택 청년',m:'주택금융공사 온라인 신청',d:'신분증, 소득증명서',x:'무주택 청년의 전세자금을 최대 2억원까지 저금리로 대출합니다.'},
  {t:'청년 창업 지원금',c:'보조금',e:'만 19~49세 창업 예정자',m:'중소벤처기업부 신청',d:'사업계획서, 신분증',x:'혁신적인 아이디어를 가진 청년 창업자에게 최대 5천만원의 창업자금을 지원합니다.'},
  {t:'청년 취업성공 패키지',c:'고용',e:'만 18~34세 미취업 청년',m:'고용센터 방문 또는 온라인',d:'신분증, 학위증명서',x:'취업 상담부터 직업훈련, 취업알선까지 종합적 취업지원 서비스를 제공합니다.'},
  {t:'출산장려금 지원',c:'지원금',e:'출산 가정',m:'주민센터 방문 신청',d:'출생증명서, 부모 신분증, 통장사본',x:'신생아 출산 시 첫째 200만원, 둘째 300만원, 셋째 이상 500만원을 지급합니다.'},
  {t:'아동수당 지급',c:'지원금',e:'만 8세 미만 아동',m:'온라인 신청 또는 주민센터',d:'신분증, 통장사본',x:'만 8세 미만 모든 아동에게 월 10만원의 아동수당을 지급합니다.'},
  {t:'보육료 지원사업',c:'바우처',e:'취학 전 아동 가정',m:'어린이집 통한 신청',d:'신분증, 소득증명서',x:'어린이집 이용 아동에게 보육료 전액 또는 일부를 지원합니다.'},
  {t:'기초연금 지급',c:'지원금',e:'만 65세 이상 소득하위 70%',m:'주민센터 방문 신청',d:'신분증, 통장사본, 소득증명서',x:'어르신의 안정적 노후생활을 위해 월 최대 33만원의 기초연금을 지급합니다.'},
  {t:'노인일자리 사업',c:'고용',e:'만 60세 이상',m:'주민센터 신청',d:'신분증, 주민등록등본',x:'어르신의 사회참여 확대와 소득보장을 위한 다양한 일자리를 제공합니다.'},
  {t:'노인 돌봄서비스',c:'바우처',e:'만 65세 이상 독거노인',m:'주민센터 또는 복지관',d:'신분증, 주민등록등본',x:'독거노인에게 방문, 상담, 일상생활 지원 등 맞춤형 돌봄서비스를 제공합니다.'},
  {t:'장애인 활동지원',c:'바우처',e:'등록 장애인',m:'장애인복지관 또는 주민센터',d:'장애인증명서, 신분증',x:'장애인의 자립생활과 사회참여를 위해 활동보조를 월 최대 480시간 지원합니다.'},
  {t:'장애인 보조기기 지원',c:'지원금',e:'등록 장애인',m:'보조기기센터 신청',d:'장애인증명서, 처방전',x:'장애인이 필요로 하는 보조기기를 무상 또는 저렴하게 제공합니다.'},
  {t:'국민기초생활보장',c:'지원금',e:'소득인정액 기준 이하 가구',m:'주민센터 신청',d:'신분증, 소득증명서, 재산증명서',x:'생활이 어려운 국민에게 생계, 의료, 주거, 교육 급여를 통합 지원합니다.'},
  {t:'의료급여 지원',c:'의료',e:'기초생활수급자',m:'주민센터 신청',d:'수급자증명서, 신분증',x:'저소득층의 의료비 부담을 덜어주기 위해 의료비를 국가에서 부담합니다.'},
  {t:'주거급여 지원',c:'주거',e:'소득인정액 기준 이하 임차가구',m:'주민센터 신청',d:'신분증, 임대차계약서',x:'저소득 임차가구에게 월세 등 주거비를 최대 월 52만원까지 지원합니다.'},
  {t:'긴급복지 지원',c:'지원금',e:'위기상황 저소득층',m:'주민센터 또는 129',d:'신분증, 위기상황 증빙',x:'갑작스러운 위기상황에 처한 가구에 생계, 의료, 주거 등 긴급지원을 실시합니다.'},
  {t:'전월세 보증금 대출',c:'대출',e:'무주택 세입자',m:'주택금융공사 신청',d:'신분증, 임대차계약서',x:'전월세 보증금의 80%까지 저금리로 대출하여 주거안정을 지원합니다.'},
  {t:'주택 개보수 지원',c:'주거',e:'저소득 노후주택 소유자',m:'시군구청 신청',d:'신분증, 소유권증명서',x:'노후화된 주택의 수리비를 최대 1000만원까지 무상 지원합니다.'},
  {t:'공공임대주택 공급',c:'주거',e:'무주택자',m:'LH 또는 SH 신청',d:'신분증, 소득증명서',x:'저렴한 임대료의 공공임대주택을 무주택 서민에게 공급합니다.'},
  {t:'암 검진비 지원',c:'의료',e:'만 40세 이상',m:'보건소 방문',d:'신분증',x:'국가 암 검진 프로그램을 통해 5대암 검진을 무료로 제공합니다.'},
];

const T2 = [
  {t:'건강검진 바우처',c:'바우처',e:'저소득층',m:'보건소 신청',d:'신분증, 소득증명서',x:'종합건강검진 비용을 최대 30만원까지 바우처로 지원합니다.'},
  {t:'정신건강 상담지원',c:'의료',e:'모든 주민',m:'정신건강복지센터',d:'신분증',x:'전문 심리상담사의 무료 상담 및 치료 연계 서비스를 제공합니다.'},
  {t:'실업급여 지급',c:'고용',e:'비자발적 실직자',m:'고용센터 신청',d:'신분증, 이직확인서',x:'실직자의 생활안정과 재취업을 위해 최대 9개월간 실업급여를 지급합니다.'},
  {t:'직업훈련 비용지원',c:'교육',e:'구직자 및 재직자',m:'HRD-Net 온라인',d:'신분증, 훈련신청서',x:'직업능력 개발을 위한 훈련비용을 최대 500만원까지 지원합니다.'},
  {t:'경력단절여성 취업지원',c:'고용',e:'경력단절 여성',m:'여성새로일하기센터',d:'신분증, 경력증명서',x:'경력이 단절된 여성의 재취업을 위한 상담, 교육, 인턴 연계를 지원합니다.'},
  {t:'국가장학금 지원',c:'교육',e:'대학 재학생',m:'한국장학재단 온라인',d:'신분증, 소득증명서',x:'소득에 따라 최대 전액 등록금을 장학금으로 지원합니다.'},
  {t:'학자금 대출',c:'대출',e:'대학 재학생',m:'한국장학재단 신청',d:'신분증, 입학통지서',x:'등록금 및 생활비를 저금리로 대출하여 학업에 전념하도록 지원합니다.'},
  {t:'문화누리카드',c:'문화',e:'기초생활수급자 및 차상위',m:'온라인 또는 주민센터',d:'수급자증명서, 신분증',x:'문화, 관광, 체육 활동에 사용 가능한 연 11만원의 문화누리카드를 지급합니다.'},
  {t:'스포츠 바우처',c:'바우처',e:'저소득층 유소년',m:'국민체육진흥공단 신청',d:'신분증, 소득증명서',x:'저소득 가정 유소년의 체육활동을 위해 월 8만원의 스포츠 바우처를 지원합니다.'},
  {t:'에너지 바우처',c:'바우처',e:'저소득 에너지 취약계층',m:'주민센터 신청',d:'수급자증명서, 신분증',x:'겨울철 난방비 부담을 줄이기 위해 에너지 바우처를 제공합니다.'},
  {t:'한부모가족 양육비',c:'지원금',e:'한부모가족',m:'주민센터 신청',d:'가족관계증명서, 신분증',x:'한부모가족의 아동 양육을 위해 월 최대 20만원의 양육비를 지급합니다.'},
  {t:'다문화가족 지원',c:'지원금',e:'다문화가족',m:'다문화가족지원센터',d:'신분증, 혼인증명서',x:'다문화가족의 안정적 정착을 위한 교육, 상담, 통번역 서비스를 제공합니다.'},
  {t:'자영업자 경영안정자금',c:'대출',e:'1년 이상 영업 자영업자',m:'소상공인시장진흥공단',d:'사업자등록증, 신분증',x:'경영 어려움을 겪는 자영업자에게 최대 7천만원의 저금리 대출을 지원합니다.'},
  {t:'소상공인 지원금',c:'보조금',e:'매출 감소 소상공인',m:'소상공인시장진흥공단',d:'사업자등록증',x:'매출이 감소한 소상공인에게 손실보전금을 지급합니다.'},
  {t:'농어업인 지원',c:'보조금',e:'등록 농어업인',m:'농업기술센터 신청',d:'농업경영체등록증',x:'농어업인의 소득안정을 위한 직불금 및 보조금을 지원합니다.'},
  {t:'난임시술비 지원',c:'의료',e:'난임 진단 부부',m:'보건소 신청',d:'진단서, 부부 신분증',x:'난임 부부의 시술비 부담을 줄이기 위해 최대 110만원까지 지원합니다.'},
  {t:'산후조리비 지원',c:'지원금',e:'출산 후 산모',m:'주민센터 신청',d:'출생증명서, 신분증',x:'출산 후 산모의 건강 회복을 위한 산후조리 비용을 지원합니다.'},
  {t:'입학준비금 지원',c:'교육',e:'초중고 입학 예정 자녀 가정',m:'학교 또는 온라인',d:'입학통지서, 신분증',x:'초중고 입학 시 필요한 학용품, 교복 등의 구입비를 지원합니다.'},
  {t:'환급금 조회 서비스',c:'환급금',e:'모든 국민',m:'정부24 또는 홈택스',d:'공인인증서',x:'숨은 환급금을 조회하고 신청할 수 있는 원스톱 서비스를 제공합니다.'},
  {t:'통신비 환급',c:'환급금',e:'저소득층',m:'통신사 신청',d:'수급자증명서, 신분증',x:'저소득층의 통신비 부담 경감을 위해 월 최대 26000원을 환급합니다.'},
  {t:'디지털 역량교육',c:'교육',e:'디지털 취약계층',m:'주민센터 또는 도서관',d:'신분증',x:'디지털 기기 사용이 어려운 주민들을 위한 무료 디지털 교육을 실시합니다.'},
  {t:'가사돌봄 서비스',c:'바우처',e:'임산부, 출산가정',m:'건강가정지원센터',d:'임신확인서',x:'임산부와 출산가정에 산전산후 가사돌봄 서비스를 바우처로 제공합니다.'},
  {t:'교통비 지원',c:'바우처',e:'저소득 교통약자',m:'지자체 온라인 신청',d:'신분증, 소득증명서',x:'대중교통 이용 시 월 최대 5만원의 교통비를 바우처로 지원합니다.'},
  {t:'건강보험료 환급',c:'환급금',e:'과다납부자',m:'국민건강보험공단',d:'신분증',x:'건강보험료를 과다 납부한 경우 차액을 환급받을 수 있습니다.'},
  {t:'자동차세 환급',c:'환급금',e:'자동차 소유자',m:'위택스 신청',d:'자동차등록증',x:'폐차, 이전 등으로 인한 자동차세 과납분을 환급합니다.'},
];
const templates = [...T, ...T2];

function slug(t) { return t.replace(/\s+/g, '-').replace(/[^가-힣a-zA-Z0-9-]/g, '').toLowerCase(); }
function getSuffix(r) {
  if (r==='세종') return '특별자치시';
  if (r==='제주') return '특별자치도';
  if (['서울','부산','대구','인천','광주','대전','울산'].includes(r)) return '광역시';
  return '도';
}

function gen(count) {
  const p = [];
  for (let i=0;i<count;i++) {
    const tmpl=templates[i%templates.length];
    const region=regions[i%regions.length];
    const rs=getSuffix(region);
    const title=`[${region}${rs}] ${tmpl.t}`;
    const s=`${slug(region)}-${slug(tmpl.t)}-${i}`;
    const mon=(i%12)+1, day=(i%28)+1, yr=i%2===0?2025:2026;
    const dl=i%3===0?'상시모집':`${yr}년 ${mon}월 ${day}일까지`;
    const catSlug=categories.find(c=>c.name===tmpl.c)?.slug||'subsidy';
    p.push({title,slug:s,
      content:`<h2>${title}</h2><p>${tmpl.x}</p><h3>지원 대상</h3><p>${tmpl.e} 중 ${region}${rs} 거주자</p><h3>신청 방법</h3><p>${tmpl.m}</p><h3>필요 서류</h3><p>${tmpl.d}</p><p>자세한 내용은 ${region}${rs} 복지 담당 부서에 문의하시기 바랍니다.</p>`,
      excerpt:`${region}${rs} ${tmpl.t} - ${tmpl.e} 대상`,
      description:`${region}${rs}에서 시행하는 ${tmpl.t}입니다. ${tmpl.x}`,
      eligibility:`${tmpl.e} 중 ${region}${rs} 거주자`,
      applicationMethod:tmpl.m, requiredDocuments:tmpl.d, deadline:dl,
      focusKeyword:`${region} ${tmpl.t}`,
      metaDesc:`${region}${rs} ${tmpl.t} 신청방법 및 자격요건 안내`,
      geoRegion:region,
      applyUrl:`https://www.gov.kr/search?srhQuery=${encodeURIComponent(tmpl.t)}`,
      externalId:`ds-${i}`,
      externalUrl:`https://www.bokjiro.go.kr/ssis-tbu/NationalWelfareInformationM.do?searchKeyword=${encodeURIComponent(tmpl.t)}`,
      status:'PUBLISHED' as const,
      publishedAt:new Date(yr,mon-1,day),
      tags:`${region},${tmpl.c},복지`,
      catSlug});
  }
  return p;
}

export async function GET(request: NextRequest) {
  try {
    const key=request.nextUrl.searchParams.get('key');
    const count=Math.min(parseInt(request.nextUrl.searchParams.get('count')||'500'),2000);
    if(!key||!key.includes('12ac8429')) return NextResponse.json({success:false,message:'Invalid key'},{status:401});
    const catMap: Record<string,number>={};
    for(const cat of categories){
      const r=await prisma.category.upsert({where:{slug:cat.slug},update:{name:cat.name,icon:cat.icon,displayOrder:cat.displayOrder},create:{name:cat.name,slug:cat.slug,icon:cat.icon,displayOrder:cat.displayOrder}});
      catMap[cat.slug]=r.id;
    }
    const policies=gen(count);
    let created=0,errors=0;
    for(let i=0;i<policies.length;i+=50){
      const batch=policies.slice(i,i+50);
      const results=await Promise.allSettled(batch.map(p=>{
        const categoryId=catMap[p.catSlug]||catMap['subsidy'];
        return prisma.policy.upsert({
          where:{externalId:p.externalId},
          update:{title:p.title,content:p.content,excerpt:p.excerpt,description:p.description,eligibility:p.eligibility,applicationMethod:p.applicationMethod,requiredDocuments:p.requiredDocuments,deadline:p.deadline,focusKeyword:p.focusKeyword,metaDesc:p.metaDesc,geoRegion:p.geoRegion,applyUrl:p.applyUrl,externalUrl:p.externalUrl,publishedAt:p.publishedAt,tags:p.tags,categoryId,status:'PUBLISHED'},
          create:{title:p.title,slug:p.slug,content:p.content,excerpt:p.excerpt,description:p.description,eligibility:p.eligibility,applicationMethod:p.applicationMethod,requiredDocuments:p.requiredDocuments,deadline:p.deadline,focusKeyword:p.focusKeyword,metaDesc:p.metaDesc,geoRegion:p.geoRegion,applyUrl:p.applyUrl,externalId:p.externalId,externalUrl:p.externalUrl,publishedAt:p.publishedAt,tags:p.tags,categoryId,status:'PUBLISHED'}
        });
      }));
      for(const r of results){if(r.status==='fulfilled')created++;else errors++;}
    }
    return NextResponse.json({success:true,totalCreated:created,totalErrors:errors,message:`Seeded ${created} policies across ${regions.length} regions`});
  } catch(error) {
    console.error('Seed error:',error);
    return NextResponse.json({success:false,message:error instanceof Error?error.message:'Unknown error'},{status:500});
  } finally { await prisma.$disconnect(); }
}
