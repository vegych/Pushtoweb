import React from 'react';
import { Menu, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { ForwardingSettings } from '../types';
import { Language, translations } from '../utils/i18n';
import { getInstalledVersion } from '../utils/version';

export type ActiveTab = 'dashboard' | 'filters' | 'telegram' | 'templates' | 'logs' | 'settings';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenMenu: () => void;
  isConfigured: boolean;
  settings: ForwardingSettings;
  lang: Language;
  onOpenUpdateModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenMenu,
  isConfigured,
  settings,
  lang,
  onOpenUpdateModal,
}) => {
  const t = translations[lang];

  const TAB_TITLES: Record<ActiveTab, string> = {
    dashboard: t.tabDashboard,
    filters: t.tabFilters,
    telegram: t.tabTelegram,
    templates: t.tabTemplates,
    logs: t.tabLogs,
    settings: t.tabSettings,
  };

  return (
    <header className="border-b dark:border-slate-800 border-slate-200 dark:bg-slate-950/90 bg-white/90 backdrop-blur-md sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Left: Menu toggle + Brand title */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={onOpenMenu}
            className="p-2 rounded-xl dark:bg-slate-900 bg-slate-100 hover:dark:bg-slate-800 hover:bg-slate-200 border dark:border-slate-800 border-slate-200 dark:text-slate-200 text-slate-700 hover:dark:text-white hover:text-slate-900 transition-colors flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            title={t.menu}
          >
            <Menu className="w-5 h-5 text-sky-500" />
            <span className="hidden sm:inline text-xs font-semibold">{t.menu}</span>
          </button>

          <button
            onClick={() => onTabChange('dashboard')}
            className="text-left font-bold text-base sm:text-lg tracking-tight dark:text-white text-slate-900 hover:text-sky-500 dark:hover:text-sky-400 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-sky-500">Push</span><span>ToWeb</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs dark:text-slate-400 text-slate-500 pl-2.5 border-l dark:border-slate-800 border-slate-200">
            <span className="dark:text-slate-300 text-slate-700 font-medium truncate max-w-[200px]">
              {TAB_TITLES[activeTab] || t.tabDashboard}
            </span>
          </div>
        </div>

        {/* Right: Clean status indicator + Version / Update check */}
        <div className="flex items-center gap-2.5 sm:gap-3 text-xs">
          {onOpenUpdateModal && (
            <button
              onClick={onOpenUpdateModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 hover:border-sky-500/50 dark:hover:border-sky-500/50 text-slate-700 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 font-semibold text-[11px] sm:text-xs transition-all cursor-pointer active:scale-95 shadow-sm"
              title={lang === 'ru' ? 'Проверить обновления PushToWeb' : 'Check for updates'}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>v{getInstalledVersion()}</span>
            </button>
          )}

          {isConfigured ? (
            <span className="flex items-center gap-1.5 dark:text-emerald-400 text-emerald-600 font-medium text-[11px] sm:text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{t.connected}</span>
              <span className="sm:hidden">Telegram</span>
            </span>
          ) : (
            <button
              onClick={() => onTabChange('telegram')}
              className="flex items-center gap-1.5 dark:text-amber-400 text-amber-600 hover:underline cursor-pointer font-medium text-[11px] sm:text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{t.notConfigured}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
