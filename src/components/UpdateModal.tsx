import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  X, 
  RefreshCw,
  AlertTriangle,
  Check
} from 'lucide-react';
import { VersionInfo, checkAppUpdate, getInstalledVersion, GITHUB_RELEASES_URL } from '../utils/version';
import { Language } from '../utils/i18n';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  lang,
  onShowToast,
}) => {
  const [loading, setLoading] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  // In-app direct download & installation state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState<number>(0);
  const [downloadBytes, setDownloadBytes] = useState<number>(0);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [installStarted, setInstallStarted] = useState(false);

  const isNative = typeof window !== 'undefined' && Boolean(window.AndroidBridge?.downloadAndInstallApk);

  // Attach native callbacks
  useEffect(() => {
    if (typeof window === 'undefined') return;

    (window as any).__onApkDownloadProgress = (percent: number, bytes: number, status: string) => {
      setIsDownloading(true);
      setDownloadPercent(percent);
      setDownloadBytes(bytes);
      if (status) setDownloadStatus(status);
      setDownloadError(null);
    };

    (window as any).__onApkDownloadError = (error: string) => {
      setIsDownloading(false);
      setDownloadError(error);
      if (onShowToast) {
        onShowToast(error || (lang === 'ru' ? 'Ошибка загрузки APK' : 'APK download failed'), 'error');
      }
    };

    (window as any).__onApkInstallStarted = () => {
      setIsDownloading(false);
      setInstallStarted(true);
      if (onShowToast) {
        onShowToast(
          lang === 'ru' ? 'Запуск установщика обновлений Android...' : 'Launching Android package installer...',
          'success'
        );
      }
    };

    return () => {
      delete (window as any).__onApkDownloadProgress;
      delete (window as any).__onApkDownloadError;
      delete (window as any).__onApkInstallStarted;
    };
  }, [lang, onShowToast]);

  const fetchUpdate = async () => {
    setLoading(true);
    setDownloadError(null);
    try {
      const info = await checkAppUpdate();
      setVersionInfo(info);
      if (info.hasUpdate) {
        // Auto-start download when update dialog opens if on native
        handleStartDownloadDirectly(info);
      }
    } catch (e) {
      console.error(e);
      if (onShowToast) {
        onShowToast(lang === 'ru' ? 'Не удалось проверить обновления' : 'Failed to check for updates', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartDownloadDirectly = (info?: VersionInfo | null) => {
    const targetInfo = info || versionInfo;
    const apkUrl = targetInfo?.apkDownloadUrl || targetInfo?.downloadUrl;
    if (!apkUrl) return;

    if (isNative && window.AndroidBridge?.downloadAndInstallApk) {
      setIsDownloading(true);
      setDownloadPercent(0);
      setDownloadBytes(0);
      setDownloadError(null);
      setInstallStarted(false);
      setDownloadStatus(lang === 'ru' ? 'Подключение к серверу...' : 'Connecting to server...');

      const fileName = targetInfo?.apkFileName || `PushToWeb-v${targetInfo?.latestVersion || 'latest'}.apk`;
      window.AndroidBridge.downloadAndInstallApk(apkUrl, fileName);
    } else {
      const link = document.createElement('a');
      link.href = apkUrl;
      link.download = targetInfo?.apkFileName || 'PushToWeb.apk';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCancelDownload = () => {
    if (isNative && window.AndroidBridge?.cancelApkDownload) {
      window.AndroidBridge.cancelApkDownload();
    }
    setIsDownloading(false);
    setDownloadPercent(0);
    setDownloadStatus(lang === 'ru' ? 'Загрузка отменена' : 'Download cancelled');
  };

  useEffect(() => {
    if (isOpen) {
      fetchUpdate();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentVer = getInstalledVersion();
  const latestVer = versionInfo?.latestVersion || currentVer;
  const apkFileName = versionInfo?.apkFileName || `PushToWeb-v${latestVer}.apk`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#21212c] sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden border border-slate-700/50 text-slate-100 p-6 sm:p-7 space-y-6">
        
        {/* Header: Cloud icon + Title + Close Button */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 shrink-0">
              <Cloud className="w-6 h-6 fill-current" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {lang === 'ru' ? 'Доступно обновление!' : 'Update available!'}
            </h2>
          </div>

          <button
            onClick={() => {
              if (isDownloading) handleCancelDownload();
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Version Badges */}
        <div className="flex items-center justify-between text-sm">
          <div className="px-3.5 py-1.5 rounded-xl bg-sky-500/20 text-sky-400 font-medium text-sm inline-flex items-center gap-1">
            <span>{lang === 'ru' ? 'Новая:' : 'New:'}</span>
            <span className="font-bold">v{latestVer}</span>
          </div>

          <div className="text-slate-400 text-sm font-medium">
            <span>{lang === 'ru' ? 'Текущая:' : 'Current:'}</span>{' '}
            <span className="text-slate-300">v{currentVer}</span>
          </div>
        </div>

        {/* Loading Spinner State */}
        {loading && !isDownloading && (
          <div className="py-6 flex items-center justify-center gap-3 text-slate-400 text-sm font-medium">
            <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />
            <span>{lang === 'ru' ? 'Проверка пакета...' : 'Checking package...'}</span>
          </div>
        )}

        {/* Progress & File Download Info */}
        {(isDownloading || !loading) && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-slate-300">
              <span className="truncate pr-2">{`Загрузка ${apkFileName}`}</span>
              <span className="text-sky-400 font-bold shrink-0">
                {isDownloading ? `${downloadPercent}%` : (versionInfo?.hasUpdate ? '100%' : '0%')}
              </span>
            </div>

            {/* Dual Colored Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden flex items-center p-0.5">
              <div 
                className="h-full bg-sky-500 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${isDownloading ? Math.max(3, downloadPercent * 0.25) : 25}%` }}
              />
              <div 
                className="h-full bg-lime-500 rounded-full transition-all duration-300 shadow-sm ml-0.5"
                style={{ width: `${isDownloading ? Math.max(0, downloadPercent * 0.75 - 1) : 75}%` }}
              />
            </div>

            <p className="text-xs text-slate-400 pt-0.5">
              {lang === 'ru'
                ? 'По завершении загрузки сразу откроется окно установки'
                : 'Installation window will open automatically after download'}
            </p>
          </div>
        )}

        {/* Install Started status */}
        {installStarted && !isDownloading && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {lang === 'ru'
                ? 'Установщик запущен. Нажмите Установить в появившемся окне.'
                : 'Installer launched. Confirm installation in system popup.'}
            </span>
          </div>
        )}

        {/* Download Error status */}
        {downloadError && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Bottom Cancel / Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (isDownloading) handleCancelDownload();
              onClose();
            }}
            className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-[#2a2c3a] hover:bg-[#343648] text-slate-200 hover:text-white font-medium text-sm transition-all cursor-pointer shadow-md active:scale-95 text-center"
          >
            {isDownloading
              ? (lang === 'ru' ? 'Отмена' : 'Cancel')
              : (lang === 'ru' ? 'Закрыть' : 'Close')}
          </button>
        </div>

      </div>
    </div>
  );
};
