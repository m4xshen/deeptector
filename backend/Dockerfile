# 使用官方 Python 運行時作為父鏡像
FROM python:3.9-slim

# 設置工作目錄
WORKDIR /app

# 將當前目錄內容複製到容器中的 /app
COPY . /app

# 更新 pip
RUN pip install --no-cache-dir --upgrade pip

# 安裝所需的包
RUN pip install --no-cache-dir -r requirements.txt

# 安裝額外的系統依賴（newspaper3k 可能需要）
RUN apt-get update && apt-get install -y \
    libxml2-dev \
    libxslt-dev \
    libjpeg-dev \
    zlib1g-dev \
    libpng-dev \
    && rm -rf /var/lib/apt/lists/*

# 下載 nltk 數據（newspaper3k 需要）
RUN python -m nltk.downloader punkt

# 使端口 8000 可用於此容器
EXPOSE 8000

# 定義環境變量
ENV NAME World

# 運行 app.py
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]