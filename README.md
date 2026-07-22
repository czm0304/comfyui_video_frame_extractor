# ComfyUI 视频帧提取器插件

一个用于ComfyUI的媒体处理插件，提供视频帧提取和媒体加载功能。

## 功能特点

### 媒体提取器节点
- **统一媒体加载**: 同时支持图像和视频文件
- **节点内预览**: 加载后直接在节点内显示预览
- **视频帧提取**: 从视频中提取指定数量的帧
- **灵活的提取位置**: 从视频开头或结尾提取帧

### 视频帧提取器节点
- **视频连接输入**: 接收 ComfyUI 原生 `VIDEO` 连接
- **自动识别帧数**: 自动读取输入视频的总帧数
- **灵活的帧提取**: 设置帧数和提取位置

### LTX Director (IC-LoRA Input) 节点
- **独立克隆节点**: 节点 ID 为 `LTXDirectorICInput`，不会覆盖原版 LTX Director
- **IC-LoRA 视频连接**: 新增 `IC-LoRA Input: VIDEO` 输入端
- **自动轨道映射**: 连接视频后自动在 `IC-LoRA Input` 轨道创建或更新对应片段
- **运行时兼容**: 非文件型 VIDEO 会在执行时保存到输入目录并注入 motion guide 数据

### 支持的格式
- **图像**: PNG, JPG, JPEG, GIF, BMP, WebP, TIFF
- **视频**: MP4, AVI, MOV, MKV, WebM, FLV, WMV, M4V

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

---

## 节点1: 媒体提取器

在ComfyUI中搜索 **"媒体提取器"** 或 **"ImageLoaderWithPreview"**

### 使用方法

1. 点击节点中的"加载媒体"按钮
2. 选择图像或视频文件
3. 文件会在节点内显示预览
4. 如果是视频，可以设置提取帧数和位置
5. 连接输出到后续节点

### 输入参数
| 参数名 | 类型 | 说明 |
|--------|------|------|
| image_path | STRING | 媒体文件路径（通过按钮选择） |
| extract_count | INT | 视频提取帧数，范围1-9999（默认1） |
| from_start | BOOLEAN | 提取位置开关，开启=从开头，关闭=从结尾 |

### 输出
| 输出名 | 类型 | 说明 |
|--------|------|------|
| images | IMAGE | 图像或提取的视频帧（批量张量） |
| width | INT | 图像/视频宽度 |
| height | INT | 图像/视频高度 |
| total_frames | INT | 视频总帧数（图像返回1） |

### 使用示例

#### 加载图像
1. 点击"加载媒体"选择图片
2. 图片在节点内预览
3. 输出单张图像

#### 提取视频开头5帧
1. 点击"加载媒体"选择视频
2. 设置 `extract_count` = 5
3. 开启 `from_start` 开关
4. 结果: 提取第1, 2, 3, 4, 5帧

#### 提取视频结尾5帧
1. 点击"加载媒体"选择视频
2. 设置 `extract_count` = 5
3. 关闭 `from_start` 开关
4. 结果: 提取倒数第5, 4, 3, 2, 1帧

---

## 节点2: 视频帧提取器

在ComfyUI中搜索 **"视频帧提取器"** 或 **"VideoFrameExtractor"**

### 使用方法

1. 将 `VIDEO` 输出连接到节点的 `video` 输入端
2. 设置提取帧数和位置
3. 连接输出到后续节点

### 输入参数
| 参数名 | 类型 | 说明 |
|--------|------|------|
| video | VIDEO | 连接线视频输入 |
| extract_count | INT | 要提取的帧数，范围1-9999 |
| from_start | BOOLEAN | 提取位置开关，开启=从开头，关闭=从结尾 |

### 输出
| 输出名 | 类型 | 说明 |
|--------|------|------|
| images | IMAGE | 提取的帧图像（批量张量） |
| total_frames | INT | 视频的总帧数 |

---

## 节点3: LTX Director (IC-LoRA Input)

在ComfyUI中搜索 **"LTX Director (IC-LoRA Input)"** 或 **"LTXDirectorICInput"**

### 使用方法

1. 将前一个节点的 `VIDEO` 输出连接到 `IC-LoRA Input` 输入端
2. 如果上游是 `Load Video` 等文件型节点，视频会立即显示在时间轴的 `IC-LoRA Input` 轨道
3. 其他 VIDEO 来源会先显示连接占位片段，执行后自动保存视频并更新轨道
4. 将 `motion_guide_data` 输出连接到 LTX Director Guide 的对应输入

连接输入生成的片段默认从第 0 帧开始，强度为 `1.0`，attention strength 为 `0.65`。

---

## 依赖

- opencv-python >= 4.5.0
- numpy >= 1.19.0
- torch >= 1.9.0
- Pillow >= 8.0.0

## 许可证

MIT License
