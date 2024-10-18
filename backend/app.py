from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
from newspaper import Article
import logging


app = FastAPI()

# 設置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允許所有來源，您可以根據需要限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UrlInput(BaseModel):
    url: str

def extract_content_general(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        article = soup.find('article')
        if article:
            content = article.get_text(strip=True)
            return content if content else None
        logger.info("通用方法未找到文章內容")
        return None
    except Exception as e:
        logger.error(f"通用方法提取失敗: {str(e)}")
        return None

def extract_content_newspaper(url):
    try:
        article = Article(url)
        article.download()
        article.parse()
        content = article.text.strip()
        return content if content else None
    except Exception as e:
        logger.error(f"Newspaper3k 提取失敗: {str(e)}")
        return None

def get_raw_html(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.text
    except Exception as e:
        logger.error(f"獲取原始 HTML 失敗: {str(e)}")
        return None

@app.post("/extract")
async def extract_content(input: UrlInput, response: Response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    url = input.url
    logger.info(f"嘗試提取 URL: {url}")
    try:
        # 首先嘗試使用 Newspaper3k
        content = extract_content_newspaper(url)
        content_source = "newspaper3k"

        if not content:
            logger.info("Newspaper3k 提取失敗，嘗試通用方法")
            content = extract_content_general(url)
            content_source = "general"
        
        if content:
            logger.info(f"成功提取內容，來源: {content_source}，長度: {len(content)}")
            return {"success": True, "content": content, "source": content_source}
        else:
            logger.warning("無法提取結構化內容，嘗試獲取原始 HTML")
            raw_html = get_raw_html(url)
            if raw_html:
                return {"success": True, "content": raw_html, "source": "raw_html"}
            else:
                raise HTTPException(status_code=404, detail="無法提取內容或獲取原始 HTML")
    except Exception as e:
        logger.error(f"提取過程中發生錯誤: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
