import os
import re
import uuid
import logging
import requests
import bs4
from fastapi import HTTPException
from tqdm import tqdm
from pathlib import Path
from models.LRNetModel.classify_pipeline import classify_video

logging.basicConfig(level=logging.DEBUG)  # 將日誌級別設置為DEBUG

async def extract_video_content_by_id(video_id: str):
    try:
        logging.debug(f"開始處理視頻ID: {video_id}")
        twitter_url = f"https://twitter.com/i/status/{video_id}"
        logging.info(f"構建的Twitter URL: {twitter_url}")
        
        file_path = download_twitter_video(twitter_url)
        logging.info(f"視頻下載完成，文件路徑: {file_path}")
        
        block_size = 16
        logging.debug(f"開始分類視頻，使用的塊大小: {block_size}")
        result = classify_video(file_path, block_size)
        logging.info("視頻分類完成")
        
        os.remove(file_path)
        logging.debug(f"臨時文件已刪除: {file_path}")
        
        return result
    except Exception as e:
        logging.exception(f"處理視頻時發生錯誤: {str(e)}")
        raise HTTPException(status_code=500, detail=f"處理視頻時發生錯誤: {str(e)}")

def download_twitter_video(url: str) -> str:
    logging.debug(f"開始下載Twitter視頻: {url}")
    api_url = f"https://twitsave.com/info?url={url}"
    logging.info(f"使用的API URL: {api_url}")

    response = requests.get(api_url)
    logging.debug(f"API響應狀態碼: {response.status_code}")
    data = bs4.BeautifulSoup(response.text, "html.parser")
    
    download_button = data.find_all("div", class_="origin-top-right")[0]
    quality_buttons = download_button.find_all("a")
    highest_quality_url = quality_buttons[0].get("href")
    
    file_name = data.find_all("div", class_="leading-tight")[0].find_all("p", class_="m-2")[0].text
    file_name = re.sub(r"[^a-zA-Z0-9]+", ' ', file_name).strip() + ".mp4"
    
    # 確保public文件夾存在
    public_folder = os.path.join(os.getcwd(), "public")
    os.makedirs(public_folder, exist_ok=True)
    
    # 生成唯一的文件名
    unique_filename = f"{uuid.uuid4()}_{file_name}"
    file_path = os.path.join(public_folder, unique_filename)

    logging.info(f"獲取到的最高質量視頻URL: {highest_quality_url}")
    logging.debug(f"生成的唯一文件名: {unique_filename}")
    
    download_video(highest_quality_url, file_path)
    logging.info(f"視頻下載完成，保存路徑: {file_path}")
    return file_path

def download_video(url: str, file_path: str) -> None:
    logging.debug(f"開始下載視頻: {url}")
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get("content-length", 0))
    logging.info(f"視頻總大小: {total_size} 字節")
    block_size = 1024
    progress_bar = tqdm(total=total_size, unit="B", unit_scale=True)

    with open(file_path, "wb") as file:
        for data in response.iter_content(block_size):
            progress_bar.update(len(data))
            file.write(data)

    progress_bar.close()
    logging.info(f"視頻下載成功：{file_path}")
