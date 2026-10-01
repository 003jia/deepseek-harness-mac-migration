/** Extensions marketplace settings tab locale keys. */

export type ExtensionsLocaleKey =
  | 'tab'
  | 'searchPlaceholder'
  | 'search'
  | 'loading'
  | 'error'
  | 'retry'
  | 'empty'
  | 'emptySearch'
  | 'installed'
  | 'install'
  | 'update'
  | 'remove'
  | 'version'
  | 'description'
  | 'noDescription'
  | 'running'
  | 'restartRequired'
  | 'officialSource'
  | 'sourceDescription'

/** Chinese translations for the extension catalog tab. */
export const zh: Record<ExtensionsLocaleKey, string> = {
  tab: '插件市场',
  searchPlaceholder: '搜索扩展包…',
  search: '搜索',
  loading: '正在加载…',
  error: '加载失败',
  retry: '重试',
  empty: '暂无扩展',
  emptySearch: '未找到匹配的扩展',
  installed: '已安装',
  install: '安装',
  update: '更新',
  remove: '移除',
  version: '版本',
  description: '描述',
  noDescription: '暂无描述',
  running: '操作中…',
  restartRequired: '重启后生效',
  officialSource: '打开 DSH 插件发现页',
  sourceDescription: 'GitHub Topic 用于发现社区插件，不代表发布者已获官方认证。npm 搜索结果来自社区。',
}

/** English translations for the extension catalog tab. */
export const en: Record<ExtensionsLocaleKey, string> = {
  tab: 'Plugin catalog',
  searchPlaceholder: 'Search extensions…',
  search: 'Search',
  loading: 'Loading…',
  error: 'Failed to load',
  retry: 'Retry',
  empty: 'No extensions',
  emptySearch: 'No matching extensions',
  installed: 'Installed',
  install: 'Install',
  update: 'Update',
  remove: 'Remove',
  version: 'Version',
  description: 'Description',
  noDescription: 'No description',
  running: 'Working…',
  restartRequired: 'Restart required',
  officialSource: 'Open the DSH plugin discovery page',
  sourceDescription: 'The GitHub Topic is a community discovery list and does not verify publishers. npm results are community packages.',
}
