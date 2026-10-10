import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Download, 
  RefreshCw, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  PackageCheck,
  Check,
  AlertTriangle
} from 'lucide-react';
import { VersionInfo, checkAppUpdate, getInstalledVersion, GITHUB_RELEASES_URL, getReleaseType, getReleaseTypeBadge } from '../utils/version';
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
      if (onShowToast) {
        if (info.hasUpdate) {
          onShowToast(
            lang === 'ru'
              ? `Найдено обновление v${info.latestVersion}!`
              : `New update v${info.latestVersion} available!`,
            'success'
          );
        } else {
          onShowToast(
            lang === 'ru'
              ? `У вас установлена последняя версия v${getInstalledVersion()}`
              : `You are on the latest version v${getInstalledVersion()}`,
            'success'
          );
        }
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

  const handleStartInAppUpdate = () => {
    const apkUrl = versionInfo?.apkDownloadUrl || versionInfo?.downloadUrl;
    if (!apkUrl) {
      if (onShowToast) onShowToast(lang === 'ru' ? 'Ссылка на APK не найдена' : 'APK URL not found', 'error');
      return;
    }

    if (isNative && window.AndroidBridge?.downloadAndInstallApk) {
      setIsDownloading(true);
      setDownloadPercent(0);
      setDownloadBytes(0);
      setDownloadError(null);
      setInstallStarted(false);
      setDownloadStatus(lang === 'ru' ? 'Подключение к GitHub...' : 'Connecting to GitHub...');

      const fileName = versionInfo?.apkFileName || `PushToWeb-v${versionInfo?.latestVersion || 'latest'}.apk`;
      window.AndroidBridge.downloadAndInstallApk(apkUrl, fileName);
    } else {
      // Browser fallback (Web browser download directly)
      const link = document.createElement('a');
      link.href = apkUrl;
      link.download = versionInfo?.apkFileName || 'PushToWeb.apk';
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

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = versionInfo?.downloadUrl || GITHUB_RELEASES_URL;
    if (typeof window !== 'undefined' && window.AndroidBridge?.openExternalUrl) {
      window.AndroidBridge.openExternalUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUpdate();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {lang === 'ru' ? 'Обновления PushToWeb' : 'PushToWeb Updates'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ru' ? `Текущая версия: v${getInstalledVersion()}` : `Current version: v${getInstalledVersion()}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isDownloading) {
                handleCancelDownload();
              }
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-8 text-center space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto text-sky-500 animate-spin" />
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                {lang === 'ru' ? 'Проверка последних релизов на GitHub...' : 'Checking GitHub for new releases...'}
              </p>
            </div>
          ) : versionInfo ? (
            <>
              {versionInfo.hasUpdate ? (
                (() => {
                  const relType = getReleaseType(versionInfo.currentVersion, versionInfo.latestVersion);
                  const badge = getReleaseTypeBadge(relType, lang);
                  return (
                    <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 font-semibold text-sm text-sky-600 dark:text-sky-400">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>
                            {lang === 'ru'
                              ? `Доступна новая версия v${versionInfo.latestVersion}`
                              : `New version v${versionInfo.latestVersion} available`}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.bgClass}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {relType === 'feature'
                          ? (lang === 'ru' ? 'Крупный релиз с новыми функциями и возможностями.' : 'Feature update with new capabilities.')
                          : relType === 'major'
                          ? (lang === 'ru' ? 'Глобальное обновление архитектуры приложения.' : 'Major release.')
                          : (lang === 'ru' ? 'Патч с исправлением ошибок и точечными улучшениями.' : 'Patch with bugfixes.')}
                      </p>
                    </div>
                  );
                })()
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                      {lang === 'ru' ? 'У вас установлена последняя версия' : 'You are on the latest version'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      v{getInstalledVersion()} — {lang === 'ru' ? 'Обновления не требуются' : 'No updates available'}
                    </p>
                  </div>
                </div>
              )}

              {/* In-app download progress panel (Clean progress line style like 3x manager) */}
              {isDownloading && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                      <span>{lang === 'ru' ? 'Скачивание обновления...' : 'Downloading update...'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelDownload}
                      className="text-slate-400 hover:text-red-400 text-xs transition-colors cursor-pointer"
                    >
                      {lang === 'ru' ? 'Отмена' : 'Cancel'}
                    </button>
                  </div>

                  {/* Clean progress bar line */}
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden relative">
                    <div 
                      className="h-full bg-sky-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(5, downloadPercent))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Install started banner */}
              {installStarted && !isDownloading && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {lang === 'ru'
                      ? 'Установщик запущен. После обновления временный файл APK очищается автоматически.'
                      : 'Installer launched. Downloaded APK will be deleted automatically.'}
                  </span>
                </div>
              )}

              {/* Download error banner */}
              {downloadError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{downloadError}</span>
                </div>
              )}

              {/* Versioning Legend Note */}
              <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <span className="font-semibold dark:text-slate-300 text-slate-700 block">
                  {lang === 'ru' ? 'Формат версий:' : 'Versioning Scheme:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
                  <div><code className="text-sky-500 font-bold">X.1.0</code> — {lang === 'ru' ? 'Крупные релизы и новые фичи' : 'Major feature releases'}</div>
                  <div><code className="text-emerald-500 font-bold">X.X.1</code> — {lang === 'ru' ? 'Патчи и исправления ошибок' : 'Bugfixes and patches'}</div>
                </div>
              </div>

              {/* Release Notes */}
              {versionInfo.releaseNotes && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {lang === 'ru' ? 'Список изменений:' : 'Release Notes:'}
                  </label>
                  <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed text-slate-700 dark:text-slate-300">
                    {versionInfo.releaseNotes}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-6 text-center text-sm text-slate-500">
              {lang === 'ru' ? 'Нажмите «Проверить» для получения информации.' : 'Click "Check" to get version status.'}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={fetchUpdate}
            disabled={loading || isDownloading}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-500' : ''}`} />
            <span>{lang === 'ru' ? 'Проверить снова' : 'Check again'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Direct In-App Download Button (no browser redirect) */}
            {versionInfo?.hasUpdate ? (
              <button
                type="button"
                onClick={handleStartInAppUpdate}
                disabled={isDownloading}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-md hover:shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isDownloading
                    ? (lang === 'ru' ? 'Скачивание...' : 'Downloading...')
                    : (lang === 'ru' ? 'Скачать и установить' : 'Download & Install')}
                </span>
              </button>
            ) : null}

            {/* GitHub Releases Link */}
            <button
              type="button"
              onClick={handleOpenExternal}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title={lang === 'ru' ? 'Открыть страницу релизов на GitHub' : 'Open GitHub releases page'}
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
