import pathlib
import os
import sys
import numpy as np
import cv2
from os.path import join
import torch
from tqdm import tqdm
# Avoid errors when directly run this script from './demo'
project_root = pathlib.Path(__file__).parent.parent.as_posix()
sys.path.extend([project_root])
import utils.shared as shared
from utils.landmark_utils import detect_frames_track
from utils.model import LRNet
from collections import Counter


def detect_track(input_path, video):
    vidcap = cv2.VideoCapture(join(input_path, video))
    fps = vidcap.get(cv2.CAP_PROP_FPS)
    frames = []
    while True:
        success, image = vidcap.read()
        if success:
            frames.append(image)
        else:
            break

    raw_data = detect_frames_track(frames, video, fps)
    vidcap.release()
    return np.array(raw_data)


def get_data_from_videos(input_path, block):
    """
    This function extracts landmarks from videos and directly returns the data for classification.
    """
    videos = os.listdir(input_path)
    videos.sort()

    x = []
    x_diff = []
    sample_to_video = []

    print("Extracting landmarks and loading data...")
    for video in tqdm(videos):
        if video.startswith('.'):
            continue

        video_name = video.split('.')[0]
        print(f"Processing video: {video}")

        # Extract landmarks
        raw_data = detect_track(input_path, video)

        if len(raw_data) == 0:
            print(f"No face detected in {video}")
            continue

        # Process data for classification
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
    """
    This function merges predictions from multiple samples in a video and returns the overall prediction for each video.
    """
    prediction_video = []
    pre_count = {}
    for p, v_label in zip(mix_prediction, s2v):
        p_bi = 0
        if p >= 0.5:
            p_bi = 1
        if v_label in pre_count:
            pre_count[v_label] += p_bi
        else:
            pre_count[v_label] = p_bi
    for key in pre_count.keys():
        prediction_video.append(pre_count[key] / vc[key])
    return prediction_video


def classify_videos(input_path, block_size):
    """
    This function classifies videos in the input path and returns the prediction results.

    :param input_path: Path to the directory containing videos to
    :param block_size: Number of frames to be used for classification
    :return: List of prediction results for each video

    """
    test_samples, test_samples_diff, test_sv = get_data_from_videos(input_path, block_size)

    weights_g1 = './model_weights/g1.pth'  # Path to G1 model weights
    weights_g2 = './model_weights/g2.pth'  # Path to G2 model weights
    device = 'cuda' if torch.cuda.is_available() else 'cpu'  # Device to run the model on

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

    # Merge predictions for each video
    prediction_video = merge_video_prediction(mix_predict, test_sv, video_count)

    print("\n\n", "#----Prediction Results----#")
    video_names = list(video_count.keys())
    for i, pd in enumerate(prediction_video):
        if pd >= 0.5:
            label = "Fake"
        else:
            label = "Real"
        print(f"{video_names[i]} - Prediction label: {label}; Score: {pd}")
    print("#------------End------------#")

    prediction_video = [{"video": video_names[i], "label": "Fake" if prediction_video[i] >= 0.5 else "Real", "score": prediction_video[i]} for i in range(len(prediction_video))]
    
    return prediction_video

if __name__ == "__main__":
    # input_path = './test_video/'
    input_path = './input/'
    block_size = 16

    result = classify_videos(input_path, block_size)

    print(result)