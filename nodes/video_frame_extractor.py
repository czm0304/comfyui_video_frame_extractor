import os
import torch
import numpy as np
from PIL import Image

try:
    import cv2
except ImportError:
    print("请安装opencv-python: pip install opencv-python")
    cv2 = None

try:
    import folder_paths
except ImportError:
    folder_paths = None

class VideoFrameExtractor:
    """
    视频帧提取器节点
    加载视频并提取指定数量的帧（从开头或结尾）
    """
    
    def __init__(self):
        pass
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "video_path": ("STRING", {
                    "default": "",
                    "multiline": False,
                }),
                "extract_count": ("INT", {
                    "default": 5,
                    "min": 1,
                    "max": 9999,
                    "step": 1,
                    "display": "number"
                }),
                "from_start": ("BOOLEAN", {
                    "default": True,
                    "label_on": "从开头提取",
                    "label_off": "从结尾提取"
                }),
            },
        }
    
    RETURN_TYPES = ("IMAGE", "INT",)
    RETURN_NAMES = ("images", "total_frames",)
    FUNCTION = "extract_frames"
    CATEGORY = "视频处理"
    OUTPUT_NODE = False

    def extract_frames(self, video_path, extract_count, from_start):
        if cv2 is None:
            raise RuntimeError("opencv-python 未安装，请运行: pip install opencv-python")
        
        # 处理视频路径
        full_path = video_path
        if not os.path.isabs(video_path) and folder_paths is not None:
            input_dir = folder_paths.get_input_directory()
            full_path = os.path.join(input_dir, video_path)
        
        if not full_path or not os.path.exists(full_path):
            # 返回空图像和0帧
            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return (empty_image, 0,)
        
        # 打开视频
        cap = cv2.VideoCapture(full_path)
        if not cap.isOpened():
            raise RuntimeError(f"无法打开视频文件: {full_path}")
        
        # 获取总帧数
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        if total_frames == 0:
            cap.release()
            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return (empty_image, 0,)
        
        # 限制提取数量不超过总帧数
        actual_extract_count = min(extract_count, total_frames)
        
        # 计算要提取的帧索引
        if from_start:
            # 从开头提取: 第1帧到第N帧
            frame_indices = list(range(0, actual_extract_count))
        else:
            # 从结尾提取: 倒数第N帧到倒数第1帧
            start_idx = total_frames - actual_extract_count
            frame_indices = list(range(start_idx, total_frames))
        
        # 提取帧
        frames = []
        for idx in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret:
                # BGR to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                # 转换为float32并归一化到0-1
                frame_normalized = frame_rgb.astype(np.float32) / 255.0
                frames.append(frame_normalized)
        
        cap.release()
        
        if not frames:
            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return (empty_image, total_frames,)
        
        # 将帧列表转换为张量 (batch, height, width, channels)
        frames_array = np.stack(frames, axis=0)
        frames_tensor = torch.from_numpy(frames_array)
        
        return (frames_tensor, total_frames,)

    @classmethod
    def IS_CHANGED(cls, video_path, extract_count, from_start):
        # 当参数改变时重新执行
        return (video_path, extract_count, from_start)
