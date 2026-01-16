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


# 支持的文件扩展名
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff', '.tif'}
VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v'}


class ImageLoaderWithPreview:
    """
    媒体提取器节点
    加载图像或视频文件并在节点内预览
    支持图像直接输出，视频可提取多帧
    """
    
    def __init__(self):
        pass
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image_path": ("STRING", {
                    "default": "",
                    "multiline": False,
                }),
                "extract_count": ("INT", {
                    "default": 1,
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
    
    RETURN_TYPES = ("IMAGE", "INT", "INT", "INT",)
    RETURN_NAMES = ("images", "width", "height", "total_frames",)
    FUNCTION = "load_media"
    CATEGORY = "图像处理"
    OUTPUT_NODE = False

    def load_media(self, image_path, extract_count=1, from_start=True):
        # 处理路径
        full_path = image_path
        if not os.path.isabs(image_path) and folder_paths is not None:
            input_dir = folder_paths.get_input_directory()
            full_path = os.path.join(input_dir, image_path)
        
        if not full_path or not os.path.exists(full_path):
            # 返回空图像
            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return (empty_image, 64, 64, 0,)
        
        # 判断文件类型
        ext = os.path.splitext(full_path)[1].lower()
        
        if ext in VIDEO_EXTENSIONS:
            return self._load_video_frames(full_path, extract_count, from_start)
        else:
            return self._load_image(full_path)
    
    def _load_image(self, full_path):
        """加载图像文件"""
        try:
            img = Image.open(full_path)
            
            # 转换为RGB模式
            if img.mode == "RGBA":
                background = Image.new("RGB", img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])
                img = background
            elif img.mode != "RGB":
                img = img.convert("RGB")
            
            width, height = img.size
            img_array = np.array(img).astype(np.float32) / 255.0
            img_tensor = torch.from_numpy(img_array).unsqueeze(0)
            
            return (img_tensor, width, height, 1,)
            
        except Exception as e:
            print(f"加载图像失败: {e}")
            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return (empty_image, 64, 64, 0,)
    
    def _load_video_frames(self, full_path, extract_count, from_start):
        """从视频中提取多帧"""
        if cv2 is None:
            print("opencv-python 未安装，无法加载视频")
            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return (empty_image, 64, 64, 0,)
        
        try:
            cap = cv2.VideoCapture(full_path)
            if not cap.isOpened():
                print(f"无法打开视频文件: {full_path}")
                empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                return (empty_image, 64, 64, 0,)
            
            # 获取视频信息
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            if total_frames == 0:
                cap.release()
                empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                return (empty_image, 64, 64, 0,)
            
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
            width, height = 0, 0
            
            for idx in frame_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ret, frame = cap.read()
                if ret:
                    # BGR to RGB
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    if width == 0:
                        height, width = frame_rgb.shape[:2]
                    # 转换为float32并归一化到0-1
                    frame_normalized = frame_rgb.astype(np.float32) / 255.0
                    frames.append(frame_normalized)
            
            cap.release()
            
            if not frames:
                empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                return (empty_image, 64, 64, total_frames,)
            
            # 将帧列表转换为张量 (batch, height, width, channels)
            frames_array = np.stack(frames, axis=0)
            frames_tensor = torch.from_numpy(frames_array)
            
            return (frames_tensor, width, height, total_frames,)
            
        except Exception as e:
            print(f"加载视频失败: {e}")
            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return (empty_image, 64, 64, 0,)

    @classmethod
    def IS_CHANGED(cls, image_path, extract_count=1, from_start=True):
        if not image_path:
            return ""
        
        full_path = image_path
        if not os.path.isabs(image_path) and folder_paths is not None:
            input_dir = folder_paths.get_input_directory()
            full_path = os.path.join(input_dir, image_path)
        
        if os.path.exists(full_path):
            return (os.path.getmtime(full_path), extract_count, from_start)
        return (image_path, extract_count, from_start)
