import os
from dataclasses import dataclass, field

@dataclass
class Config:
    openai_key: str        = os.getenv("OPENAI_API_KEY", "")
    wp_url: str            = os.getenv("WP_URL", "https://yourdomain.com")
    wp_user: str           = os.getenv("WP_USER", "admin")
    wp_pass: str           = os.getenv("WP_APP_PASSWORD", "")
    data_go_kr_key: str    = os.getenv("DATA_GO_KR_KEY", "")
    posts_per_day: int     = int(os.getenv("POSTS_PER_DAY", "5"))
    model: str             = "gpt-4o-mini"
    image_model: str       = "dall-e-3"
    db_path: str           = "crawler.db"

    rss_sources: list = field(default_factory=lambda: [
        ("보건복지부",   "https://www.mohw.go.kr/react/rss/rss.jsp"),
        ("고용노동부",   "https://www.moel.go.kr/rss/news.rss"),
        ("정책브리핑",   "https://www.korea.kr/rss/news.xml"),
        ("연합뉴스경제", "https://www.yna.co.kr/rss/economy.xml"),
        ("뉴시스사회",   "https://www.newsis.com/RSS/society.xml"),
        ("네이버사회",   "https://news.naver.com/rss/section/102.xml"),
    ])

    must_keywords: list = field(default_factory=lambda: [
        "지원금","환급금","보조금","바우처","장려금",
        "급여","혜택","신청","혜택","지원"
    ])

    boost_keywords: list = field(default_factory=lambda: [
        "2025","2026","최대","만원","대상","조건",
        "방법","신청기간","모집","채용"
    ])

cfg = Config()
