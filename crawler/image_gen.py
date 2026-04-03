import httpx
import os
from openai import OpenAI
from config import cfg

client = OpenAI(api_key=cfg.openai_key)


def generate_thumbnail(title: str, save_path: str) -> str | None:
    prompt = f"""
한국 정부 지원금 안내 블로그 썸네일 이미지.
주제: {title[:50]}
스타일: 깔끔한 플랫 디자인, 파란색·초록색 계열,
텍스트 없이 아이콘과 일러스트만, 가로형 배너.
"""
    try:
        resp = client.images.generate(
            model=cfg.image_model,
            prompt=prompt,
            size="1792x1024",
            quality="standard",
            n=1,
        )
        img_url = resp.data[0].url
        img_data = httpx.get(img_url, timeout=30).content
        os.makedirs(os.path.dirname(save_path) or ".", exist_ok=True)
        with open(save_path, "wb") as f:
            f.write(img_data)
        return save_path
    except Exception as e:
        print(f"[이미지 생성 오류] {e}")
        return None
