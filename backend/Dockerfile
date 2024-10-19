# 使用 Python 3.9 slim 镜像作为基础镜像
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 复制当前目录内容到容器中的 /app
COPY . /app

# 更新 apt-get 并安装必要的依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# 更新 pip
RUN pip install --no-cache-dir --upgrade pip

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 安装 OpenCV
RUN pip install opencv-python-headless

# 安装 nltk 所需的 punkt 数据
RUN python -m nltk.downloader punkt

# 清理不必要的包缓存，减少镜像大小
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# 暴露 8000 端口
EXPOSE 8000

# 运行应用程序
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]