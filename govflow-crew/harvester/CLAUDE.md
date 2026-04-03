# GovFlow Crew — Harvester (크롤러팀)
# 이 파일을 읽으면 crawler/ 전체를 혼자 완성할 수 있다.

## 역할
공공 API · RSS · 뉴스를 수집하고 GPT로 리라이팅한 뒤
WordPress REST API로 자동 포스팅하는 파이프라인 전담.

---

## 전담 파일 목록

```
crawler/
├── config.py          환경변수 · RSS 소스 · 키워드 목록
├── db.py              SQLite 중복 방지
├── keyword_filter.py  키워드 스코어링
├── fetcher.py         RSS + 공공API 수집 + 본문 추출
├── rewriter.py        GPT-4o-mini 리라이팅 + JSON 반환
├── image_gen.py       DALL-E 3 썸네일 생성
├── publisher.py       WP REST API Basic Auth 포스팅
├── main.py            스케줄러 진입점 (일 5개 제한)
└── requirements.txt   Python 의존성
```

## 절대 건드리지 않는 파일
```
prisma/schema.prisma  (Chief 전담)
app/                  (Builder 전담)
lib/                  (Growth 전담)
```

---

## config.py 전체 코드

```python
import os
from dataclasses import dataclass, field

@dataclass
class Config:
    openai_key:     str  = os.getenv("OPENAI_API_KEY", "")
    wp_url:         str  = os.getenv("WP_URL", "https://yourdomain.com")
    wp_user:        str  = os.getenv("WP_USER", "admin")
    wp_pass:        str  = os.getenv("WP_APP_PASSWORD", "")
    data_go_kr_key: str  = os.getenv("DATA_GO_KR_KEY", "")
    posts_per_day:  int  = int(os.getenv("POSTS_PER_DAY", "5"))
    model:          str  = "gpt-4o-mini"
    image_model:    str  = "dall-e-3"
    db_path:        str  = "crawler.db"

    rss_sources: list = field(default_factory=lambda: [
        ("보건복지부",   "https://www.mohw.go.kr/react/rss/rss.jsp"),
        ("고용노동부",   "https://www.moel.go.kr/rss/news.rss"),
        ("정책브리핑",   "https://www.korea.kr/rss/news.xml"),
        ("연합뉴스경제", "https://www.yna.co.kr/rss/economy.xml"),
        ("뉴시스사회",   "https://www.newsis.com/RSS/society.xml"),
        ("네이버사회",   "https://news.naver.com/rss/section/102.xml"),
    ])
    must_keywords: list = field(default_factory=lambda: [
        "지원금","환급금","보조금","바우처","장려금","급여","혜택","신청","지원"
    ])
    boost_keywords: list = field(default_factory=lambda: [
        "2026","최대","만원","대상","조건","방법","신청기간","모집","채용"
    ])

cfg = Config()
```

---

## fetcher.py 핵심 로직

```python
# 키워드 스코어링: must 2점, boost 1점 → 2점 미만 제외
# 상위 20개만 본문 추출 (서버 부하 방지)
# 본문 추출: newspaper3k 먼저, 실패 시 BeautifulSoup fallback
# 추출 간격: 0.8초 sleep
# 반환: [{"source", "title", "link", "published", "score", "text"}]
# 본문 300자 미만 제외
```

---

## rewriter.py 프롬프트 원칙

```python
SYSTEM = """당신은 대한민국 복지·지원금 정보 전문 블로거입니다.
독자는 30~70대 일반인이므로 쉽고 친근하게 작성합니다."""

# GPT 출력 JSON 형식 (response_format={"type": "json_object"}):
{
  "title":         "2026년 [지원금명] 신청방법 총정리 (+금액/대상/기간)",
  "content":       "<h2>지원 대상</h2>...<h2>자주 묻는 질문</h2>...<a class='cta-button'>신청하기</a>",
  "excerpt":       "140자 이내 요약",
  "tags":          ["태그1", "태그2", "태그3"],
  "category":      "지원금정보",
  "apply_url":     "공식 신청 URL 또는 null",
  "focus_keyword": "핵심 키워드 1개",
  "faqs": [
    {"q": "신청 대상은?", "a": "답변"},
    {"q": "신청 방법은?", "a": "답변"},
    {"q": "지원 금액은?", "a": "답변"}
  ]
}

# 본문 HTML 구조 (반드시 포함):
<h2>지원 대상</h2>   → 불릿 리스트, 조건 명확히
<h2>지원 금액</h2>   → 표 또는 목록, 구체적 금액
<h2>신청 방법</h2>   → 번호 순서
<h2>신청 기간</h2>   → 구체적 날짜
<h2>자주 묻는 질문</h2> → details/summary 3개
<a href="..." class="cta-button" target="_blank">지금 신청하기 →</a>
```

