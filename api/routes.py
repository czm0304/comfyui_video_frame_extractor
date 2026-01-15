import os
import json
import base64
from io import BytesIO
from aiohttp import web

try:
    import cv2
except ImportError:
    cv2 = None

try:
    from PIL import Image
except ImportError:
    Image = None

import folder_paths


def get_full_video_path(video_path):
    """获取视频的完整路径"""
    if not video_path:
        return None
    
    if os.path.isabs(video_path):
        full_path = video_path
    else:
        input_dir = folder_paths.get_input_directory()
        full_path = os.path.join(input_dir, video_path)
    
    if os.path.exists(full_path):
        return full_path
    return None


def get_video_frame_count(video_path):
    """获取视频的总帧数"""
    if cv2 is None:
        return 0
    
    full_path = get_full_video_path(video_path)
    if not full_path:
        return 0
    
    try:
        cap = cv2.VideoCapture(full_path)
        if not cap.isOpened():
            return 0
        
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()
        return frame_count
    except Exception as e:
        print(f"获取视频帧数时出错: {e}")
        return 0


def get_video_preview_frame(video_path, max_width=300):
    """获取视频的第一帧作为预览"""
    if cv2 is None or Image is None:
        return None
    
    full_path = get_full_video_path(video_path)
    if not full_path:
        return None
    
    try:
        cap = cv2.VideoCapture(full_path)
        if not cap.isOpened():
            return None
        
        # 读取第一帧
        ret, frame = cap.read()
        cap.release()
        
        if not ret or frame is None:
            return None
        
        # BGR to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # 转换为PIL图像
        pil_image = Image.fromarray(frame_rgb)
        
        # 调整大小以适应预览
        width, height = pil_image.size
        if width > max_width:
            ratio = max_width / width
            new_height = int(height * ratio)
            pil_image = pil_image.resize((max_width, new_height), Image.LANCZOS)
        
        # 转换为base64
        buffer = BytesIO()
        pil_image.save(buffer, format="JPEG", quality=85)
        base64_image = base64.b64encode(buffer.getvalue()).decode("utf-8")
        
        return {
            "image": base64_image,
            "width": pil_image.size[0],
            "height": pil_image.size[1]
        }
    except Exception as e:
        print(f"获取视频预览帧时出错: {e}")
        return None


async def get_frame_count_handler(request):
    """API路由处理函数：获取视频帧数"""
    try:
        data = await request.json()
        video_path = data.get("video_path", "")
        
        frame_count = get_video_frame_count(video_path)
        
        return web.json_response({
            "success": True,
            "frame_count": frame_count
        })
    except Exception as e:
        return web.json_response({
            "success": False,
            "error": str(e),
            "frame_count": 0
        }, status=500)


async def get_preview_handler(request):
    """API路由处理函数：获取视频预览帧"""
    try:
        data = await request.json()
        video_path = data.get("video_path", "")
        max_width = data.get("max_width", 300)
        
        preview = get_video_preview_frame(video_path, max_width)
        
        if preview:
            return web.json_response({
                "success": True,
                "preview": preview
            })
        else:
            return web.json_response({
                "success": False,
                "error": "无法获取预览帧"
            })
    except Exception as e:
        return web.json_response({
            "success": False,
            "error": str(e)
        }, status=500)


__all__ = ["get_frame_count_handler", "get_preview_handler"]
