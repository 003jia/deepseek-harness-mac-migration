---
description: "定制 Web 构建中的品牌填充。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-custom

[English](README.md) | 中文

## 概述

在非官方客户端构建中显示侧栏和对话区域的定制品牌。

## 目录

- [详细说明](#details)
- [模型体验](#model-experience)
- [已知限制与暂缓事项](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

<a id="details"></a>

## 详细说明

自定义品牌 occupant，用于 Web 客户端的侧边栏和会话 Hero slot。当 `DSH_CLIENT_BUILD_PROFILE` 不是 `official` 时，此插件用自定义名称"嘉言成 harness"填充品牌 slot。

该插件是 `ui-brand-official` 的直接镜像，仅将品牌名称替换为自定义标签。不渲染 logo 或图标。

<a id="dev-note"></a>

<a id="dev-note"></a>

## 开发备注

本包的运行入口与配置位于同目录的 `src/` 和 `package.json`。

<a id="model-experience"></a>

## 模型体验

无，因为这个仅浏览器端的呈现 occupant 不注册任何模型相关内容。

#### KV Cache effect

无；本包从不组装模型输入。

<a id="known-limitations-and-deferred-work"></a>

## 已知限制与暂缓事项

- **无 logo** —— 自定义品牌仅渲染文本，不提供 logo 或图标。
- **静态名称** —— 品牌名称"嘉言成 harness"是硬编码的；未来版本可接受配置值。

不发布运行时不变量伴随插件，因为本插件只渲染静态品牌文本，不保存运行时关系。
