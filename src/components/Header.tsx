import React from 'react';
import { Menu, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ForwardingSettings } from '../types';

export type ActiveTab = 'dashboard' | 'filters' | 'telegram' | 'templates' | 'logs' | 'setup';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenMenu: () => void;
  isConfigured: boolean;
  onQuickTest: () => void;
  isTesting: boolean;
  settings: ForwardingSettings;
}

const TAB_TITLES: Record<ActiveTab, string> = {
  dashboard: 'Главная (Статистика)',
  filters: 'Фильтр приложений',
  telegram: 'Телеграм и шлюз',
  templates: 'Шаблоны сообщений',
  logs: 'Журнал пересылки',
  setup: 'Инструкция Android',
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenMenu,
  isConfigured,
  onQuickTest,
  isTesting,
  settings,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Menu toggle + Brand title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMenu}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
            title="Открыть меню навигации"
          >
            <Menu className="w-5 h-5 text-sky-400" />
            <span className="hidden sm:inline text-xs font-semibold">Меню</span>
          </button>

          <button
            onClick={() => onTabChange('dashboard')}
            className="text-left font-bold text-base sm:text-lg tracking-tight text-white hover:text-sky-400 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
          >
            <span className="text-sky-400">Push</span><span>ToWeb</span>
          </button>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 pl-2 border-l border-slate-800">
            <span className="text-slate-300 font-medium">
              {TAB_TITLES[activeTab] || 'Главная'}
            </span>
          </div>
        </div>

        {/* Zone 2: Bot Connection Status */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-slate-400">
          {isConfigured ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Telegram бот подключен
            </span>
          ) : (
            <button
              onClick={() => onTabChange('telegram')}
              className="flex items-center gap-1.5 text-amber-400 hover:underline cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Настроить Telegram бота
            </button>
          )}
        </div>

        {/* Zone 3: Quick primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onQuickTest}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 disabled:opacity-50 transition-colors whitespace-nowrap shadow-sm shadow-sky-600/20 cursor-pointer"
            title="Отправить тестовое уведомление в Telegram"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isTesting ? 'Отправка...' : 'Тест в Telegram'}
            </span>
            <span className="sm:hidden">Тест</span>
          </button>
        </div>
      </div>
    </header>
  );
};
