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
  | 'installerDetail'
  | 'updateNow'
  | 'downloadInstaller'
  | 'downloadingInstaller'
  | 'downloadProgress'
  | 'cancelDownload'
  | 'downloadComplete'
  | 'downloadFailed'
  | 'openInstaller'
  | 'openInstallerFailed'
  | 'viewOfficialRelease'
  | 'noInstaller'
  | 'checkFailed'
  | 'checkFailedDetail'
  | 'retry'
  | 'sidebarAction'

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
  installerDetail: '点击更新后会下载并打开官方安装包；安装步骤请按系统提示完成。',
  updateNow: '更新 DeepSeek Harness',
  downloadInstaller: '下载桌面安装包',
  downloadingInstaller: '正在下载桌面安装包',
  downloadProgress: '安装包下载进度',
  cancelDownload: '取消下载',
  downloadComplete: '下载完成，安装包位置：',
  downloadFailed: '下载安装包失败：',
  openInstaller: '打开安装包',
  openInstallerFailed: '无法打开安装包，请从下载文件夹手动打开。',
  viewOfficialRelease: '查看官方发布',
  noInstaller: '该官方发布暂未提供本机桌面安装包；请在官方发布页选择适合的安装方式。',
  checkFailed: '无法检查更新',
  checkFailedDetail: '请确认网络连接后重试，或直接访问官方发布页。',
  retry: '重试',
  sidebarAction: '检查官方更新',
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
  installerDetail: 'Update downloads and opens the official installer; follow the system prompts to finish.',
  updateNow: 'Update DeepSeek Harness',
  downloadInstaller: 'Download desktop installer',
  downloadingInstaller: 'Downloading desktop installer',
  downloadProgress: 'Installer download progress',
  cancelDownload: 'Cancel download',
  downloadComplete: 'Download complete. Installer location:',
  downloadFailed: 'Installer download failed:',
  openInstaller: 'Open installer',
  openInstallerFailed: 'Could not open the installer. Open it from Downloads instead.',
  viewOfficialRelease: 'View official release',
  noInstaller: 'This official release does not provide a desktop installer for this computer. Choose an installation option on the official release page.',
  checkFailed: 'Unable to check for updates',
  checkFailedDetail: 'Check your network connection and retry, or open the official release page directly.',
  retry: 'Retry',
  sidebarAction: 'Check official updates',
}
