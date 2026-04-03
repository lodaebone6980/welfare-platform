import schedule
import time
from fetcher   import fetch_all
from rewriter  import rewrite
from publisher import WPPublisher
from image_gen import generate_thumbnail
from db        import init_db, already_posted, mark_posted
from config    import cfg


def run_daily():
    print("=== 크롤링 시작 ===")
    articles  = fetch_all()
    publisher = WPPublisher()
    posted    = 0

    for article in articles:
        if posted >= cfg.posts_per_day:
            break
        if already_posted(article["link"]):
            print(f"[스킵] 이미 포스팅됨: {article['title'][:30]}")
            continue

        result = rewrite(article)
        if not result:
            continue

        img_path = f"/tmp/thumb_{posted}.jpg"
        generate_thumbnail(result["title"], img_path)

        wp_post = publisher.publish(result, img_path)
        if "id" in wp_post:
            mark_posted(article["link"], result["title"])
            print(f"[완료] {result['title'][:40]} → WP ID {wp_post['id']}")
            posted += 1
        else:
            print(f"[오류] WP 포스팅 실패: {wp_post}")

        time.sleep(30)

    print(f"=== 완료: {posted}개 포스팅 ===")


if __name__ == "__main__":
    init_db()
    schedule.every().day.at("11:00").do(run_daily)
    run_daily()  # 즉시 1회 실행
    while True:
        schedule.run_pending()
        time.sleep(60)
