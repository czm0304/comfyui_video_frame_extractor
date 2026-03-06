import torch


class VideoFrameProcessor:
    """
    视频帧处理节点
    清除输入视频帧的首帧或尾帧
    """

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "images": ("IMAGE",),
                "remove_count": ("INT", {
                    "default": 1,
                    "min": 0,
                    "max": 9999,
                    "step": 1,
                    "display": "number"
                }),
                "remove_tail": ("BOOLEAN", {
                    "default": True,
                    "label_on": "清除尾帧",
                    "label_off": "清除首帧"
                }),
            },
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("images",)
    FUNCTION = "process_frames"
    CATEGORY = "视频处理"
    OUTPUT_NODE = False

    def process_frames(self, images, remove_count, remove_tail):
        total_frames = images.shape[0]

        if remove_count <= 0 or total_frames == 0:
            return (images,)

        if remove_count >= total_frames:
            empty_image = torch.zeros((1, images.shape[1], images.shape[2], images.shape[3]), dtype=images.dtype)
            return (empty_image,)

        if remove_tail:
            # 清除尾帧：保留前面的帧
            result = images[:total_frames - remove_count]
        else:
            # 清除首帧：保留后面的帧
            result = images[remove_count:]

        return (result,)

    @classmethod
    def IS_CHANGED(cls, images, remove_count, remove_tail):
        return (remove_count, remove_tail)
