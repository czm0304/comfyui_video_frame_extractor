import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// 调整节点高度以适应内容
function fitHeight(node) {
    node.setSize([node.size[0], node.computeSize([node.size[0], node.size[1]])[1]]);
    node.graph?.setDirtyCanvas(true);
}

app.registerExtension({
    name: "Comfy.ImageLoaderWithPreview",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ImageLoaderWithPreview") {
            // 保存原始的onNodeCreated方法
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const node = this;
                
                // 调用原始方法
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                // 初始化状态
                node.currentImageName = "";
                node.imageWidth = 0;
                node.imageHeight = 0;
                
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
                
                // 找到image_path小部件并完全隐藏
                const imagePathWidget = node.widgets?.find(w => w.name === "image_path");
                if (imagePathWidget) {
                    imagePathWidget.type = "hidden";
                    imagePathWidget.computeSize = () => [0, 0];
                    imagePathWidget.hidden = true;
                    node.imagePathWidget = imagePathWidget;
                }
                
                // 添加加载按钮
                const loadButton = node.addWidget("button", "加载媒体", null, () => {
                    node.openFileDialog();
                });
                loadButton.serialize = false;
                
                // 添加图像名称显示
                const imageNameWidget = node.addWidget("text", "当前图像", "未选择", () => {}, {});
                imageNameWidget.disabled = true;
                imageNameWidget.serialize = false;
                node.imageNameWidget = imageNameWidget;
                
                // 添加尺寸显示
                const imageSizeWidget = node.addWidget("text", "图像尺寸", "0 x 0", () => {}, {});
                imageSizeWidget.disabled = true;
                imageSizeWidget.serialize = false;
                node.imageSizeWidget = imageSizeWidget;
                
                // 创建图像预览DOM Widget
                node.createImagePreviewWidget();
                
                // 重新排序widgets
                node.reorderWidgets();
                
                // 设置节点尺寸
                node.size[0] = Math.max(node.size[0], 280);
                node.size[1] = Math.max(node.size[1], 300);
                
                app.graph.setDirtyCanvas(true, true);
            };
            
            // 创建媒体预览Widget（支持图像和视频）
            nodeType.prototype.createImagePreviewWidget = function() {
                const node = this;
                
                // 创建容器元素
                const container = document.createElement("div");
                container.style.width = "100%";
                container.style.background = "#1a1a1a";
                container.style.borderRadius = "4px";
                container.style.overflow = "hidden";
                container.style.minHeight = "20px";
                
                // 创建图片元素
                const imgEl = document.createElement("img");
                imgEl.style.width = "100%";
                imgEl.style.display = "none";
                imgEl.style.cursor = "pointer";
                imgEl.title = "点击加载新媒体";
                
                // 创建视频元素
                const videoEl = document.createElement("video");
                videoEl.controls = false;
                videoEl.loop = true;
                videoEl.muted = true;
                videoEl.autoplay = true;
                videoEl.playsInline = true;
                videoEl.style.width = "100%";
                videoEl.style.display = "none";
                videoEl.style.cursor = "pointer";
                videoEl.title = "点击加载新媒体";
                
                // 点击可以加载新媒体
                imgEl.addEventListener("click", () => {
                    node.openFileDialog();
                });
                videoEl.addEventListener("click", () => {
                    node.openFileDialog();
                });
                
                // 错误处理
                imgEl.addEventListener("error", (e) => {
                    console.log("图像加载失败:", e);
                    imgEl.style.display = "none";
                });
                videoEl.addEventListener("error", (e) => {
                    console.log("视频加载失败:", e);
                    videoEl.style.display = "none";
                });
                
                container.appendChild(imgEl);
                container.appendChild(videoEl);
                
                // 添加DOM Widget
                const previewWidget = node.addDOMWidget("mediapreview", "preview", container, {
                    serialize: false,
                    hideOnZoom: false,
                });
                
                previewWidget.imgEl = imgEl;
                previewWidget.videoEl = videoEl;
                previewWidget.parentEl = container;
                previewWidget.aspectRatio = null;
                
                // 计算widget尺寸
                previewWidget.computeSize = function(width) {
                    if (this.aspectRatio && (imgEl.style.display !== "none" || videoEl.style.display !== "none")) {
                        let height = (node.size[0] - 20) / this.aspectRatio;
                        if (!(height > 0)) {
                            height = 0;
                        }
                        return [width, height + 10];
                    }
                    return [width, 20];
                };
                
                // 图片加载完成后调整尺寸
                imgEl.addEventListener("load", () => {
                    if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
                        previewWidget.aspectRatio = imgEl.naturalWidth / imgEl.naturalHeight;
                        imgEl.style.display = "block";
                        videoEl.style.display = "none";
                        fitHeight(node);
                    }
                });
                
                // 视频加载完成后调整尺寸
                videoEl.addEventListener("loadedmetadata", () => {
                    if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
                        previewWidget.aspectRatio = videoEl.videoWidth / videoEl.videoHeight;
                        videoEl.style.display = "block";
                        imgEl.style.display = "none";
                        fitHeight(node);
                    }
                });
                
                // 鼠标悬停播放声音
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
                const loadButton = this.widgets.find(w => w.name === "加载媒体");
                const imageName = this.widgets.find(w => w.name === "当前图像");
                const imageSize = this.widgets.find(w => w.name === "图像尺寸");
                const extractCount = this.widgets.find(w => w.name === "extract_count");
                const fromStart = this.widgets.find(w => w.name === "from_start");
                const preview = this.widgets.find(w => w.name === "mediapreview");
                const imagePath = this.widgets.find(w => w.name === "image_path");
                
                // 重新排列: 加载按钮 -> 当前图像 -> 图像尺寸 -> 提取帧数 -> 提取位置 -> 预览
                const newOrder = [];
                if (loadButton) newOrder.push(loadButton);
                if (imageName) newOrder.push(imageName);
                if (imageSize) newOrder.push(imageSize);
                if (extractCount) newOrder.push(extractCount);
                if (fromStart) newOrder.push(fromStart);
                if (preview) newOrder.push(preview);
                
                // 添加其他小部件(包括隐藏的)
                for (const w of this.widgets) {
                    if (!newOrder.includes(w)) {
                        newOrder.push(w);
                    }
                }
                
                this.widgets = newOrder;
            };
            
            // 打开文件对话框的方法（支持图像和视频）
            nodeType.prototype.openFileDialog = async function() {
                try {
                    // 创建隐藏的文件输入元素
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*,video/*,.png,.jpg,.jpeg,.gif,.bmp,.webp,.tiff,.mp4,.avi,.mov,.mkv,.webm,.flv,.wmv,.m4v";
                    input.style.display = "none";
                    document.body.appendChild(input);
                    
                    // 监听文件选择事件
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            await this.handleMediaFile(file);
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
            
            // 判断是否为视频文件
            nodeType.prototype.isVideoFile = function(filename) {
                const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v'];
                const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
                return videoExtensions.includes(ext);
            };
            
            // 处理媒体文件的方法（支持图像和视频）
            nodeType.prototype.handleMediaFile = async function(file) {
                const node = this;
                const isVideo = node.isVideoFile(file.name);
                
                try {
                    // 更新状态：正在处理
                    if (node.imageNameWidget) {
                        node.imageNameWidget.value = "正在上传...";
                    }
                    app.graph.setDirtyCanvas(true, true);
                    
                    // 创建本地预览URL
                    const localUrl = URL.createObjectURL(file);
                    
                    // 根据文件类型显示预览
                    if (node.previewWidget) {
                        if (isVideo) {
                            // 视频预览
                            if (node.previewWidget.videoEl) {
                                node.previewWidget.imgEl.style.display = "none";
                                node.previewWidget.videoEl.src = localUrl;
                                node.previewWidget.videoEl.play().catch(e => {
                                    console.log("视频自动播放失败:", e);
                                });
                            }
                        } else {
                            // 图像预览
                            if (node.previewWidget.imgEl) {
                                node.previewWidget.videoEl.style.display = "none";
                                node.previewWidget.imgEl.src = localUrl;
                            }
                        }
                    }
                    
                    // 获取尺寸
                    if (isVideo) {
                        const tempVideo = document.createElement("video");
                        tempVideo.onloadedmetadata = () => {
                            node.imageWidth = tempVideo.videoWidth;
                            node.imageHeight = tempVideo.videoHeight;
                            if (node.imageSizeWidget) {
                                node.imageSizeWidget.value = `${tempVideo.videoWidth} x ${tempVideo.videoHeight}`;
                            }
                            app.graph.setDirtyCanvas(true, true);
                        };
                        tempVideo.src = localUrl;
                    } else {
                        const tempImg = new window.Image();
                        tempImg.onload = () => {
                            node.imageWidth = tempImg.naturalWidth;
                            node.imageHeight = tempImg.naturalHeight;
                            if (node.imageSizeWidget) {
                                node.imageSizeWidget.value = `${tempImg.naturalWidth} x ${tempImg.naturalHeight}`;
                            }
                            app.graph.setDirtyCanvas(true, true);
                        };
                        tempImg.src = localUrl;
                    }
                    
                    // 上传文件到ComfyUI
                    const formData = new FormData();
                    formData.append("image", file, file.name);
                    formData.append("subfolder", "media_uploads");
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
                    
                    // 更新image_path小部件
                    if (node.imagePathWidget) {
                        node.imagePathWidget.value = uploadedPath;
                    }
                    
                    // 更新名称显示
                    node.currentImageName = file.name;
                    if (node.imageNameWidget) {
                        node.imageNameWidget.value = file.name;
                    }
                    
                    // 保存上传路径
                    node.uploadedImagePath = uploadedPath;
                    node.isVideoMedia = isVideo;
                    
                    // 标记图形需要更新
                    app.graph.setDirtyCanvas(true, true);
                    
                } catch (error) {
                    console.error("处理媒体文件失败:", error);
                    if (node.imageNameWidget) {
                        node.imageNameWidget.value = "上传失败";
                    }
                    alert("处理媒体文件失败: " + error.message);
                }
            };
            
            // 序列化时包含媒体信息
            const onSerialize = nodeType.prototype.onSerialize;
            nodeType.prototype.onSerialize = function(o) {
                if (onSerialize) {
                    onSerialize.apply(this, arguments);
                }
                o.currentImageName = this.currentImageName || "";
                o.imageWidth = this.imageWidth || 0;
                o.imageHeight = this.imageHeight || 0;
                o.isVideoMedia = this.isVideoMedia || false;
            };
            
            // 反序列化时恢复媒体信息
            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function(o) {
                if (onConfigure) {
                    onConfigure.apply(this, arguments);
                }
                
                const node = this;
                setTimeout(() => {
                    if (o.currentImageName) {
                        node.currentImageName = o.currentImageName;
                        if (node.imageNameWidget) {
                            node.imageNameWidget.value = o.currentImageName;
                        }
                    }
                    if (o.imageWidth && o.imageHeight) {
                        node.imageWidth = o.imageWidth;
                        node.imageHeight = o.imageHeight;
                        if (node.imageSizeWidget) {
                            node.imageSizeWidget.value = `${o.imageWidth} x ${o.imageHeight}`;
                        }
                    }
                    
                    node.isVideoMedia = o.isVideoMedia || false;
                    
                    // 如果有image_path，加载预览
                    const imagePathWidget = node.widgets?.find(w => w.name === "image_path");
                    if (imagePathWidget && imagePathWidget.value && node.previewWidget) {
                        const mediaPath = imagePathWidget.value;
                        // 分离subfolder和filename
                        let subfolder = "";
                        let filename = mediaPath;
                        if (mediaPath.includes("/")) {
                            const parts = mediaPath.split("/");
                            filename = parts.pop();
                            subfolder = parts.join("/");
                        }
                        const mediaUrl = api.apiURL(`/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=input`);
                        
                        // 判断是否为视频
                        const isVideo = node.isVideoMedia || node.isVideoFile(filename);
                        
                        if (isVideo && node.previewWidget.videoEl) {
                            node.previewWidget.imgEl.style.display = "none";
                            node.previewWidget.videoEl.src = mediaUrl;
                        } else if (node.previewWidget.imgEl) {
                            node.previewWidget.videoEl.style.display = "none";
                            node.previewWidget.imgEl.src = mediaUrl;
                        }
                    }
                }, 200);
            };
        }
    }
});
