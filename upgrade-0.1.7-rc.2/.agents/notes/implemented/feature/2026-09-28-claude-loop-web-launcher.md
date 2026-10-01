# Agent Note: Claude loop controls and Web desktop launcher

Status: implemented

English | [中文](2026-09-28-claude-loop-web-launcher.zh.md)

## Problem

The older workbench carried Claude-style turn controls in an extension package, but the current Web composition did not load that package. The old implementation read a deprecated session event array and registered tools through an obsolete API. Starting the Web application from the source checkout also required a terminal command, while this Windows installation is used through a desktop icon.

## Decision

The Web bundle mounts `dsh-claude-loop-alignment` as a guard plugin. A session projection derives tool-step count, output usage, last finish reason, and user-message positions from durable events. The plugin uses the current `agent/pre-step` and `agent/turn-stopping` hooks for turn limits and recovery, and current tool registration for `snip` and `plan_agent`. `snip` replaces a current surface span with a logged user-role placeholder and a preceding token shadow-price event. The planning child is offered only through a provider that enforces tool filtering and depth limits; its allowed tools are the registered read-only inspection tools.

A repository-owned Windows command file launches the shipped Web profile from the source checkout. A desktop shortcut points to that file and uses the existing application icon. The Web runtime opens its authenticated URL in the default browser after startup.

## Alternatives considered

**Patch the agent-loop driver.** The existing pre-step and turn-stopping hooks express these policies without changing the common driver, so a driver fork would enlarge the affected surface.

**Use an Electron binary for this source checkout.** The requested launcher only needs the Web frontend and the repository already provides that runtime. A shortcut to the Web profile avoids a separate desktop package build and signing process.

## Consequences

The Web profile gains a default 20-step tool budget and 60% context-pressure pruning attempt. Headless and SDK profiles remain separately composable. Pressure controls depend on optional model-window and token-meter data; the planner depends on a compatible subagent provider. The source launcher requires installed workspace dependencies and built frontend assets. Keyless assembled-profile snapshots cover the logged stop instruction after one tool step and the model-requested `snip` replacement.
