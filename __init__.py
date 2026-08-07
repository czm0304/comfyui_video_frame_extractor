from .nodes.video_frame_extractor import VideoFrameExtractor
from .nodes.image_loader import ImageLoaderWithPreview
from .nodes.video_frame_processor import VideoFrameProcessor
from .nodes.ltx_director_ic_input import LTXDirectorICInput
from .nodes.minimax_h3_director import MiniMaxH3DirectorWH
from .nodes.conditioning import (
    MiniMaxH3DirectorConditioningWH,
    MiniMaxH3DirectorPlannerConditioningWH,
)

NODE_CLASS_MAPPINGS = {
    "VideoFrameExtractor": VideoFrameExtractor,
    "ImageLoaderWithPreview": ImageLoaderWithPreview,
    "VideoFrameProcessor": VideoFrameProcessor,
    "LTXDirectorICInput": LTXDirectorICInput,
    "MiniMaxH3DirectorWH": MiniMaxH3DirectorWH,
    "MiniMaxH3DirectorConditioningWH": MiniMaxH3DirectorConditioningWH,
    "MiniMaxH3DirectorPlannerConditioningWH": MiniMaxH3DirectorPlannerConditioningWH,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "VideoFrameExtractor": "视频帧提取器",
    "ImageLoaderWithPreview": "媒体提取器",
    "VideoFrameProcessor": "视频帧处理",
    "LTXDirectorICInput": "LTX Director (IC-LoRA Input)",
    "MiniMaxH3DirectorWH": "MiniMaxH3Director (宽高输入)",
    "MiniMaxH3DirectorConditioningWH": "MiniMax H3 Director Conditioning (宽高输入)",
    "MiniMaxH3DirectorPlannerConditioningWH": "MiniMax H3 Director Planner Conditioning (宽高输入)",
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

# 调试日志：打印已注册的 MiniMax 相关节点
import logging as _load_logger
_load_logger = _load_logger.getLogger("comfyui_video_frame_extractor")
_minimax_nodes = {k: v.__name__ for k, v in NODE_CLASS_MAPPINGS.items() if "MiniMax" in k}
_load_logger.info("[comfyui_video_frame_extractor] Registered MiniMax nodes: %s", _minimax_nodes)

# 注册API路由
import logging as _logging
from server import PromptServer
from .api.routes import get_frame_count_handler, get_preview_handler

routes = PromptServer.instance.routes
routes.post("/video_frame_extractor/get_frame_count")(get_frame_count_handler)
routes.post("/video_frame_extractor/get_preview")(get_preview_handler)

# 注册 MiniMax H3 Director HTTP 路由（分块上传、视频探测、镜头检测）
_director_log = _logging.getLogger("ComfyUI-MiniMaxH3-Director")
try:
    from .director.http_routes import register_routes as _register_director_routes

    if not _register_director_routes():
        _director_log.warning(
            "MiniMax H3 Director HTTP routes deferred (PromptServer not ready). "
            "Restart ComfyUI if /minimax/director/* returns 404."
        )
except Exception as _director_routes_exc:
    _director_log.warning("MiniMax H3 Director HTTP routes failed to load: %s", _director_routes_exc)

# 注册 MiniMax H3 Director 提示词增强路由（LLM 增强、图像/视频帧提取）
try:
    from .director.prompt_enhance_routes import register_prompt_enhance_routes as _register_pe_routes
    from .director.http_routes import _register_route as _director_register_route

    _register_pe_routes(routes, _director_register_route)
except Exception as _pe_routes_exc:
    _director_log.warning("MiniMax H3 Director prompt-enhance HTTP routes failed to load: %s", _pe_routes_exc)
