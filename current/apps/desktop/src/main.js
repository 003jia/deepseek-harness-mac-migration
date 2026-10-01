/**
 * DeepSeek Harness desktop client.
 *
 * The window is a native shell over the harness's own browser surface: the main
 * process boots the repository's `dsh web` server as a child process on an
 * OS-assigned loopback port, parses the URL it prints, and loads it. Nothing is
 * fetched from the network by the shell itself, and the server stays bound to
 * 127.0.0.1 for the lifetime of the window.
 * @module @deepseek-ai/dsh-desktop
 */

import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as electron from 'electron'
import { downloadOfficialInstaller, validateOfficialInstaller } from './update-download.js'

/** This package's root (`apps/desktop`). */
const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)))

/** Repository root that owns the harness CLI and its built frontend dist. */
const REPOSITORY_ROOT = resolve(APP_DIR, '..', '..')

/** The `dsh` CLI source entry, launched exactly as the root `dsh` script does. */
const CLI_ENTRY = resolve(REPOSITORY_ROOT, 'apps', 'cli', 'src', 'bin.ts')

/** Window and product title; matches the client build's `DSH_CLIENT_TITLE`. */
const PRODUCT_TITLE = 'DeepSeek Harness'

/** SGR colour sequences the harness writes into its terminal output. */
const ANSI_PATTERN = /\u001B\[[0-9;]*m/g

/** The line `dsh web` prints once the server is bound. */
const URL_PATTERN = /dsh web:\s*(http:\/\/\S+)/

/**
 * Relaunch the binary as a real Electron process.
 *
 * A shell that exports `ELECTRON_RUN_AS_NODE=1` degrades the Electron binary to
 * plain Node, where `electron.app` does not exist. Re-executing with that
 * variable removed is a no-op in a clean terminal and a self-heal under one.
 */
function relaunchAsElectron() {
  const environment = { ...process.env }
  delete environment.ELECTRON_RUN_AS_NODE
  spawn(process.execPath, [APP_DIR, ...process.argv.slice(2)], {
    env: environment,
    detached: true,
    stdio: 'ignore',
  }).unref()
  process.exit(0)
}

if (process.env.ELECTRON_RUN_AS_NODE !== undefined || electron.app === undefined) relaunchAsElectron()

const { app, BrowserWindow, dialog, ipcMain, shell } = electron

/** The running `dsh web` child process, or undefined before boot / after exit. */
let serverProcess

/** The single application window. */
let mainWindow

/** Loopback origin of the server, used to keep in-app navigation local. */
let serverOrigin

/** Booted server URL, so macOS `activate` can reopen the window without a reboot. */
let serverUrl

/** The one active installer transfer and the last completed installer owned by this window. */
let updateAbortController
let downloadedInstallerPath
let updateTransferState = { status: 'idle' }

/** Restrict updater IPC to the app's own loopback renderer. */
function assertMainWindowSender(event) {
  if (event.sender !== mainWindow?.webContents || new URL(event.sender.getURL()).origin !== serverOrigin) {
    throw new Error('Updater is available only to the DeepSeek Harness desktop window')
  }
}

ipcMain.handle('dsh:update:start', (event, installer) => {
  assertMainWindowSender(event)
  if (updateAbortController !== undefined) throw new Error('An installer download is already in progress')
  validateOfficialInstaller(installer)
  const controller = new AbortController()
  updateAbortController = controller
  downloadedInstallerPath = undefined
  updateTransferState = { status: 'downloading', assetName: installer.name, receivedBytes: 0, totalBytes: null }
  void downloadOfficialInstaller(installer, {
    directory: app.getPath('downloads'),
    signal: controller.signal,
    onProgress: progress => { updateTransferState = { status: 'downloading', assetName: installer.name, ...progress } },
  }).then(
    result => {
      downloadedInstallerPath = result.path
      updateTransferState = { status: 'downloaded', assetName: installer.name, path: result.path }
    },
    error => {
      updateTransferState = controller.signal.aborted
        ? { status: 'idle' }
        : { status: 'failed', assetName: installer.name, message: error instanceof Error ? error.message : String(error) }
    },
  ).finally(() => { updateAbortController = undefined })
  return updateTransferState
})

ipcMain.handle('dsh:update:status', (event) => {
  assertMainWindowSender(event)
  return updateTransferState
})

ipcMain.handle('dsh:update:cancel', (event) => {
  assertMainWindowSender(event)
  updateAbortController?.abort(new Error('Installer download cancelled'))
})

ipcMain.handle('dsh:update:open', async (event) => {
  assertMainWindowSender(event)
  if (updateTransferState.status !== 'downloaded' || downloadedInstallerPath === undefined) {
    throw new Error('No completed installer is available')
  }
  const error = await shell.openPath(downloadedInstallerPath)
  if (error !== '') throw new Error(error)
})

/** Shown while the server boots, before the real UI can load. */
const SPLASH_URL = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html><head><meta charset="utf-8"><title>${PRODUCT_TITLE}</title><style>
  :root { color-scheme: light dark; }
  html, body { height: 100%; margin: 0; }
  body {
    display: grid; place-items: center;
    font: 14px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
    background: #ffffff; color: #3c3c43;
  }
  @media (prefers-color-scheme: dark) { body { background: #0b0f19; color: rgba(235,235,245,.65); } }
  .stack { display: grid; gap: 16px; justify-items: center; }
  .mark {
    width: 42px; height: 42px; border-radius: 13px;
    background: linear-gradient(135deg, #4d6bfe, #2f47d6);
    animation: pulse 1.4s ease-in-out infinite;
  }
  @keyframes pulse { 0%, 100% { opacity: .45; transform: scale(.94); } 50% { opacity: 1; transform: scale(1); } }
</style></head><body><div class="stack"><div class="mark"></div><div>正在启动 ${PRODUCT_TITLE}…</div></div></body></html>`)}`

/**
 * Start the harness web server and resolve once it reports its bound URL.
 * @returns the loopback URL the server is serving.
 */
function startHarnessServer() {
  return new Promise((resolveUrl, rejectUrl) => {
    const nodeBinary = process.env.DSH_DESKTOP_NODE ?? 'node'
    const environment = { ...process.env }
    delete environment.ELECTRON_RUN_AS_NODE

    serverProcess = spawn(
      nodeBinary,
      // `--port 0` lets the OS pick a free port, so a running `dsh web` or a
      // second desktop window can never collide on the default 3080.
      ['--import', 'tsx/esm', CLI_ENTRY, 'web', '--no-open', '--port', '0'],
      { cwd: REPOSITORY_ROOT, env: environment, stdio: ['ignore', 'pipe', 'pipe'] },
    )

    let settled = false
    let transcript = ''

    const settleOnce = (settle) => {
      if (settled) return
      settled = true
      settle()
    }

    const readOutput = (chunk) => {
      transcript += chunk.toString().replace(ANSI_PATTERN, '')
      const match = URL_PATTERN.exec(transcript)
      if (match !== null) settleOnce(() => resolveUrl(match[1]))
    }

    serverProcess.stdout.on('data', readOutput)
    serverProcess.stderr.on('data', readOutput)
    serverProcess.on('error', error => settleOnce(() => rejectUrl(error)))
    serverProcess.on('exit', (code, signal) => settleOnce(() => rejectUrl(new Error(
      `dsh web exited before serving (code ${String(code)}, signal ${String(signal)}):\n${transcript.trim()}`,
    ))))
  })
}

/** Terminate the server child, escalating if it ignores the polite signal. */
function stopHarnessServer() {
  const child = serverProcess
  if (child === undefined || child.exitCode !== null || child.signalCode !== null) return
  serverProcess = undefined
  child.kill('SIGTERM')
  const escalate = setTimeout(() => child.kill('SIGKILL'), 3000)
  escalate.unref?.()
  child.once('exit', () => clearTimeout(escalate))
}

/** Create the application window and put the splash in it. */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 940,
    minHeight: 620,
    title: PRODUCT_TITLE,
    backgroundColor: '#0b0f19',
    show: false,
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: resolve(APP_DIR, 'src', 'preload.cjs'),
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => { mainWindow = undefined })

  // Links to anywhere but the local server belong to the user's browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (serverOrigin !== undefined && url.startsWith(serverOrigin)) return
    event.preventDefault()
    shell.openExternal(url)
  })

  void mainWindow.loadURL(SPLASH_URL)
}

