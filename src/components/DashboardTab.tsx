import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  MessageSquareText, 
  Bell, 
  ArrowRight, 
  Activity, 
  Clock,
  Power,
  Send,
  Radio,
  Sparkles,
  Smartphone,
  Zap,
  X
} from 'lucide-react';
import { AppFilterRule, ForwardedMessageLog, ForwardingSettings } from '../types';
import { ActiveTab } from './Header';
import { translations, Language } from '../utils/i18n';

interface DashboardTabProps {
  settings: ForwardingSettings;
  rules: AppFilterRule[];
  logs: ForwardedMessageLog[];
  onNavigate: (tab: ActiveTab) => void;
  onUpdateSettings: (newSettings: ForwardingSettings) => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  onQuickTest: () => void;
  isTesting: boolean;
  lang?: Language;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  settings,
  rules,
  logs,
  onNavigate,
  onUpdateSettings,
  onShowToast,
  onQuickTest,
  isTesting,
  lang = 'ru',
}) => {
  const t = translations[lang];
  const isServiceRunning = settings.serviceRunning !== false;
  const isBotConfigured = Boolean(settings.telegramBotToken && settings.telegramChatId);
  const isNativeAndroid = typeof window !== 'undefined' && Boolean(window.AndroidBridge?.isNativeApp?.());

  const [hasNotifPermission, setHasNotifPermission] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.AndroidBridge?.isNotificationAccessGranted) {
      return Boolean(window.AndroidBridge.isNotificationAccessGranted());
    }
    return true;
  });

  const [isBatteryIgnored, setIsBatteryIgnored] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.AndroidBridge?.isBatteryOptimizationIgnored) {
      return Boolean(window.AndroidBridge.isBatteryOptimizationIgnored());
    }
    return true;
  });

  const [isBatteryDismissed, setIsBatteryDismissed] = React.useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('pushtoweb_battery_dismissed') === 'true';
    }
    return false;
  });

  React.useEffect(() => {
    if (isNativeAndroid) {
      const check = () => {
        if (window.AndroidBridge?.isNotificationAccessGranted) {
          setHasNotifPermission(Boolean(window.AndroidBridge.isNotificationAccessGranted()));
        }
        if (window.AndroidBridge?.isBatteryOptimizationIgnored) {
          setIsBatteryIgnored(Boolean(window.AndroidBridge.isBatteryOptimizationIgnored()));
        }
      };
      check();
      window.addEventListener('focus', check);
      const interval = setInterval(check, 3000);
      return () => {
        window.removeEventListener('focus', check);
        clearInterval(interval);
      };
    }
  }, [isNativeAndroid]);

  const handleDismissBatteryPrompt = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pushtoweb_battery_dismissed', 'true');
    }
    setIsBatteryDismissed(true);
  };

  // Master Service switch handler
  const handleToggleService = () => {
    const nextVal = !isServiceRunning;
    const smsVal = nextVal && !settings.forwardSmsEnabled && !settings.forwardPushEnabled ? true : settings.forwardSmsEnabled;
    const pushVal = nextVal && !settings.forwardSmsEnabled && !settings.forwardPushEnabled ? true : settings.forwardPushEnabled;

    onUpdateSettings({ 
      ...settings, 
      serviceRunning: nextVal,
      forwardSmsEnabled: smsVal,
      forwardPushEnabled: pushVal
    });

    if (window.AndroidBridge?.updateServiceStatus) {
      window.AndroidBridge.updateServiceStatus(
        nextVal,
        smsVal,
        pushVal,
        settings.showNotificationWhenStopped ?? false
      );
    } else if (window.AndroidBridge?.toggleService) {
      window.AndroidBridge.toggleService(nextVal);
    }
  };

  // Sub-switches handlers
  const handleToggleSms = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !settings.forwardSmsEnabled;
    onUpdateSettings({ ...settings, forwardSmsEnabled: nextVal });
    if (window.AndroidBridge?.updateServiceStatus) {
      window.AndroidBridge.updateServiceStatus(
        isServiceRunning,
        nextVal,
        settings.forwardPushEnabled,
        settings.showNotificationWhenStopped ?? false
      );
    } else if (window.AndroidBridge?.toggleSms) {
      window.AndroidBridge.toggleSms(nextVal);
    }
  };

  const handleTogglePush = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !settings.forwardPushEnabled;
    onUpdateSettings({ ...settings, forwardPushEnabled: nextVal });
    if (window.AndroidBridge?.updateServiceStatus) {
      window.AndroidBridge.updateServiceStatus(
        isServiceRunning,
        settings.forwardSmsEnabled,
        nextVal,
        settings.showNotificationWhenStopped ?? false
      );
    } else if (window.AndroidBridge?.togglePush) {
      window.AndroidBridge.togglePush(nextVal);
    }
  };

  const handleToggleShowNotifWhenStopped = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !settings.showNotificationWhenStopped;
    onUpdateSettings({ ...settings, showNotificationWhenStopped: nextVal });
    if (window.AndroidBridge?.updateServiceStatus) {
      window.AndroidBridge.updateServiceStatus(
        isServiceRunning,
        settings.forwardSmsEnabled,
        settings.forwardPushEnabled,
        nextVal
      );
    }
  };

  // Dynamic Status Bar Notification Text
  const statusBarText = !isServiceRunning
    ? '⏸️ Сервис на паузе (SMS: Выкл · Push: Выкл)'
    : settings.forwardSmsEnabled && settings.forwardPushEnabled
    ? '🟢 Активен: SMS [ВКЛ] · Push [ВКЛ]'
    : settings.forwardSmsEnabled && !settings.forwardPushEnabled
    ? '🟢 Активен: SMS [ВКЛ] · Push [ВЫКЛ]'
    : !settings.forwardSmsEnabled && settings.forwardPushEnabled
    ? '🟢 Активен: Push [ВКЛ] · SMS [ВЫКЛ]'
    : '⚠️ Сервис включен (SMS и Push выключены)';

  // Stats calculation
  const totalCount = logs.length;
  const forwardedCount = logs.filter((l) => l.status === 'forwarded').length;
  const successRate = totalCount > 0 ? Math.round((forwardedCount / totalCount) * 100) : 100;
  const enabledAppsCount = rules.filter((r) => r.enabled).length;

  // Recent logs (up to 6 for compactness)
  const recentLogs = logs.slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-5 space-y-3.5">
      {/* ⚠️ NOTIFICATION ACCESS WARNING BANNER (If running inside APK without Notification Access) */}
      {isNativeAndroid && !hasNotifPermission && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs space-y-2.5 shadow-md animate-in fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
              <span>Доступ к уведомлениям не предоставлен в Android!</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 shrink-0">
              Внимание
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-300">
            Для перехвата push-уведомлений от банков (Сбер, Т-Банк) и мессенджеров необходимо разрешить <b>«Доступ к уведомлениям»</b> для PushToWeb в настройках Android.
          </p>

          <button
            type="button"
            onClick={() => {
              window.AndroidBridge?.requestNotificationAccess?.();
            }}
            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Разрешить доступ к уведомлениям в настройках Android</span>
          </button>
        </div>
      )}

      {/* ⚡ BATTERY CONSUMPTION & BACKGROUND OPERATION PROMPT (One-time dismissible banner) */}
      {isNativeAndroid && !isBatteryIgnored && !isBatteryDismissed && (
        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-200 text-xs space-y-2.5 shadow-md animate-in fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-sky-400 text-sm">
              <Zap className="w-4 h-4 shrink-0 text-sky-400" />
              <span>{t.batteryUnrestrictedTitle}</span>
            </div>
            <button
              type="button"
              onClick={handleDismissBatteryPrompt}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
              title={t.batteryBtnDismiss}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-300">
            {t.batteryUnrestrictedDesc}
          </p>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={() => {
                window.AndroidBridge?.requestBatteryOptimizationExemption?.();
              }}
              className="px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{t.batteryBtnGrant}</span>
            </button>

            <button
              type="button"
              onClick={handleDismissBatteryPrompt}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              <span>{t.batteryBtnDismiss}</span>
            </button>
          </div>
        </div>
      )}

      {/* 🚀 COMPACT MASTER SERVICE SWITCH BAR */}
      <div
        onClick={handleToggleService}
        className={`p-3.5 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm hover:shadow-md ${
          isServiceRunning
            ? 'dark:bg-gradient-to-r dark:from-emerald-950/40 dark:via-slate-900 dark:to-sky-950/30 bg-gradient-to-r from-emerald-50 via-white to-sky-50/60 dark:border-emerald-500/40 border-emerald-300/80 shadow-emerald-500/5'
            : 'dark:bg-slate-900/90 bg-white dark:border-slate-800 border-slate-200 opacity-90'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform ${
              isServiceRunning
                ? 'dark:bg-emerald-500/20 bg-emerald-100 dark:text-emerald-400 text-emerald-600 dark:border-emerald-500/40 border-emerald-300'
                : 'dark:bg-slate-800 bg-slate-100 dark:text-slate-500 text-slate-400 dark:border-slate-700 border-slate-200'
            }`}
          >
            <Power className={`w-5 h-5 ${isServiceRunning ? 'animate-pulse' : ''}`} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold dark:text-white text-slate-900 text-sm sm:text-base">
                {t.forwardingService}:
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${
                  isServiceRunning
                    ? 'dark:bg-emerald-950/80 bg-emerald-100/80 dark:text-emerald-300 text-emerald-700 dark:border-emerald-600/50 border-emerald-300'
                    : 'dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600 dark:border-slate-700 border-slate-300'
                }`}
              >
                {isServiceRunning ? `🟢 ${t.serviceRunning}` : `⏸️ ${t.serviceStopped}`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] dark:text-slate-400 text-slate-500">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isBotConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{isBotConfigured ? t.botReady : t.botNotConfigured}</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${settings.forwardSmsEnabled ? 'bg-sky-500' : 'bg-slate-400'}`} />
                <span>SMS {settings.forwardSmsEnabled ? t.on : t.off}</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${settings.forwardPushEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <span>Push {settings.forwardPushEnabled ? `${t.on} (${enabledAppsCount})` : t.off}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Controls: Master switch */}
        <div className="flex items-center justify-end shrink-0">
          {/* Master Toggle Switch */}
          <div
            className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-all duration-200 ${
              isServiceRunning ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'dark:bg-slate-700 bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                isServiceRunning ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>

      {/* 2 SUB SWITCHES (SMS & Push) - Compact grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* SMS Switch */}
        <div
          onClick={handleToggleSms}
          className={`p-3 sm:p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 select-none ${
            settings.forwardSmsEnabled && isServiceRunning
              ? 'dark:bg-sky-950/25 bg-sky-50/60 dark:border-sky-500/40 border-sky-300 shadow-sm'
              : 'dark:bg-slate-900/60 bg-white dark:border-slate-800 border-slate-200 opacity-75'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                settings.forwardSmsEnabled && isServiceRunning
                  ? 'dark:bg-sky-500/20 bg-sky-100 dark:text-sky-400 text-sky-600 dark:border-sky-500/30 border-sky-300'
                  : 'dark:bg-slate-800 bg-slate-100 dark:text-slate-500 text-slate-400 dark:border-slate-700 border-slate-200'
              }`}
            >
              <MessageSquareText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold dark:text-white text-slate-900 text-xs sm:text-sm">
                {t.smsForwarding}
              </div>
              <p className="text-[11px] dark:text-slate-400 text-slate-500 truncate">
                {settings.forwardSmsEnabled ? t.smsSubtextOn : t.smsSubtextOff}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <div
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                settings.forwardSmsEnabled ? 'bg-sky-500' : 'dark:bg-slate-700 bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${
                  settings.forwardSmsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Push Notifications Switch */}
        <div
          onClick={handleTogglePush}
          className={`p-3 sm:p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 select-none ${
            settings.forwardPushEnabled && isServiceRunning
              ? 'dark:bg-emerald-950/25 bg-emerald-50/60 dark:border-emerald-500/40 border-emerald-300 shadow-sm'
              : 'dark:bg-slate-900/60 bg-white dark:border-slate-800 border-slate-200 opacity-75'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                settings.forwardPushEnabled && isServiceRunning
                  ? 'dark:bg-emerald-500/20 bg-emerald-100 dark:text-emerald-400 text-emerald-600 dark:border-emerald-500/30 border-emerald-300'
                  : 'dark:bg-slate-800 bg-slate-100 dark:text-slate-500 text-slate-400 dark:border-slate-700 border-slate-200'
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold dark:text-white text-slate-900 text-xs sm:text-sm">
                {t.pushForwarding}
              </div>
              <p className="text-[11px] dark:text-slate-400 text-slate-500 truncate">
                {settings.forwardPushEnabled ? `${t.pushSubtextOn} (${enabledAppsCount} ${t.appsCountSuffix})` : t.pushSubtextOff}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <div
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                settings.forwardPushEnabled ? 'bg-emerald-500' : 'dark:bg-slate-700 bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${
                  settings.forwardPushEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* STATS: 2 Compact Metric Cards in 1 Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Processed Card - Compact */}
        <div className="p-3.5 sm:p-4 rounded-xl dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 border flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wider block">
              {t.processedTotal}
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono dark:text-white text-slate-900 tabular-nums tracking-tight mt-0.5">
              {totalCount}
            </div>
            <div className="text-[11px] dark:text-slate-400 text-slate-500 mt-0.5">
              {lang === 'ru' ? 'Входящих SMS и push' : 'Incoming SMS & push'}
            </div>
          </div>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl dark:bg-sky-500/10 bg-sky-50 dark:border-sky-500/20 border-sky-200 border flex items-center justify-center text-sky-500 shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Delivered to Telegram Card - Compact */}
        <div className="p-3.5 sm:p-4 rounded-xl dark:bg-slate-900 bg-white dark:border-emerald-500/30 border-emerald-300 border dark:bg-emerald-950/10 bg-emerald-50/40 flex items-center justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold dark:text-emerald-400 text-emerald-700 uppercase tracking-wider">
                {t.delivered}
              </span>
              <span className="text-[10px] font-mono font-bold dark:text-emerald-400 text-emerald-700 dark:bg-emerald-950/80 bg-emerald-100 px-1.5 py-0.2 rounded border dark:border-emerald-600/40 border-emerald-300 tabular-nums">
                {successRate}%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono dark:text-emerald-400 text-emerald-600 tabular-nums tracking-tight mt-0.5">
              {forwardedCount}
            </div>
            <div className="text-[11px] dark:text-slate-400 text-slate-500 mt-0.5">
              {lang === 'ru' ? 'Переслано в Telegram' : 'Forwarded to Telegram'}
            </div>
          </div>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl dark:bg-emerald-500/15 bg-emerald-100 dark:border-emerald-500/30 border-emerald-300 border flex items-center justify-center dark:text-emerald-400 text-emerald-600 shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Recent Activity Feed - Compact */}
      <div className="p-3.5 sm:p-4 rounded-xl dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 border space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800 border-slate-200">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-sky-500" />
            <h3 className="font-bold dark:text-white text-slate-900 text-xs sm:text-sm">
              {t.recentActivity}
            </h3>
          </div>
          <button
            onClick={() => onNavigate('logs')}
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{t.viewAllLogs} ({totalCount})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-1.5">
          {recentLogs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={log.id}
                onClick={() => onNavigate('logs')}
                className="p-2.5 rounded-lg dark:bg-slate-950/60 bg-slate-50 dark:border-slate-800/80 border-slate-200 hover:border-sky-400 dark:hover:border-slate-700 transition-all duration-150 flex items-center justify-between gap-3 text-xs cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0">
                    {log.status === 'forwarded' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : log.status === 'blocked' ? (
                      <XCircle className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 dark:text-slate-300 text-slate-700">
                      <span className="font-semibold dark:text-white text-slate-900 truncate group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">
                        {log.appName || (log.type === 'sms' ? 'SMS' : 'Push')}
                      </span>
                      {log.sender && (
                        <>
                          <span className="text-slate-400 dark:text-slate-600">·</span>
                          <span className="dark:text-slate-400 text-slate-500 truncate italic">
                            {log.sender}
                          </span>
                        </>
                      )}
                      {log.otpCode && (
                        <>
                          <span className="text-slate-400 dark:text-slate-600">·</span>
                          <span className="dark:text-emerald-400 text-emerald-600 font-mono font-semibold">
                            OTP: {log.otpCode}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="dark:text-slate-400 text-slate-500 truncate text-[11px]">
                      {log.title ? `${log.title}: ${log.text}` : log.text}
                    </p>
                  </div>
                </div>

                <span className="dark:text-slate-500 text-slate-400 font-mono text-[11px] tabular-nums shrink-0">
                  {timeStr}
                </span>
              </div>
            );
          })}

          {recentLogs.length === 0 && (
            <div className="py-6 text-center dark:text-slate-500 text-slate-400 text-xs">
              {t.noLogsYet}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
