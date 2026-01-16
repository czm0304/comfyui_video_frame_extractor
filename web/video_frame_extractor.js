import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// 调整节点高度以适应内容
function fitHeight(node) {
    node.setSize([node.size[0], node.computeSize([node.size[0], node.size[1]])[1]]);
    node.graph?.setDirtyCanvas(true);
}

app.registerExtension({
    name: "Comfy.VideoFrameExtractor",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "VideoFrameExtractor") {
            // 保存原始的onNodeCreated方法
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const node = this;
                
                // 调用原始方法
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                // 初始化状态
                node.totalFrames = 0;
                node.currentVideoName = "";
                node.videoFile = null;
                
                // 延迟执行以确保widgets已创建
                setTimeout(() => {
                    node.setupCustomWidgets();
                }, 100);
            };
            
            // 设置自定义widgets
            nodeType.prototype.setupCustomWidgets = function() {
                const node = this;
                
                // 检查是否已经设置过
                if (node._customWidgetsSetup) return;
                node._customWidgetsSetup = true;
                
                // 找到video_path小部件并隐藏
                const videoPathWidget = node.widgets?.find(w => w.name === "video_path");
                if (videoPathWidget) {
                    videoPathWidget.type = "converted-widget";
                    videoPathWidget.computeSize = () => [0, -4];
                    node.videoPathWidget = videoPathWidget;
                }
                
                // 添加加载按钮
                const loadButton = node.addWidget("button", "加载视频", null, () => {
                    node.openFileDialog();
                });
                loadButton.serialize = false;
                
                // 添加视频名称显示
                const videoNameWidget = node.addWidget("text", "当前视频", "未选择", () => {}, {});
                videoNameWidget.disabled = true;
                videoNameWidget.serialize = false;
                node.videoNameWidget = videoNameWidget;
                
                // 添加帧数显示
                const frameCountWidget = node.addWidget("text", "视频帧数", "0", () => {}, {});
                frameCountWidget.disabled = true;
                frameCountWidget.serialize = false;
                node.frameCountWidget = frameCountWidget;
                
                // 创建视频预览DOM Widget
                node.createVideoPreviewWidget();
                
                // 重新排序widgets
                node.reorderWidgets();
                
                // 设置节点尺寸
                node.size[0] = Math.max(node.size[0], 280);
                node.size[1] = Math.max(node.size[1], 300);
                
                app.graph.setDirtyCanvas(true, true);
            };
            
            // 创建视频预览Widget
            nodeType.prototype.createVideoPreviewWidget = function() {
                const node = this;
                
                // 创建容器元素
                const container = document.createElement("div");
                container.style.width = "100%";
                container.style.background = "#1a1a1a";
                container.style.borderRadius = "4px";
                container.style.overflow = "hidden";
                container.style.minHeight = "20px";
                
                // 创建视频元素
                const videoEl = document.createElement("video");
                videoEl.controls = false;
                videoEl.loop = true;
                videoEl.muted = true;
                videoEl.autoplay = true;
                videoEl.playsInline = true;
                videoEl.style.width = "100%";
                videoEl.style.display = "none";
                
                // 创建图片元素(用于显示第一帧)
                const imgEl = document.createElement("img");
                imgEl.style.width = "100%";
                imgEl.style.display = "none";
                
                // 错误处理
                videoEl.addEventListener("error", (e) => {
                    console.log("视频加载失败:", e);
                });
                
                container.appendChild(videoEl);
                container.appendChild(imgEl);
                
                // 添加DOM Widget
                const previewWidget = node.addDOMWidget("videopreview", "preview", container, {
                    serialize: false,
                    hideOnZoom: false,
                });
                
                previewWidget.videoEl = videoEl;
                previewWidget.imgEl = imgEl;
                previewWidget.parentEl = container;
                previewWidget.aspectRatio = null;
                
                // 计算widget尺寸
                previewWidget.computeSize = function(width) {
                    if (this.aspectRatio && (videoEl.style.display !== "none" || imgEl.style.display !== "none")) {
                        let height = (node.size[0] - 20) / this.aspectRatio;
                        if (!(height > 0)) {
                            height = 0;
                        }
                        return [width, height + 10];
                    }
                    return [width, 20];
                };
                
                // 视频加载完成后调整尺寸
                videoEl.addEventListener("loadedmetadata", () => {
                    if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
                        previewWidget.aspectRatio = videoEl.videoWidth / videoEl.videoHeight;
                        videoEl.style.display = "block";
                        fitHeight(node);
                    }
                });
                
                // 图片加载完成后调整尺寸
                imgEl.addEventListener("load", () => {
                    if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
                        previewWidget.aspectRatio = imgEl.naturalWidth / imgEl.naturalHeight;
                        imgEl.style.display = "block";
                        fitHeight(node);
                    }
                });
                
                // 鼠标悬停播放
                videoEl.onmouseenter = () => {
                    videoEl.muted = false;
                };
                videoEl.onmouseleave = () => {
                    videoEl.muted = true;
                };
                
                node.previewWidget = previewWidget;
            };
            
            // 重新排列小部件顺序的方法
            nodeType.prototype.reorderWidgets = function() {
                if (!this.widgets) return;
                
                // 找到各个小部件
                const loadButton = this.widgets.find(w => w.name === "加载视频");
                const videoName = this.widgets.find(w => w.name === "当前视频");
                const frameCount = this.widgets.find(w => w.name === "视频帧数");
                const extractCount = this.widgets.find(w => w.name === "extract_count");
                const fromStart = this.widgets.find(w => w.name === "from_start");
                const videoPath = this.widgets.find(w => w.name === "video_path");
                
                // 重新排列: 加载按钮 -> 当前视频 -> 视频帧数 -> 提取帧数 -> 提取位置
                const newOrder = [];
                if (loadButton) newOrder.push(loadButton);
                if (videoName) newOrder.push(videoName);
                if (frameCount) newOrder.push(frameCount);
                if (extractCount) newOrder.push(extractCount);
                if (fromStart) newOrder.push(fromStart);
                if (videoPath) newOrder.push(videoPath);
                
                // 添加其他小部件
                for (const w of this.widgets) {
                    if (!newOrder.includes(w)) {
                        newOrder.push(w);
                    }
                }
                
                this.widgets = newOrder;
            };
            
            // 打开文件对话框的方法
            nodeType.prototype.openFileDialog = async function() {
                try {
                    // 创建隐藏的文件输入元素
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "video/*,.mp4,.avi,.mov,.mkv,.webm,.flv,.wmv";
                    input.style.display = "none";
                    document.body.appendChild(input);
                    
                    // 监听文件选择事件
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            await this.handleVideoFile(file);
                        }
                        // 清理
                        document.body.removeChild(input);
                    };
                    
                    // 监听取消事件
                    input.oncancel = () => {
                        document.body.removeChild(input);
                    };
                    
                    // 触发文件选择
                    input.click();
                } catch (error) {
                    console.error("打开文件对话框失败:", error);
                    alert("打开文件对话框失败: " + error.message);
                }
            };
            
            // 处理视频文件的方法
            nodeType.prototype.handleVideoFile = async function(file) {
                const node = this;
                try {
                    // 更新状态：正在处理
                    if (node.videoNameWidget) {
                        node.videoNameWidget.value = "正在上传...";
                    }
                    app.graph.setDirtyCanvas(true, true);
                    
                    // 显示本地视频预览
                    if (node.previewWidget && node.previewWidget.videoEl) {
                        const videoUrl = URL.createObjectURL(file);
                        node.previewWidget.videoEl.src = videoUrl;
                        node.previewWidget.imgEl.style.display = "none";
                        node.previewWidget.videoEl.play().catch(e => {
                            console.log("视频自动播放失败:", e);
                        });
                    }
                    
                    // 上传文件到ComfyUI
                    const formData = new FormData();
                    formData.append("image", file, file.name);
                    formData.append("subfolder", "video_uploads");
                    formData.append("type", "input");
                    
                    const response = await api.fetchApi("/upload/image", {
                        method: "POST",
                        body: formData
                    });
                    
                    if (response.status !== 200) {
                        throw new Error("上传失败: " + response.statusText);
                    }
                    
                    const result = await response.json();
                    const uploadedPath = result.subfolder 
                        ? `${result.subfolder}/${result.name}` 
                        : result.name;
                    
                    // 更新video_path小部件
                    if (node.videoPathWidget) {
                        node.videoPathWidget.value = uploadedPath;
                    }
                    
                    // 更新视频名称显示
                    node.currentVideoName = file.name;
                    if (node.videoNameWidget) {
                        node.videoNameWidget.value = file.name;
                    }
                    
                    // 获取视频帧数
                    await node.getVideoFrameCount(uploadedPath);
                    
                    // 标记图形需要更新
                    app.graph.setDirtyCanvas(true, true);
                    
                } catch (error) {
                    console.error("处理视频文件失败:", error);
                    if (node.videoNameWidget) {
                        node.videoNameWidget.value = "上传失败";
                    }
                    alert("处理视频文件失败: " + error.message);
                }
            };
            
            // 获取视频帧数的方法
            nodeType.prototype.getVideoFrameCount = async function(videoPath) {
                try {
                    const response = await api.fetchApi("/video_frame_extractor/get_frame_count", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ video_path: videoPath })
                    });
                    
                    if (response.status === 200) {
                        const result = await response.json();
                        this.totalFrames = result.frame_count || 0;
                        
                        // 更新帧数显示
                        if (this.frameCountWidget) {
                            this.frameCountWidget.value = String(this.totalFrames);
                        }
                    }
                } catch (error) {
                    console.error("获取帧数失败:", error);
                    this.totalFrames = 0;
                    if (this.frameCountWidget) {
                        this.frameCountWidget.value = "获取中...";
                    }
                }
            };
            
            // 序列化时包含总帧数和视频名称
            const onSerialize = nodeType.prototype.onSerialize;
            nodeType.prototype.onSerialize = function(o) {
                if (onSerialize) {
                    onSerialize.apply(this, arguments);
                }
                o.totalFrames = this.totalFrames || 0;
                o.currentVideoName = this.currentVideoName || "";
            };
            
            // 反序列化时恢复总帧数和视频名称
            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function(o) {
                if (onConfigure) {
                    onConfigure.apply(this, arguments);
                }
                
                const node = this;
                setTimeout(() => {
                    if (o.totalFrames !== undefined) {
                        node.totalFrames = o.totalFrames;
                        if (node.frameCountWidget) {
                            node.frameCountWidget.value = String(o.totalFrames);
                        }
                    }
                    if (o.currentVideoName) {
                        node.currentVideoName = o.currentVideoName;
                        if (node.videoNameWidget) {
                            node.videoNameWidget.value = o.currentVideoName;
                        }
                    }
                }, 150);
            };
        }
    }
});
