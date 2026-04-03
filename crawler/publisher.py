import httpx
import base64
import os
import mimetypes
from config import cfg


class WPPublisher:
    def __init__(self):
        token = base64.b64encode(
            f"{cfg.wp_user}:{cfg.wp_pass}".encode()
        ).decode()
        self.headers = {
            "Authorization": f"Basic {token}",
            "Content-Type": "application/json",
        }
        self.api = f"{cfg.wp_url}/wp-json/wp/v2"

    def get_or_create_category(self, name: str) -> int:
        r = httpx.get(
            f"{self.api}/categories",
            params={"search": name},
            headers=self.headers
        )
        cats = r.json()
        if cats and isinstance(cats, list):
            return cats[0]["id"]
        r = httpx.post(
            f"{self.api}/categories",
            json={"name": name},
            headers=self.headers
        )
        return r.json()["id"]

    def upload_image(self, filepath: str) -> int | None:
        if not filepath or not os.path.exists(filepath):
            return None
        mime = mimetypes.guess_type(filepath)[0] or "image/jpeg"
        with open(filepath, "rb") as f:
            r = httpx.post(
                f"{self.api}/media",
                headers={
                    "Authorization": self.headers["Authorization"],
                    "Content-Disposition": f'attachment; filename="{os.path.basename(filepath)}"',
                    "Content-Type": mime,
                },
                content=f.read(),
                timeout=60,
            )
        if r.status_code == 201:
            return r.json()["id"]
        return None

    def publish(self, post_data: dict, img_path: str | None = None) -> dict:
        cat_id = self.get_or_create_category(
            post_data.get("category", "지원금정보")
        )
        featured_id = self.upload_image(img_path) if img_path else None

        payload = {
            "title":    post_data["title"],
            "content":  post_data["content"],
            "excerpt":  post_data.get("excerpt", ""),
            "status":   "publish",
            "categories": [cat_id],
            "meta": {
                "rank_math_focus_keyword": post_data.get("focus_keyword", ""),
                "rank_math_description":  post_data.get("excerpt", ""),
            },
        }
        if featured_id:
            payload["featured_media"] = featured_id

        r = httpx.post(
            f"{self.api}/posts",
            json=payload,
            headers=self.headers,
            timeout=30
        )
        return r.json()
