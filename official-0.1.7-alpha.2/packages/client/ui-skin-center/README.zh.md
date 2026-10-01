---
description: "调整玻璃面板与本地图片背景的 Web 外观设置。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-skin-center

[English](README.md) | 中文

## 概述

本包持久化玻璃效果偏好，并管理 Host 存储的图片背景。

## 目录

- [详细说明](#details)
- [模型体验](#model-experience)
- [已知限制与暂缓事项](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

<a id="details"></a>

## 详细说明

「皮肤中心」设置页可调整三栏的玻璃效果与整个窗口的图片背景。拖动滑块时即时应用玻璃透明度和模糊程度，松开时保存。背景支持不超过 20 MiB 的 gif、png、jpeg、webp 或 avif 文件，并可调整蒙版、模糊和铺满方式。

偏好通过共享设置表单写入 Host 的实时 `skin-center` 插件配置。回环 Web 客户端会将偏好保存到用户设置文档；远程 Web 客户端的设置表单不可用。Host 通过受认证的流式 Connection 路由 `/api/skin-center/uploadBackground` 接收图片，在 harness home 下保存为随机引用，并通过 `/skin-center-image/<ref>` 提供图片。移除背景时通过受认证的路由删除文件。供图路由只接受 GET，并验证引用和存储路径。

<a id="dev-note"></a>

<a id="dev-note"></a>

## 开发备注

本包的运行入口与配置位于同目录的 `src/` 和 `package.json`。

<a id="model-experience"></a>

<a id="model-experience"></a>

## 模型体验

无。外观设置不会进入模型请求。

#### KV Cache 影响

无。

<a id="known-limitations-and-deferred-work"></a>

## 已知限制与暂缓事项

- 如果没有先在设置中移除背景就卸载插件，图片文件会留在磁盘上。
- 远程 Web 客户端不能持久化皮肤偏好；Host 设置表单仅对回环连接开放。
