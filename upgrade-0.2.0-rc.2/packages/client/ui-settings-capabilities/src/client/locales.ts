/** Skills, MCP and subagent settings copy. @module */

/** Chinese strings for the managed capability settings pages. */
export const zh = {
  group: '能力扩展',
  skills: '技能', mcp: 'MCP', subagents: '子智能体',
  title: '能力扩展', description: '管理本机技能、MCP 连接和子智能体角色。',
  add: '添加', save: '保存', cancel: '取消', edit: '编辑', remove: '移除',
  enable: '启用', disable: '停用', enabled: '已启用', disabled: '已停用',
  pending: '等待可用', active: '已运行', failed: '启动失败', retry: '重连',
  name: '名称', config: '配置（JSON）', configHint: '只填配置数据；密钥填写凭据引用名称，不要粘贴密钥。',
  example: '查看配置示例', saving: '保存中…', invalidJson: '配置必须是有效的 JSON。',
  objectRequired: '配置必须是 JSON 对象。',
  exampleSkill: '{\n  \"directory\": \"/absolute/path/to/skills\"\n}',
  exampleMcp: '{\n  \"transport\": \"stdio\",\n  \"command\": \"npx\",\n  \"args\": [\"-y\", \"@modelcontextprotocol/server-filesystem\", \"/workspace\"],\n  \"cwd\": \"/workspace\",\n  \"toolCallTimeoutMs\": 60000\n}',
  exampleSubagent: '{\n  \"provider\": \"spawn\",\n  \"agentOptions\": { \"provider\": \"deepseek-official\", \"model\": \"deepseek-v4-flash\", \"maxTokens\": 4096 },\n  \"toolFilter\": { \"allow\": [\"read_file\"], \"deny\": [] },\n  \"maxDepth\": 1\n}',
  skillHelp: '添加本地技能目录。停用只会取消注册，不会删除原始文件。',
  mcpHelp: '支持 stdio 和 Streamable HTTP。启用 stdio 配置会在 Host 上启动命令，执行权限属于本机用户，不会自动继承会话文件沙箱。',
  subagentHelp: '子智能体使用已注册的 provider。外部 provider 可能不继承本地沙箱限制。',
  empty: '尚未管理此类能力。', loading: '正在读取…', error: '操作失败，请检查配置后重试。',
  restart: '保存后，本机 Host 会尝试启用此能力。',
} satisfies Record<string, string>
/** Keys shared by the Chinese and English capability dictionaries. */
export type CapabilitiesLocaleKey = keyof typeof zh
/** English strings for the managed capability settings pages. */
export const en = {
  group: 'Capabilities',
  skills: 'Skills', mcp: 'MCP', subagents: 'Subagents',
  title: 'Capabilities', description: 'Manage local skills, MCP connections and subagent roles.',
  add: 'Add', save: 'Save', cancel: 'Cancel', edit: 'Edit', remove: 'Remove',
  enable: 'Enable', disable: 'Disable', enabled: 'Enabled', disabled: 'Disabled',
  pending: 'Waiting for provider', active: 'Running', failed: 'Activation failed', retry: 'Reconnect',
  name: 'Name', config: 'Configuration (JSON)', configHint: 'Enter configuration only. Use credential reference names for secrets; never paste secret values.',
  example: 'Show configuration example', saving: 'Saving…', invalidJson: 'Configuration must be valid JSON.',
  objectRequired: 'Configuration must be a JSON object.',
  exampleSkill: '{\n  \"directory\": \"/absolute/path/to/skills\"\n}',
  exampleMcp: '{\n  \"transport\": \"stdio\",\n  \"command\": \"npx\",\n  \"args\": [\"-y\", \"@modelcontextprotocol/server-filesystem\", \"/workspace\"],\n  \"cwd\": \"/workspace\",\n  \"toolCallTimeoutMs\": 60000\n}',
  exampleSubagent: '{\n  \"provider\": \"spawn\",\n  \"agentOptions\": { \"provider\": \"deepseek-official\", \"model\": \"deepseek-v4-flash\", \"maxTokens\": 4096 },\n  \"toolFilter\": { \"allow\": [\"read_file\"], \"deny\": [] },\n  \"maxDepth\": 1\n}',
  skillHelp: 'Add a local skills directory. Disabling unregisters it without deleting its source files.',
  mcpHelp: 'stdio and Streamable HTTP are supported. Enabling stdio starts a command on the Host with the local user’s permissions; it does not inherit the session file sandbox automatically.',
  subagentHelp: 'Subagents use a registered provider. An external provider may not inherit local sandbox restrictions.',
  empty: 'No managed capabilities of this kind yet.', loading: 'Loading…', error: 'Operation failed. Check the configuration and retry.',
  restart: 'The local Host attempts to activate the capability after saving.',
} satisfies Record<CapabilitiesLocaleKey, string>
