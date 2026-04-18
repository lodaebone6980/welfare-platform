"""
국민자료실 크롤러 v2.

v1 (crawler/main.py) 은 WordPress REST API 를 향해 포스팅하는 구조였고,
v2 는 Next.js + Prisma(Postgres) 직접 upsert 경로입니다. 두 경로는 공존합니다.

구성:
- slugify.py    : 한글 친화 슬러그 생성
- rss_fetcher.py: feedparser 래퍼 (RSS 소스 순회)
- pg_writer.py  : DATABASE_URL 로 Policy/ApiSource upsert (psycopg 3)
- pipeline.py   : 소스별 Iterator → normalize → upsert 오케스트레이션
- main.py       : CLI 진입점
"""
