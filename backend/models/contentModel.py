import requests
from newspaper import Article
from bs4 import BeautifulSoup
import time
import logging
from pydantic import BaseModel
import cloudscraper

class UrlInput(BaseModel):
    url: str

logger = logging.getLogger(__name__)
scraper = cloudscraper.create_scraper()

def extract_content_newspaper(url):
    try:
        article = Article(url)
        article.download()
        article.parse()
        content = article.text.strip()
        if content:
            logger.info(f"Newspaper3k 成功提取內容，長度：{len(content)}")
            return content
        else:
            logger.warning("Newspaper3k 提取的內容為空")
            return None
    except Exception as e:
        logger.error(f"Newspaper3k 提取失敗: {str(e)}")
        return None

def extract_content_general(url):
    try:
        time.sleep(2)
        response = scraper.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        title = soup.find('h1', class_='title')
        title_text = title.get_text(strip=True) if title else ""
        article_body = soup.find('div', class_='article-body')
        if article_body:
            paragraphs = article_body.find_all(['p', 'h2', 'h3'])
            content = "\n\n".join([p.get_text(strip=True) for p in paragraphs])
            figures = article_body.find_all('figure')
            for figure in figures:
                figcaption = figure.find('figcaption')
                if figcaption:
                    content += f"\n\n[圖片描述: {figcaption.get_text(strip=True)}]"
            full_content = f"{title_text}\n\n{content}"
            logger.info(f"通用方法成功提取內容，長度：{len(full_content)}")
            return full_content
        logger.warning("通用方法未找到文章內容")
        return None
    except Exception as e:
        logger.error(f"通用方法提取失敗: {str(e)}")
        return None

def get_raw_html(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        logger.info(f"成功獲取原始 HTML，長度：{len(response.text)}")
        return response.text
    except Exception as e:
        logger.error(f"獲取原始 HTML 失敗: {str(e)}")
        return None
