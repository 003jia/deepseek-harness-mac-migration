const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('dshDesktopUpdater', {
  start(installer) { return ipcRenderer.invoke('dsh:update:start', installer) },
  status() { return ipcRenderer.invoke('dsh:update:status') },
  cancel() { return ipcRenderer.invoke('dsh:update:cancel') },
  open() { return ipcRenderer.invoke('dsh:update:open') },
})
