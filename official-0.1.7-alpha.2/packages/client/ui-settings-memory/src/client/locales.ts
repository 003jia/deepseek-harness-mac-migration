/** Memory settings dictionaries. @module */
/** Chinese strings for Memory settings and entry management. */
export const zh = {
  title: '记忆', enabled: '启用 Memory', autoExtract: '启用 Memory 自动提取',
  enabledDescription: '在对话中使用已保存的记忆并开启 Memory 提示词。关闭后，自动和手动提取均不生效，但会保留自动提取设置及已保存的记忆。',
  autoDescription: '自动从对话中提取并保存记忆。关闭此项后，仍可使用已有记忆和手动提取记忆。',
  dependency: '依赖「启用 Memory」。', refresh: '刷新', extract: '提取所选会话', sourceSession: '选择会话',
  busy: '处理中…', extracting: '正在提取记忆…', empty: '还没有保存的记忆',
  content: '记忆内容', workspace: '项目路径（留空为用户共享记忆）', save: '保存记忆',
  edit: '编辑', remove: '删除', cancel: '取消编辑', shared: '用户共享',
  automatic: '自动提取', manual: '手动保存', error: '操作失败，请重试',
  storage: '记忆保存在本地；提取使用当前会话配置的模型。',
} satisfies Record<string, string>
/** Memory dictionary key union. */
export type MemoryLocaleKey = keyof typeof zh
/** English strings for Memory settings and entry management. */
export const en = {
  title: 'Memory', enabled: 'Enable Memory', autoExtract: 'Extract memories automatically',
  enabledDescription: 'Use saved memories in conversations and enable Memory context. Turning this off disables automatic and manual extraction while retaining saved memories and the automatic-extraction preference.',
  autoDescription: 'Extract and save memories from conversations automatically. When off, saved memories and manual extraction remain available.',
  dependency: 'Requires Enable Memory.', refresh: 'Refresh', extract: 'Extract selected conversation', sourceSession: 'Conversation',
  busy: 'Working…', extracting: 'Extracting memories…', empty: 'No saved memories yet',
  content: 'Memory content', workspace: 'Project path (empty for shared user memory)', save: 'Save memory',
  edit: 'Edit', remove: 'Delete', cancel: 'Cancel editing', shared: 'Shared user memory',
  automatic: 'Automatic', manual: 'Manual', error: 'Operation failed. Please retry.',
  storage: 'Memories are stored locally. Extraction uses the current conversation’s model.',
} satisfies Record<MemoryLocaleKey, string>
