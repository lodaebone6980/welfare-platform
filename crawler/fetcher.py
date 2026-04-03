import feedparser
import httpx
import time
from newspaper import Article
from bs4 import BeautifulSoup
from config import cfg


def score_title(title: str) -> int:
    s = sum(2 for kw in cfg.must_keywords if kw in title)
    s += sum(1 for kw in cfg.boost_keywords if kw in title)
    return s


def extract_body(url: str) -> str:
    try:
        article = Article(url, language="ko")
        article.download()
        article.parse()
        if len(article.text) > 200:
            return article.text[:4000]
    except Exception:
        pass
    try:
        r = httpx.get(url, timeout=10, follow_redirects=True,
                      headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script","style","nav","header","footer","aside"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)[:4000]
    except Exception:
        return ""


def fetch_all() -> list[dict]:
    results = []
    for source_name, url in cfg.rss_sources:
        try:
            feed = feedparser.parse(
                url,
                request_headers={"User-Agent": "Mozilla/5.0"}
            )
            for entry in feed.entries[:20]:
                title = entry.get("title", "")
                score = score_title(title)
                if score < 2:
                    continue
                results.append({
                    "source":    source_name,
                    "title":     title,
                    "link":      entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "score":     score,
                    "text":      "",
                })
        except Exception as e:
            print(f"[RSS 오류] {source_name}: {e}")

    results.sort(key=lambda x: x["score"], reverse=True)

    for item in results[:20]:
        item["text"] = extract_body(item["link"])
        time.sleep(0.8)

    return [r for r in results if len(r["text"]) > 300]
