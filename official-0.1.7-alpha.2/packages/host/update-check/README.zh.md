---
description: "对比官方发布并准备源码的 Host 服务。"
kind: "package-reference"
---

# @deepseek-ai/dsh-host-update-check

[English](README.md) | 中文

## 概述

此 Host 服务对比官方发布，并在当前目录旁准备包含定制提交的新源码。

## 目录

- [详细说明](#details)
- [模型体验](#model-experience)
- [已知限制与暂缓事项](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

<a id="details"></a>

## 详细说明

`UpdateCheckGateway` 将配置的或已安装的版本与官方 `deepseek-ai/deepseek-harness` GitHub Releases 中已发布的语义化版本比较。它忽略草稿和无效标签。`updateCheck/check` 返回最新版本、官方发布链接、发布时间，以及发布时适用于本机平台的桌面安装包资产。发布和资产链接必须位于官方仓库的 GitHub 发布路径下。

配置 `sourceRoot` 后，`updateCheck/stageSource` 会在该源码目录旁准备新版本。它要求干净的具名 Git 分支和 DeepSeek Harness 根包。服务获取官方发布标签，创建相邻 worktree，并将当前分支的定制提交重放到该标签。发生冲突时，新 worktree 保留以供处理；原目录不会被修改。该操作可能耗时，并需要 Git 与网络连接。

服务不会安装依赖、构建、启动或切换到准备好的目录。返回结果包含绝对路径以及重放完成或存在冲突的状态。Typert 生成通过 `./typert` 和 `./remote` 导出的 Host 与 Client Remote 产物。

<a id="dev-note"></a>

## 开发备注

本包的运行入口与配置位于同目录的 `src/` 和 `package.json`。

<a id="model-experience"></a>

<a id="model-experience"></a>

## 模型体验

无。本 Host 服务不注册模型输入或工具。

#### KV Cache 影响

无。

<a id="known-limitations-and-deferred-work"></a>

## 已知限制与暂缓事项

- 源码准备依赖 Git worktree 和已提交的干净定制分支；没有 Git 历史的源码压缩包不能直接更新。
- 准备完成后，安装、构建和切换步骤仍由用户执行。
