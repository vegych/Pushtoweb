import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Download, 
  RefreshCw, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  PackageCheck
} from 'lucide-react';
import { VersionInfo, checkAppUpdate, CURRENT_VERSION, GITHUB_RELEASES_URL } from '../utils/version';
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

  const fetchUpdate = async () => {
    setLoading(true);
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
              ? `У вас установлена последняя версия v${CURRENT_VERSION}`
              : `You are on the latest version v${CURRENT_VERSION}`,
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
                {lang === 'ru' ? `Текущая версия: v${CURRENT_VERSION}` : `Current version: v${CURRENT_VERSION}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
                <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-sm text-sky-600 dark:text-sky-400">
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        {lang === 'ru'
                          ? `Доступна новая версия v${versionInfo.latestVersion}`
                          : `New version v${versionInfo.latestVersion} available`}
                      </span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500 text-white font-bold">
                      NEW
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {lang === 'ru'
                      ? 'Рекомендуется обновить приложение для получения новых функций и исправлений ошибок.'
                      : 'We recommend updating to get the latest features and bug fixes.'}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                      {lang === 'ru' ? 'У вас установлена последняя версия' : 'You are on the latest version'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      v{CURRENT_VERSION} — {lang === 'ru' ? 'Обновления не требуются' : 'No updates available'}
                    </p>
                  </div>
                </div>
              )}

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
            disabled={loading}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-500' : ''}`} />
            <span>{lang === 'ru' ? 'Проверить снова' : 'Check again'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={versionInfo?.downloadUrl || GITHUB_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-md hover:shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {versionInfo?.hasUpdate
                  ? lang === 'ru'
                    ? 'Скачать APK'
                    : 'Download APK'
                  : lang === 'ru'
                  ? 'Перейти к релизам'
                  : 'GitHub Releases'}
              </span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
