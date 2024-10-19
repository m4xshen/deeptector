import pathlib
import os
import sys
import numpy as np
import cv2
import torch
from tqdm import tqdm
from collections import Counter

# 添加项目根目录到 Python 路径
project_root = pathlib.Path(__file__).parent.parent.parent.parent.as_posix()
sys.path.append(project_root)

from models.LRNetModel.utils import shared
from models.LRNetModel.utils.landmark_utils import detect_frames_track
from models.LRNetModel.utils.model import LRNet

def detect_track(video_path):
    vidcap = cv2.VideoCapture(video_path)
    fps = vidcap.get(cv2.CAP_PROP_FPS)
    frames = []
    while True:
        success, image = vidcap.read()
        if success:
            frames.append(image)
        else:
            break

    raw_data = detect_frames_track(frames, os.path.basename(video_path), fps)
    vidcap.release()
    return np.array(raw_data)

def get_data_from_video(video_path, block):
    x = []
    x_diff = []
    sample_to_video = []

    print("Extracting landmarks and loading data...")
    video_name = os.path.basename(video_path).split('.')[0]
    print(f"Processing video: {video_name}")

    raw_data = detect_track(video_path)

    if len(raw_data) == 0:
        print(f"No face detected in {video_name}")
        return np.array([]), np.array([]), np.array([])

    for i in range(0, raw_data.shape[0] - block, block):
        vec = raw_data[i:i + block, :]
        x.append(vec)
        vec_next = raw_data[i + 1:i + block, :]
        vec_next = np.pad(vec_next, ((0, 1), (0, 0)), 'constant', constant_values=(0, 0))
        vec_diff = (vec_next - vec)[:block - 1, :]
        x_diff.append(vec_diff)
        sample_to_video.append(video_name)

    return np.array(x), np.array(x_diff), np.array(sample_to_video)

def predict(model, sample, device):
    model.to(device)
    model.eval()
    sample = torch.from_numpy(sample).float().to(device)
    output = model(sample)
    predictions = output.cpu().detach().numpy()
    return predictions

def merge_video_prediction(mix_prediction, s2v, vc):
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
    return prediction_video

def classify_video(video_path, block_size):
    test_samples, test_samples_diff, test_sv = get_data_from_video(video_path, block_size)

    if len(test_samples) == 0:
        return {"video": os.path.basename(video_path), "label": "Unknown", "score": 0}

    weights_g1 = os.path.join(os.path.dirname(__file__), 'model_weights', 'g1.pth')
    weights_g2 = os.path.join(os.path.dirname(__file__), 'model_weights', 'g2.pth')
    device = 'cuda' if torch.cuda.is_available() else 'cpu'

    g1 = LRNet()
    g2 = LRNet()

    print("Loading models and predicting...")

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
    
    return result

if __name__ == "__main__":
    video_path = './input/test_video.mp4'
    block_size = 16

    result = classify_video(video_path, block_size)

    print(result)
