from fastapi import HTTPException
from models.contentModel import extract_content_newspaper, extract_content_general, get_raw_html
import logging

logger = logging.getLogger(__name__)

async def extract_content(url: str):
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