---

## image_gen.py 핵심 로직

```python
# DALL-E 3, size="1792x1024", quality="standard"
# 프롬프트: "한국 정부 지원금 안내 블로그 썸네일.
#   주제: {title[:50]}
#   스타일: 깔끔한 플랫 디자인, 파란색·초록색 계열,
#   텍스트 없이 아이콘과 일러스트만, 가로형 배너."
# 저장 경로: /tmp/thumb_{index}.jpg
# 실패 시 None 반환 (포스팅은 이미지 없이 진행)
```

---

## publisher.py 핵심 로직

```python
# 인증: Basic Auth (wp_user:wp_app_password → base64)
# API: {wp_url}/wp-json/wp/v2/

# 순서:
# 1. get_or_create_category(name) → category_id
# 2. upload_image(filepath) → featured_media_id
# 3. POST /posts {title, content, excerpt, status:"publish",
#                categories, featured_media, meta:{rank_math_*}}

# Rank Math SEO 메타 자동 설정:
# rank_math_focus_keyword: post_data["focus_keyword"]
# rank_math_description:   post_data["excerpt"]
```

---

## main.py 핵심 로직

```python
# 1. init_db() → SQLite crawler.db 생성
# 2. fetch_all() → 뉴스 수집 (최대 20개, 스코어 정렬)
# 3. 반복:
#    - already_posted(url) 체크 → 스킵
#    - rewrite(article) → GPT 리라이팅
#    - generate_thumbnail(title, path) → 이미지
#    - publisher.publish(result, img_path) → WP 포스팅
#    - mark_posted(url, title) → DB 기록
#    - time.sleep(30) → 포스팅 간격
# 4. 하루 posts_per_day(5)개 제한
# 5. schedule.every().day.at("11:00").do(run_daily)
# 6. 시작 시 즉시 1회 실행
```

---

## requirements.txt

```
feedparser==6.0.11
newspaper3k==0.2.8
httpx==0.27.0
openai==1.35.0
beautifulsoup4==4.12.3
schedule==1.2.2
lxml==5.2.2
Pillow==10.3.0
```

---

## 필요한 환경변수

```env
OPENAI_API_KEY=sk-...
WP_URL=https://yourdomain.com
WP_USER=admin
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx
DATA_GO_KR_KEY=...
```

---

## 실행 방법

```bash
cd crawler
pip install -r requirements.txt
python main.py        # 즉시 실행 + 스케줄러 시작
```

---

## 완료 기준 체크리스트

- [ ] config.py — RSS 소스 6개, 키워드 목록 작성
- [ ] db.py — SQLite init_db · already_posted · mark_posted
- [ ] fetcher.py — 수집 + 스코어링 + 본문 추출
- [ ] rewriter.py — GPT JSON 반환 + 에러 처리
- [ ] image_gen.py — DALL-E 생성 + 저장
- [ ] publisher.py — WP 포스팅 + 이미지 업로드
- [ ] main.py — 중복방지 + 제한 + 스케줄러
- [ ] 로컬 테스트 — 글 1개 실제 WP 발행 확인
- [ ] requirements.txt — 전체 의존성

---

## Chief에게 완료 보고 형식

```
[Harvester] 완료 보고
- 완성된 파일: config.py · db.py · fetcher.py · rewriter.py · image_gen.py · publisher.py · main.py
- 테스트 결과: WP ID [번호] 발행 확인 / URL: [주소]
- 평균 글자수: [숫자]자
- FAQ 포함 여부: 포함
- 다음 에이전트 전달: 발행된 slug 형식 → /welfare/[slug] 구조
- 블로킹 이슈: 없음
```
