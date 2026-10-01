# @deepseek-ai/dsh-error-digest

[English](README.md) | 中文

找错辅助：监控每个标记为错误的 `tool/result` 会话事件，保留最近失败的有限摘要（默认 10 条），并注册一个 `error-digest` 系统提示词段，在输出被截断时列出这些错误并附上"先读取报告的 spill 文件"指引。该摘要让未解决的错误在压缩轮次（否则会被总结或剪掉）之后仍然对模型可见。

提示词段在首次出错前渲染为空，因此健康会话不产生 token 开销。`maxDigestSize`（默认 10）限制保留条数；每条错误被压缩为最多 200 字符的单行。

## 模型体验

### 最近的工具错误

#### 模型可见内容

工具出错后，系统提示词会加入以下稳定指引，并为每个保留错误加入一行压缩信息。

##### 提示词模板

```markdown
## Recent Errors
The following tool errors occurred in this session. If output was truncated,
read the spill file path reported in the truncated result before proceeding.

<numbered error lines>
```

#### Token 影响

发生工具错误之前，该分区为空。最多保留 `maxDigestSize` 条记录（默认 10），每条错误行最多 200 个字符。

#### KV Cache effect

提示内容稳定，但新错误会追加行，有界摘要也可能移除较早的行；这些变化会影响提示词后缀和提供方缓存复用。

## 已知限制与暂缓事项

- **仅内存摘要** —— 错误列表只存在于插件生命周期内，不持久化到会话日志；重载后丢失（底层错误仍在日志中）。
- **单行压缩** —— 长错误正文每条最多保留 200 字符；完整错误仍在原始 `tool/result` 事件中。
