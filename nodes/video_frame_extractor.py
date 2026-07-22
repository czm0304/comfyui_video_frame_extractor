import torch

class VideoFrameExtractor:
    """
    视频帧提取器节点
    接收视频并提取指定数量的帧（从开头或结尾）
    """
    
    def __init__(self):
        pass
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "video": ("VIDEO",),
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

    def extract_frames(self, video, extract_count, from_start):
        components = video.get_components()
        frames = components.images
        total_frames = int(frames.shape[0])

        if total_frames == 0:
            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return (empty_image, 0,)

        actual_extract_count = min(extract_count, total_frames)
        if from_start:
            extracted_frames = frames[:actual_extract_count]
        else:
            extracted_frames = frames[-actual_extract_count:]

        return (extracted_frames.contiguous(), total_frames,)

    @classmethod
    def IS_CHANGED(cls, video, extract_count, from_start):
        # 当参数改变时重新执行
        return (extract_count, from_start)
