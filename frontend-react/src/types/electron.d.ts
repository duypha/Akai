// Electron API type declarations
interface ElectronAPI {
  platform: string;
  isElectron: boolean;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  snapToRight: () => void;
  refreshSession: () => void;
  createShortcut: () => void;
  getScreenSources: () => Promise<ScreenSource[]>;
  onNotification: (callback: (data: NotificationData) => void) => void;
  removeNotificationListener: () => void;
}

interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

interface NotificationData {
  title: string;
  body: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
