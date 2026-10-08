import React from 'react';
import { 
  X, 
  BarChart3, 
  Sliders, 
  Globe, 
  FileText, 
  ClipboardList, 
  Send, 
  MessageSquareText,
  Copy, 
  Check, 
  Settings as SettingsIcon,
  Sparkles
} from 'lucide-react';
import { ActiveTab } from './Header';
import { ForwardingSettings, AppFilterRule } from '../types';
import { Language, translations } from '../utils/i18n';
import { getInstalledVersion } from '../utils/version';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  settings: ForwardingSettings;
  rules: AppFilterRule[];
  logsCount: number;
  onQuickTest: () => void;
  isTesting: boolean;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  lang: Language;
  onOpenUpdateModal?: () => void;
  hasUpdate?: boolean;
  updateVersion?: string;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  settings,
  rules,
  logsCount,
  onQuickTest,
  isTesting,
  onShowToast,
  lang,
  onOpenUpdateModal,
  hasUpdate,
  updateVersion,
}) => {
  const t = translations[lang];
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/forward?key=${settings.gatewayApiKey}`;

  const enabledAppsCount = rules.filter((r) => r.enabled).length;
  const isBotConfigured = Boolean(settings.telegramBotToken && settings.telegramChatId);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    onShowToast(lang === 'ru' ? 'Webhook URL скопирован в буфер' : 'Webhook URL copied to clipboard', 'success');
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: t.tabDashboard,
      description: lang === 'ru' ? 'Общая сводка, метрики пересылки' : 'Overview & delivery metrics',
      icon: BarChart3,
    },
    {
      id: 'filters',
      label: t.tabFilters,
      description: lang === 'ru' ? 'Выбор приложений и правила' : 'App selection & anti-spam rules',
      icon: Sliders,
      badge: `${enabledAppsCount} / ${rules.length}`,
      badgeColor: 'dark:text-sky-300 text-sky-700 dark:bg-sky-950/80 bg-sky-100 dark:border-sky-800/60 border-sky-300',
    },
    {
      id: 'telegram',
      label: t.tabTelegram,
      description: lang === 'ru' ? 'API чата, токен, Webhook' : 'Chat API, bot token & webhook',
      icon: Globe,
      badge: isBotConfigured ? (lang === 'ru' ? 'Подключен' : 'Connected') : (lang === 'ru' ? 'Не настроен' : 'Not set'),
      badgeColor: isBotConfigured
        ? 'dark:text-emerald-400 text-emerald-700 dark:bg-emerald-950/80 bg-emerald-100 dark:border-emerald-800/60 border-emerald-300'
        : 'dark:text-amber-400 text-amber-700 dark:bg-amber-950/80 bg-amber-100 dark:border-amber-800/60 border-amber-300',
    },
    {
      id: 'templates',
      label: t.tabTemplates,
      description: lang === 'ru' ? 'Формат SMS, пушей и операторов' : 'SMS, push and carrier styles',
      icon: FileText,
    },
    {
      id: 'logs',
      label: t.tabLogs,
      description: lang === 'ru' ? 'История всех SMS и пушей' : 'History of all forwarded events',
      icon: ClipboardList,
      badge: `${logsCount}`,
      badgeColor: 'dark:text-slate-300 text-slate-700 dark:bg-slate-800 bg-slate-200 dark:border-slate-700 border-slate-300',
    },
    {
      id: 'settings',
      label: t.tabSettings,
      description: lang === 'ru' ? 'Параметры фоновой работы Android и бэкап' : 'Android background operation & backup',
      icon: SettingsIcon,
    },
  ];

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer Panel */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] dark:bg-slate-900 bg-white border-r dark:border-slate-800 border-slate-200 shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
              <MessageSquareText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold dark:text-white text-slate-900 text-sm tracking-tight">
                <span className="text-sky-500">Push</span>ToWeb
              </h2>
              <div className="text-[11px] dark:text-slate-400 text-slate-500">
                {lang === 'ru' ? 'Панель управления' : 'Control Panel'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-900 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Закрыть меню"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
          <div className="px-3 py-1 text-[11px] font-semibold dark:text-slate-500 text-slate-400 uppercase tracking-wider">
            {t.sections}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full p-2.5 sm:p-3 rounded-xl text-left transition-all duration-150 flex items-start gap-3 cursor-pointer ${
                  isActive
                    ? 'dark:bg-sky-600/15 bg-sky-50 dark:text-sky-300 text-sky-700 border dark:border-sky-500/40 border-sky-300 shadow-sm'
                    : 'dark:text-slate-300 text-slate-700 hover:dark:text-white hover:text-slate-900 hover:dark:bg-slate-800/60 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    isActive ? 'text-sky-500' : 'dark:text-slate-400 text-slate-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-semibold text-xs truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${
                          item.badgeColor || 'dark:text-slate-400 text-slate-600 dark:bg-slate-800 bg-slate-100'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] dark:text-slate-500 text-slate-400 truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Drawer Footer: Status & Test */}
        <div className="p-4 border-t dark:border-slate-800 border-slate-200 space-y-3 dark:bg-slate-950/40 bg-slate-50 text-xs">
          {/* Quick status summary */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] dark:text-slate-400 text-slate-500">
              <span>{t.forwardingStatus}</span>
              <div className="flex items-center gap-2">
                <span className={settings.forwardSmsEnabled ? 'text-sky-500 font-semibold' : 'text-slate-400'}>
                  SMS {settings.forwardSmsEnabled ? '✓' : '✗'}
                </span>
                <span className={settings.forwardPushEnabled ? 'text-emerald-500 font-semibold' : 'text-slate-400'}>
                  Push {settings.forwardPushEnabled ? '✓' : '✗'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] dark:text-slate-400 text-slate-500">
              <span className="truncate max-w-[170px] font-mono text-[10px]">
                {webhookUrl.split('/api/')[0]}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-sky-500 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                title={t.copyUrl}
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? t.copied : t.copyUrl}</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              onQuickTest();
              onClose();
            }}
            disabled={isTesting}
            className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-sky-600/20 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isTesting ? t.testing : t.quickTest}</span>
          </button>

          {/* App Version display under test button */}
          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <span>{lang === 'ru' ? 'Версия' : 'Version'}:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                v{getInstalledVersion()}
              </span>
            </span>

            {onOpenUpdateModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUpdateModal();
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                  hasUpdate
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 animate-pulse'
                    : 'text-sky-500 hover:text-sky-400 hover:underline'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>
                  {hasUpdate
                    ? (lang === 'ru' ? `Обновить до v${updateVersion}` : `Update to v${updateVersion}`)
                    : (lang === 'ru' ? 'Проверить' : 'Check')}
                </span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
