---
description: "检查官方发布并准备源码更新的 Web 设置页。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-update

[English](README.md) | 中文

## 概述

本包检查官方发布，并在独立目录中准备更新后的源码。

## 目录

- [详细说明](#details)
- [模型体验](#model-experience)
- [已知限制与暂缓事项](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

<a id="details"></a>

## 详细说明

Web 设置中的更新页会将当前版本与 DeepSeek Harness 官方 GitHub Releases 比较。它注册 `update` 设置页，进入页面或点击「重新检查」时调用生成的 `updateCheck` Remote。检查期间显示不带百分比的进度条。页面展示当前版本、官方最新版本、发布时间和官方发布链接。

发现新版本时，「更新 DeepSeek Harness 源码」调用 `updateCheck/stageSource`。Host 获取发布标签，在当前源码目录旁创建独立 Git worktree，并重放当前分支的定制提交。页面显示新目录或冲突状态。运行中的目录继续使用；用户需要处理冲突、安装依赖、构建并从新目录启动。

<a id="dev-note"></a>

<a id="dev-note"></a>

## 开发备注

本包的运行入口与配置位于同目录的 `src/` 和 `package.json`。

<a id="model-experience"></a>

<a id="model-experience"></a>

## 模型体验

无。本 UI 包不注册模型输入或工具。

#### KV Cache 影响

无。

<a id="known-limitations-and-deferred-work"></a>

## 已知限制与暂缓事项

- 源码更新要求 DeepSeek Harness 仓库中的具名 Git 分支，且工作区干净。它不能更新已打包的桌面安装或有未提交修改的工作区。
- 更新页不会自动安装依赖、构建、启动或切换到准备好的目录。
- 页面挂载或用户主动点击时才检查更新；没有后台轮询。

不发布运行时不变量伴随插件，因为页面展示 Host 更新结果，不保存独立的升级状态。
