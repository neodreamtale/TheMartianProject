export interface MartianOptions {
    serverUrl?: string;
    zIndex?: number;
}

/**
 * 开发阶段的测试小妙招（不用频繁发布）
 * 在你们联调期间，你可能随时会改动这个 SDK（比如调整一下阴影大小、改一下字号）。如果每次修改都要去走一遍 npm publish 会非常痛苦。
 * 这时候前端有一个神技叫 npm link：
 * 在你的 sdk 目录下执行：npm link（这相当于把你的 SDK 注册到了你电脑本地的全局大名单里）。
 * 在你们前端同事的 Vue 项目目录下执行：npm link @martian/sdk。
这样，你在 sdk 源码里修改了弹窗样式，执行一下 npm run build，由于本地文件存在软链接映射，前端同事的 Vue 项目里刷新就能立刻看到你改的最新效果！ 等彻底调试满意了，再 npm publish 发正式版，完美！
 */
export class dialog {
    private static serverUrl: string = "http://172.30.52.161:3001";
    private static zIndex: number = 304;

    /**
     * 初始化 Martian SDK
     */
    static init(options: MartianOptions) {
        if (options.serverUrl) {
            this.serverUrl = options.serverUrl.replace(/\/$/, "");
        }
        if (options.zIndex) {
            this.zIndex = options.zIndex;
        }
    }

    /**
     * 弹出错误面板
     */
    static async showError(errorCode: string) {
        try {
            // TODO: 后续可以替换为真实后端的接口地址
            // const response = await fetch(`${this.serverUrl}/api/problem/detail?code=${errorCode}`);
            // const data = await response.json();

            // 为了演示，这里直接模拟数据返回
            const mockData = {
                title: "请求被拦截",
                message: `抱歉，由于业务限制暂时无法处理您的请求（错误码：${errorCode}）。您可能需要先完成相关的验证。`,
                actionName: "去验证"
            };

            this.renderDialog(mockData);
        } catch (error) {
            console.error("[Martian] 获取报错详情失败", error);
        }
    }

    /**
     * 使用纯原生 JS 渲染高颜值弹窗 (Vanilla CSS + DOM API)
     */
    private static renderDialog(data: { title: string; message: string; actionName: string }) {
        // 防止重复弹窗
        if (document.getElementById("martian-dialog-wrapper")) {
            return;
        }

        // 最外层的全屏灰色半透明遮罩
        const wrapper = document.createElement("div");
        wrapper.id = "martian-dialog-wrapper";
        wrapper.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.4);
            display: flex; align-items: center; justify-content: center;
            z-index: ${this.zIndex}; /* 这个后面最高层级做成能配置的吧，可能其他前端代码不控制这个做成屎山了 */
            font-family: system-ui, -apple-system, sans-serif;
            backdrop-filter: blur(4px);
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
        `;

        // 弹窗本体
        const dialog = document.createElement("div");
        dialog.style.cssText = `
            background: #fff;
            width: 320px;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            transform: translateY(20px);
            transition: transform 0.2s ease-in-out;
        `;

        // 标题
        const title = document.createElement("h3");
        title.style.cssText = "margin: 0 0 12px; font-size: 18px; color: #111827;";
        title.innerText = data.title;

        // 内容区
        const message = document.createElement("p");
        message.style.cssText = "margin: 0 0 24px; font-size: 14px; color: #4B5563; line-height: 1.5;";
        message.innerText = data.message;

        // 按钮容器
        const btnContainer = document.createElement("div");
        btnContainer.style.cssText = "display: flex; justify-content: flex-end; gap: 12px;";

        // 关闭按钮
        const closeBtn = document.createElement("button");
        closeBtn.style.cssText = `
            padding: 8px 16px; border: none; border-radius: 6px;
            background: #F3F4F6; color: #374151; font-weight: 500; cursor: pointer;
            transition: background 0.2s;
        `;
        closeBtn.innerText = "关闭";
        closeBtn.onmouseover = () => closeBtn.style.background = "#E5E7EB";
        closeBtn.onmouseout = () => closeBtn.style.background = "#F3F4F6";
        closeBtn.onclick = () => {
            // 离场动画
            wrapper.style.opacity = "0";
            dialog.style.transform = "translateY(20px)";
            setTimeout(() => document.body.removeChild(wrapper), 200);
        };

        // 动作按钮（比如跳去实名认证页）
        const actionBtn = document.createElement("button");
        actionBtn.style.cssText = `
            padding: 8px 16px; border: none; border-radius: 6px;
            background: #2563EB; color: #fff; font-weight: 500; cursor: pointer;
            transition: background 0.2s;
        `;
        actionBtn.innerText = data.actionName;
        actionBtn.onmouseover = () => actionBtn.style.background = "#1D4ED8";
        actionBtn.onmouseout = () => actionBtn.style.background = "#2563EB";
        actionBtn.onclick = () => {
            alert(`业务方配置了新动作：${data.actionName}`);
            closeBtn.click();
        };

        // 拼装所有元素
        btnContainer.appendChild(closeBtn);
        btnContainer.appendChild(actionBtn);
        dialog.appendChild(title);
        dialog.appendChild(message);
        dialog.appendChild(btnContainer);
        wrapper.appendChild(dialog);

        // 挂载到浏览器真实的 Body 上
        document.body.appendChild(wrapper);

        // 触发丝滑的进场动画
        requestAnimationFrame(() => {
            wrapper.style.opacity = "1";
            dialog.style.transform = "translateY(0)";
        });
    }
}

