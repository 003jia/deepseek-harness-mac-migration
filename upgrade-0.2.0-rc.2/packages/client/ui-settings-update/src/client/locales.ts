/** Update-check settings card locale keys. */

export type UpdateCheckLocaleKey =
  | 'title'
  | 'officialSource'
  | 'checkAgain'
  | 'checking'
  | 'checkingTitle'
  | 'checkingDetail'
  | 'checkProgress'
  | 'current'
  | 'latest'
  | 'publishedAt'
  | 'upToDate'
  | 'upToDateDetail'
  | 'updateAvailable'
  | 'updateDetail'
  | 'viewOfficialRelease'
  | 'checkFailed'
  | 'checkFailedDetail'
  | 'retry'
  | 'sidebarAction'
  | 'updateSource'
  | 'stagingSource'
  | 'sourcePrepared'
  | 'sourceUpToDate'
  | 'sourceConflicts'
  | 'sourceFailed'

/** Chinese translations for official update checks and downloads. */
export const zh: Record<UpdateCheckLocaleKey, string> = {
  title: '检查 DeepSeek Harness 更新',
  officialSource: '更新信息仅来自 DeepSeek Harness 官方发布',
  checkAgain: '重新检查',
  checking: '检查中…',
  checkingTitle: '正在检查官方发布',
  checkingDetail: '正在与当前版本比较，请稍候。',
  checkProgress: '版本检查进度',
  current: '当前版本',
  latest: '官方最新版本',
  publishedAt: '发布时间',
  upToDate: '已是最新版本',
  upToDateDetail: '当前安装版本已与官方最新发布保持一致。',
  updateAvailable: '发现新版本',
  updateDetail: '可在官方发布页查看发行说明与安装方式。',
  viewOfficialRelease: '查看官方发布',
  checkFailed: '无法检查更新',
  checkFailedDetail: '请确认网络连接后重试，或直接访问官方发布页。',
  retry: '重试',
  sidebarAction: '检查官方更新',
  updateSource: '更新 DeepSeek Harness 源码',
  stagingSource: '正在准备新版源码…',
  sourcePrepared: '新版源码已准备好，请在新目录安装依赖并运行构建：',
  sourceUpToDate: '当前源码已是最新版本。',
  sourceConflicts: '新版源码已创建，但定制提交存在冲突，请在此目录解决：',
  sourceFailed: '无法准备源码更新：',
}

/** English translations for official update checks and downloads. */
export const en: Record<UpdateCheckLocaleKey, string> = {
  title: 'Check DeepSeek Harness Updates',
  officialSource: 'Update information comes only from official DeepSeek Harness releases.',
  checkAgain: 'Check again',
  checking: 'Checking…',
  checkingTitle: 'Checking official releases',
  checkingDetail: 'Comparing the current version. Please wait.',
  checkProgress: 'Update check progress',
  current: 'Current version',
  latest: 'Latest official version',
  publishedAt: 'Published',
  upToDate: 'You are up to date',
  upToDateDetail: 'The installed version matches the latest official release.',
  updateAvailable: 'Update available',
  updateDetail: 'Open the official release page for release notes and installation options.',
  viewOfficialRelease: 'View official release',
  checkFailed: 'Unable to check for updates',
  checkFailedDetail: 'Check your network connection and retry, or open the official release page directly.',
  retry: 'Retry',
  sidebarAction: 'Check official updates',
  updateSource: 'Update DeepSeek Harness source',
  stagingSource: 'Preparing updated source…',
  sourcePrepared: 'Updated source is ready. Install dependencies and build in:',
  sourceUpToDate: 'The source checkout is up to date.',
  sourceConflicts: 'The updated checkout needs merge conflict resolution in:',
  sourceFailed: 'Could not prepare the source update:',
}
