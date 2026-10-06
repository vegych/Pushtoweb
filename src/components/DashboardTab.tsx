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
  Smartphone
} from 'lucide-react';
import { AppFilterRule, ForwardedMessageLog, ForwardingSettings } from '../types';
import { ActiveTab } from './Header';

interface DashboardTabProps {
  settings: ForwardingSettings;
  rules: AppFilterRule[];
  logs: ForwardedMessageLog[];
  onNavigate: (tab: ActiveTab) => void;
  onUpdateSettings: (newSettings: ForwardingSettings) => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  onQuickTest: () => void;
  isTesting: boolean;
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
}) => {
  const isServiceRunning = settings.serviceRunning !== false;
  const isBotConfigured = Boolean(settings.telegramBotToken && settings.telegramChatId);
  const isNativeAndroid = typeof window !== 'undefined' && Boolean(window.AndroidBridge?.isNativeApp?.());

  // Master Service switch handler
  const handleToggleService = () => {
    const nextVal = !isServiceRunning;
    onUpdateSettings({ ...settings, serviceRunning: nextVal });
    if (window.AndroidBridge?.updateServiceStatus) {
      window.AndroidBridge.updateServiceStatus(nextVal, settings.forwardSmsEnabled, settings.forwardPushEnabled, true);
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
      window.AndroidBridge.updateServiceStatus(isServiceRunning, nextVal, settings.forwardPushEnabled, true);
    } else if (window.AndroidBridge?.toggleSms) {
      window.AndroidBridge.toggleSms(nextVal);
    }
  };

  const handleTogglePush = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !settings.forwardPushEnabled;
    onUpdateSettings({ ...settings, forwardPushEnabled: nextVal });
    if (window.AndroidBridge?.updateServiceStatus) {
      window.AndroidBridge.updateServiceStatus(isServiceRunning, settings.forwardSmsEnabled, nextVal, true);
    } else if (window.AndroidBridge?.togglePush) {
      window.AndroidBridge.togglePush(nextVal);
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
      {/* 🚀 COMPACT MASTER SERVICE SWITCH BAR */}
      <div
        onClick={handleToggleService}
        className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md ${
          isServiceRunning
            ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-sky-950/30 border-emerald-500/40 shadow-emerald-950/10'
            : 'bg-slate-900/90 border-slate-800 opacity-90'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform ${
              isServiceRunning
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
          >
            <Power className={`w-5 h-5 ${isServiceRunning ? 'animate-pulse' : ''}`} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm sm:text-base">
                Сервис пересылки:
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${
                  isServiceRunning
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isServiceRunning ? '🟢 ЗАПУЩЕН (24/7)' : '⏸️ ОСТАНОВЛЕН'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isBotConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>Бот {isBotConfigured ? 'готов' : 'не настроен'}</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${settings.forwardSmsEnabled ? 'bg-sky-400' : 'bg-slate-600'}`} />
                <span>SMS {settings.forwardSmsEnabled ? 'Вкл' : 'Выкл'}</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${settings.forwardPushEnabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                <span>Push {settings.forwardPushEnabled ? `Вкл (${enabledAppsCount})` : 'Выкл'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Controls: Test button + Master switch */}
        <div className="flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickTest();
            }}
            disabled={isTesting}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Отправить тестовое сообщение в Telegram"
          >
            <Send className="w-3 h-3 text-sky-400" />
            <span>{isTesting ? 'Тест...' : 'Тест связи'}</span>
          </button>

          {/* Master Toggle Switch */}
          <div
            className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-all ${
              isServiceRunning ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
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
          className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
            settings.forwardSmsEnabled && isServiceRunning
              ? 'bg-sky-950/25 border-sky-500/40 shadow-sm'
              : 'bg-slate-900/60 border-slate-800 opacity-75'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                settings.forwardSmsEnabled && isServiceRunning
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              <MessageSquareText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-white text-xs sm:text-sm">Пересылка SMS</div>
              <p className="text-[11px] text-slate-400 truncate">
                {settings.forwardSmsEnabled ? 'SMS и коды 2FA пересылаются' : 'Отключено'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <div
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                settings.forwardSmsEnabled ? 'bg-sky-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                  settings.forwardSmsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Push Notifications Switch */}
        <div
          onClick={handleTogglePush}
          className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
            settings.forwardPushEnabled && isServiceRunning
              ? 'bg-emerald-950/25 border-emerald-500/40 shadow-sm'
              : 'bg-slate-900/60 border-slate-800 opacity-75'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                settings.forwardPushEnabled && isServiceRunning
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-white text-xs sm:text-sm">Пересылка уведомлений</div>
              <p className="text-[11px] text-slate-400 truncate">
                {settings.forwardPushEnabled ? `Активно (${enabledAppsCount} приложений)` : 'Отключено'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <div
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                settings.forwardPushEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                  settings.forwardPushEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 📱 ANDROID STATUS BAR NOTIFICATION (Строка состояния Android) */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
            <span>Уведомление в строке состояния Android:</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded font-mono border bg-slate-950 text-slate-400 border-slate-800">
            {isServiceRunning ? '🟢 Активно в фоне' : '⏸️ Пауза'}
          </span>
        </div>

        {/* Real mockup of Android Status Bar Notification */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isServiceRunning ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              <Bell className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="font-semibold text-white truncate">SMS &amp; Push Forwarder</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400 text-[10px]">шторка Android</span>
              </div>
              <p className={`text-xs font-mono font-medium truncate mt-0.5 ${isServiceRunning ? 'text-emerald-400' : 'text-slate-400'}`}>
                {statusBarText}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
              Строка состояния
            </span>
          </div>
        </div>
      </div>

      {/* STATS: 2 Compact Metric Cards in 1 Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Processed Card - Compact */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Всего обработано
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums tracking-tight mt-0.5">
              {totalCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Входящих SMS и push
            </div>
          </div>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Delivered to Telegram Card - Compact */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-emerald-500/30 bg-emerald-950/10 flex items-center justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                Доставлено
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-600/40 tabular-nums">
                {successRate}%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tabular-nums tracking-tight mt-0.5">
              {forwardedCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Переслано в Telegram
            </div>
          </div>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Recent Activity Feed - Compact */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <h3 className="font-bold text-white text-xs sm:text-sm">
              Последние пересланные сообщения
            </h3>
          </div>
          <button
            onClick={() => onNavigate('logs')}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Все ({totalCount})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-1.5">
          {recentLogs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={log.id}
                onClick={() => onNavigate('logs')}
                className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3 text-xs cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0">
                    {log.status === 'forwarded' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : log.status === 'blocked' ? (
                      <XCircle className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="font-semibold text-white truncate group-hover:text-sky-300 transition-colors">
                        {log.appName || (log.type === 'sms' ? 'SMS' : 'Уведомление')}
                      </span>
                      {log.sender && (
                        <>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400 truncate italic">
                            {log.sender}
                          </span>
                        </>
                      )}
                      {log.otpCode && (
                        <>
                          <span className="text-slate-600">·</span>
                          <span className="text-emerald-400 font-mono font-semibold">
                            Код: {log.otpCode}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-slate-400 truncate text-[11px]">
                      {log.title ? `${log.title}: ${log.text}` : log.text}
                    </p>
                  </div>
                </div>

                <span className="text-slate-500 font-mono text-[11px] tabular-nums shrink-0">
                  {timeStr}
                </span>
              </div>
            );
          })}

          {recentLogs.length === 0 && (
            <div className="py-6 text-center text-slate-500 text-xs">
              Сообщений пока нет. Они будут появляться здесь по мере поступления с устройства.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
