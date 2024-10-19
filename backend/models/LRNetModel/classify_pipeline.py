import pathlib
import os
import sys
import numpy as np
import cv2
import torch
from tqdm import tqdm
from collections import Counter
import logging

# 設置日誌級別
logging.basicConfig(level=logging.DEBUG)

# 添加项目根目录到 Python 路径
project_root = pathlib.Path(__file__).parent.parent.parent.parent.as_posix()
sys.path.append(project_root)

from models.LRNetModel.utils import shared
from models.LRNetModel.utils.landmark_utils import detect_frames_track
from models.LRNetModel.utils.model import LRNet

def detect_track(video_path, max_frames=100):
    logging.info(f"開始處理視頻：{video_path}")
    vidcap = cv2.VideoCapture(video_path)
    fps = vidcap.get(cv2.CAP_PROP_FPS)
    logging.debug(f"視頻FPS：{fps}")
    frames = []
    frame_count = 0

    while frame_count < max_frames:
        success, image = vidcap.read()
        if not success:
            break
        frames.append(image)
        frame_count += 1
        if frame_count % 10 == 0:
            logging.debug(f"已讀取 {frame_count} 幀")

    logging.info(f"總共讀取到 {frame_count} 幀")

    raw_data = detect_frames_track(frames, os.path.basename(video_path), fps)
    vidcap.release()
    
    if isinstance(raw_data, list):
        raw_data = np.array(raw_data)
    
    if raw_data.size == 0:
        logging.warning("raw_data 為空")
        return np.array([])
    
    logging.debug(f"原始數據形狀：{raw_data.shape}")
    return raw_data

def get_data_from_video(video_path, block):
    logging.info("開始提取特徵點並加載數據...")
    video_name = os.path.basename(video_path).split('.')[0]
    logging.info(f"正在處理視頻：{video_name}")

    raw_data = detect_track(video_path)

    if len(raw_data) == 0:
        logging.warning(f"在 {video_name} 中未檢測到人臉")
        return np.array([]), np.array([]), np.array([])

    x, x_diff, sample_to_video = [], [], []
    for i in range(0, raw_data.shape[0] - block, block):
        vec = raw_data[i:i + block, :]
        x.append(vec)
        vec_next = raw_data[i + 1:i + block, :]
        vec_next = np.pad(vec_next, ((0, 1), (0, 0)), 'constant', constant_values=(0, 0))
        vec_diff = (vec_next - vec)[:block - 1, :]
        x_diff.append(vec_diff)
        sample_to_video.append(video_name)

    logging.debug(f"處理後的數據形狀：x={len(x)}, x_diff={len(x_diff)}, sample_to_video={len(sample_to_video)}")
    return np.array(x), np.array(x_diff), np.array(sample_to_video)

def predict(model, sample, device):
    logging.debug(f"開始預測，使用設備：{device}")
    model.to(device)
    model.eval()
    sample = torch.from_numpy(sample).float().to(device)
    output = model(sample)
    predictions = output.cpu().detach().numpy()
    logging.debug(f"預測結果形狀：{predictions.shape}")
    return predictions

def merge_video_prediction(mix_prediction, s2v, vc):
    logging.info("開始合併視頻預測結果")
    prediction_video = []
    pre_count = {}
    for p, v_label in zip(mix_prediction, s2v):
        p_bi = 1 if p >= 0.5 else 0
        if v_label in pre_count:
            pre_count[v_label] += p_bi
        else:
            pre_count[v_label] = p_bi
    for key in pre_count.keys():
        prediction_video.append(pre_count[key] / vc[key])
    logging.debug(f"合併後的預測結果：{prediction_video}")
    return prediction_video

def classify_video(video_path, block_size):
    logging.info(f"開始分類視頻：{video_path}")
    test_samples, test_samples_diff, test_sv = get_data_from_video(video_path, block_size)

    if len(test_samples) == 0:
        logging.warning("沒有檢測到有效樣本")
        return {"video": os.path.basename(video_path), "label": "Unknown", "score": 0}

    weights_g1 = os.path.join(os.path.dirname(__file__), 'model_weights', 'g1.pth')
    weights_g2 = os.path.join(os.path.dirname(__file__), 'model_weights', 'g2.pth')
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    logging.info(f"使用設備：{device}")

    g1 = LRNet()
    g2 = LRNet()

    logging.info("正在加載模型並進行預測...")

    g1.load_state_dict(torch.load(weights_g1, map_location=device))
    g2.load_state_dict(torch.load(weights_g2, map_location=device))

    prediction = predict(g1, test_samples, device)
    prediction_diff = predict(g2, test_samples_diff, device)

    assert len(prediction) == len(prediction_diff)
    mix_predict = []
    for i in range(len(prediction)):
        mix = prediction[i][1] + prediction_diff[i][1]
        mix_predict.append(mix / 2)

    video_count = Counter(test_sv)

    prediction_video = merge_video_prediction(mix_predict, test_sv, video_count)

    video_name = os.path.basename(video_path)
    score = prediction_video[0] if prediction_video else 0
    label = "Fake" if score >= 0.5 else "Real"

    result = {"video": video_name, "label": label, "score": score}
    logging.info(f"分類結果：{result}")
    
    return result

if __name__ == "__main__":
    video_path = './input/test_video.mp4'
    block_size = 16

    logging.info("開始主程序")
    result = classify_video(video_path, block_size)

    print(result)
    logging.info("主程序結束")
