# ComfyUI 视频帧提取器插件

一个用于ComfyUI的视频帧提取插件，可以加载视频并自动识别帧数，然后提取视频开头或结尾的指定数量的帧。

## 功能特点

- **视频加载**: 点击"加载视频"按钮选择视频文件
- **自动识别帧数**: 加载视频后自动显示视频的总帧数
- **灵活的帧提取**: 
  - 设置需要提取的帧数
  - 选择从视频开头或结尾提取帧
- **支持多种视频格式**: MP4, AVI, MOV, MKV, WebM, FLV, WMV等

## 安装方法

### 方法1: 手动安装
1. 将此文件夹复制到 `ComfyUI/custom_nodes/` 目录下
2. 安装依赖:
   ```bash
   pip install opencv-python
   ```
3. 重启ComfyUI

### 方法2: Git克隆
```bash
cd ComfyUI/custom_nodes/
git clone https://github.com/your-username/comfyui_video_frame_extractor.git
pip install -r comfyui_video_frame_extractor/requirements.txt
```

## 使用方法

1. 在ComfyUI中搜索"视频帧提取器"或"VideoFrameExtractor"节点
2. 点击节点中的"加载视频"按钮，选择要处理的视频文件
3. 视频加载后，"视频帧数"会自动显示视频的总帧数
4. 在"提取帧数"中设置要提取的帧数（默认为5帧）
5. 通过"提取帧位置"开关选择提取位置:
   - **开启（从开头提取）**: 提取第1帧到第N帧
   - **关闭（从结尾提取）**: 提取倒数第N帧到倒数第1帧
6. 连接输出到后续节点进行处理

## 节点说明

### 输入参数
| 参数名 | 类型 | 说明 |
|--------|------|------|
| video_path | STRING | 视频文件路径（通过按钮选择） |
| extract_count | INT | 要提取的帧数，范围1-9999 |
| from_start | BOOLEAN | 提取位置开关，开启=从开头，关闭=从结尾 |

### 输出
| 输出名 | 类型 | 说明 |
|--------|------|------|
| images | IMAGE | 提取的帧图像（批量张量） |
| total_frames | INT | 视频的总帧数 |

## 示例

### 提取视频开头5帧
- 设置 `extract_count` = 5
- 开启 `from_start` 开关
- 结果: 提取第1, 2, 3, 4, 5帧

### 提取视频结尾5帧
- 设置 `extract_count` = 5
- 关闭 `from_start` 开关
- 结果: 提取倒数第5, 4, 3, 2, 1帧

## 依赖

- opencv-python >= 4.5.0
- numpy >= 1.19.0
- torch >= 1.9.0
- Pillow >= 8.0.0

## 许可证

MIT License
