# @deepseek-ai/dsh-client-ui-skin-center

[English](README.md) | 中文

皮肤中心插件：设置里的一个独立页面（`skin-center`，排序 30），承载两项外观能力——自定义动图背景与玻璃面板效果。玻璃卡片调节 `--dsw-glass-opacity` / `--dsw-glass-blur`（20–100 %、0–40 px），作用于 [ui-layout](../ui-layout/README.md) 绘制的全部三栏；滑块拖动实时预览，松手才落一次持久化。背景卡片把选中的图片（gif/png/jpeg/webp/avif，≤ 20 MiB）经 `/skin-center` RPC 通道上传，Host 存入 `<harness home>/skin-center/backgrounds/`（随机不可猜的 ref 命名）并在 `/skin-center-image/<ref>` 供图；浏览器把它画成 body 固定层（`body[data-dsh-skin-bg]::before`），蒙版浓度、模糊、铺满/完整显示可调；背景启用时 ui-layout 的网格渐变自动让位。

全部偏好存在同一个持久设置命名空间（`ui-skin-center`），经 Host 用户设置文档（harness home 下的 `settings.yaml`）持久化，沿用 ui-theme 的持久化模式：回环浏览器通过设置作用域读写、按命名空间版本串行化写入；远程浏览器保持进程内（设置 API 仅回环可用）。默认值与 ui-layout 的 CSS 回退一致，设置加载前后渲染不跳变。

上传安全：RPC 通道走 Connection 的 `trusted-host` 信任级别——Host 侧的 Origin/Host 围栏在进入处理器之前拒绝 DNS 重绑定与跨站请求。存储 ref 由服务端铸造（`<22 位 base64url id><扩展名>`），绝不来自用户输入，因此 ref 无法编码路径；读取再次把解析路径围栏在存储目录内并复检大小上限。供图路由只应答 GET；ref 是能力令牌，暴露的只有上传者放入的那张图。

## 模型体验

无。插件管理浏览器外观，不触及任何模型请求。

#### KV Cache 影响

无；本包不组装也不发送供应商请求。

## 已知限制与后续工作

- **远程浏览器无法持久化或上传**——设置 RPC 仅回环可用，上传走同一条受信通道；远程浏览器只保留进程内视图。
- **存储的图片可能比设置残留更久**——移除背景会删除存储文件，但卸载插件会留下 `<harness home>/skin-center/backgrounds/` 残留；没有插件时该目录无任何作用。
- **上传采用 JSON 内 base64**——按 20 MiB 图片经回环桥的规模设计；更大的图片需要流式路由。
