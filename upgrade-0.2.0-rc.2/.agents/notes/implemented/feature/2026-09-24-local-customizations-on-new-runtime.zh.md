# Agent Note: 在当前运行时中迁入本地定制

Status: implemented

[English](2026-09-24-local-customizations-on-new-runtime.md) | 中文

## Problem

旧工作台基于当前 Harness 已移除的 API 加入本地记忆、能力管理设置和皮肤中心。直接复制这些包会使设置写入、浏览器通信和图片上传无法运行。

## Decision

记忆和能力管理使用 Host 的实时插件配置字段及生成的 Remote。记忆提供方在自身存储域保存事实，并记录提取请求与结果。能力管理器在自身插件配置项中保存条目列表，并启用已开启的提供方。浏览器页面使用当前的 Client store 和 Settings 插槽。

皮肤偏好通过共享 ConfigForm 写入 Host 的 `skin-center` 配置项。图片上传与移除使用受认证的 Connection Fetch 路由；上传路由以流式方式接收最多 20 MiB 的图片，在 Harness home 下保存随机引用。独立的 GET 路由只按经过验证的引用提供 CSS 背景。浏览器将玻璃效果变量应用到当前布局样式。

## Alternatives considered

**保留旧设置作用域和 RPC 通道。** 当前运行时不再提供这些 API，无法得到可运行的迁移结果。

**把图片存进浏览器。** 这样会使图片不能跨浏览器配置文件使用，并改变删除规则。

**将 MCP 命令作为包安装。** 能力条目只配置已有提供方，编辑表单不会附带安装包操作。

## Consequences

记忆提取可能调用所选模型并消耗对应账户额度。受管理的 MCP stdio 进程使用 Host 用户权限。如果卸载皮肤中心前没有移除背景，图片会留在磁盘上。编辑能力后，现有会话不保证重建可用工具列表。

## Testing

组装后的 Web 设置场景覆盖记忆偏好和事实持久化、能力保存与移除，以及皮肤中心图片上传、供图、移除和玻璃偏好持久化。Host、Client 编译和完整构建通过。
