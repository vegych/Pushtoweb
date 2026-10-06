import React from 'react';
import { 
  X, 
  BarChart3, 
  Sliders, 
  Globe, 
  FileText, 
  ClipboardList, 
  Smartphone, 
  Send, 
  CheckCircle2, 
  AlertTriangle,
  MessageSquareText,
  Bell,
  Copy,
  Check,
  Rocket
} from 'lucide-react';
import { ActiveTab } from './Header';
import { ForwardingSettings, AppFilterRule } from '../types';

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
}) => {
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const webhookUrl = `${window.location.origin}/api/forward?key=${settings.gatewayApiKey}`;

  const enabledAppsCount = rules.filter((r) => r.enabled).length;
  const isBotConfigured = Boolean(settings.telegramBotToken && settings.telegramChatId);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    onShowToast('Webhook URL скопирован в буфер', 'success');
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
      label: 'Главная (Статистика)',
      description: 'Общая сводка, метрики пересылки',
      icon: BarChart3,
    },
    {
      id: 'filters',
      label: 'Фильтр приложений',
      description: 'Выбор приложений и правила',
      icon: Sliders,
      badge: `${enabledAppsCount} из ${rules.length}`,
      badgeColor: 'text-sky-300 bg-sky-950/80 border-sky-800/60',
    },
    {
      id: 'telegram',
      label: 'Телеграм и шлюз',
      description: 'API чата, токен, Webhook',
      icon: Globe,
      badge: isBotConfigured ? 'Подключен' : 'Не настроен',
      badgeColor: isBotConfigured
        ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800/60'
        : 'text-amber-400 bg-amber-950/80 border-amber-800/60',
    },
    {
      id: 'templates',
      label: 'Шаблоны сообщений',
      description: 'Формат SMS, пушей и операторов',
      icon: FileText,
    },
    {
      id: 'logs',
      label: 'Журнал пересылки',
      description: 'История всех SMS и пушей',
      icon: ClipboardList,
      badge: `${logsCount}`,
      badgeColor: 'text-slate-300 bg-slate-800 border-slate-700',
    },
    {
      id: 'setup',
      label: 'Инструкция Android',
      description: 'Подключение MacroDroid / Tasker',
      icon: Smartphone,
    },
  ];

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer Panel */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <MessageSquareText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm tracking-tight">
                <span className="text-sky-400">Push</span>ToWeb
              </h2>
              <div className="text-[11px] text-slate-400">Панель управления</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Закрыть меню"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-xs">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Разделы приложения
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
                className={`w-full p-3 rounded-xl text-left transition-all flex items-start gap-3 cursor-pointer ${
                  isActive
                    ? 'bg-sky-600/15 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    isActive ? 'text-sky-400' : 'text-slate-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-semibold text-xs truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${
                          item.badgeColor || 'text-slate-400 bg-slate-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Drawer Footer: Status & Quick test */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/40 text-xs">
          {/* Quick status summary */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Статус пересылки:</span>
              <div className="flex items-center gap-2">
                <span className={settings.forwardSmsEnabled ? 'text-sky-400' : 'text-slate-600'}>
                  SMS {settings.forwardSmsEnabled ? '✓' : '✗'}
                </span>
                <span className={settings.forwardPushEnabled ? 'text-emerald-400' : 'text-slate-600'}>
                  Push {settings.forwardPushEnabled ? '✓' : '✗'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate max-w-[170px] font-mono text-slate-500">
                {webhookUrl.split('/api/')[0]}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                title="Скопировать URL"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              onQuickTest();
              onClose();
            }}
            disabled={isTesting}
            className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-sky-600/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isTesting ? 'Отправка...' : 'Тест в Telegram'}</span>
          </button>

          <div className="text-[10px] text-center text-slate-600 font-mono pt-1">
            v1.0.0 Stable
          </div>
        </div>
      </aside>
    </>
  );
};