/** Show a boot failure in the window instead of leaving the user at the splash. */
function showBootFailure(error) {
  const detail = error instanceof Error ? error.message : String(error)
  console.error('[dsh-desktop] boot failed:', detail)
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${PRODUCT_TITLE}</title><style>
    :root { color-scheme: light dark; }
    body { margin: 0; padding: 40px; font: 13px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace; }
    h1 { font: 600 16px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0 0 12px; }
    pre { white-space: pre-wrap; word-break: break-word; }
  </style></head><body><h1>${PRODUCT_TITLE} 启动失败</h1><pre>${detail
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`
  void mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  dialog.showErrorBox(`${PRODUCT_TITLE} 启动失败`, detail)
}

// A second launch focuses the window that already owns the server.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow === undefined) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length > 0) return
    createWindow()
    if (serverUrl !== undefined) void mainWindow?.loadURL(serverUrl)
  })
  app.on('will-quit', () => {
    updateAbortController?.abort(new Error('Desktop application is closing'))
    stopHarnessServer()
  })

  void bootstrap()
}

/** Boot the window first, then swap the splash for the served UI. */
async function bootstrap() {
  await app.whenReady()
  createWindow()
  try {
    serverUrl = await startHarnessServer()
    serverOrigin = new URL(serverUrl).origin
    console.log(`[dsh-desktop] serving ${serverUrl}`)
    await mainWindow.loadURL(serverUrl)
  } catch (error) {
    showBootFailure(error)
  }
}
