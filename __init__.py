from .nodes.video_frame_extractor import VideoFrameExtractor

NODE_CLASS_MAPPINGS = {
    "VideoFrameExtractor": VideoFrameExtractor,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "VideoFrameExtractor": "视频帧提取器",
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

# 注册API路由
from server import PromptServer
from .api.routes import get_frame_count_handler, get_preview_handler

routes = PromptServer.instance.routes
routes.post("/video_frame_extractor/get_frame_count")(get_frame_count_handler)
routes.post("/video_frame_extractor/get_preview")(get_preview_handler)
