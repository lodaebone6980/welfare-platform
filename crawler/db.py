import sqlite3
from config import cfg

def init_db():
    con = sqlite3.connect(cfg.db_path)
    con.execute("""
        CREATE TABLE IF NOT EXISTS posted (
            url TEXT PRIMARY KEY,
            title TEXT,
            posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    con.commit()
    con.close()

def already_posted(url: str) -> bool:
    con = sqlite3.connect(cfg.db_path)
    row = con.execute("SELECT 1 FROM posted WHERE url=?", (url,)).fetchone()
    con.close()
    return bool(row)

def mark_posted(url: str, title: str):
    con = sqlite3.connect(cfg.db_path)
    con.execute(
        "INSERT OR IGNORE INTO posted(url,title) VALUES(?,?)",
        (url, title)
    )
    con.commit()
    con.close()
