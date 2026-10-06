import React, { useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Power, 
  Bell, 
  Sun, 
  Moon, 
  Laptop, 
  Sparkles, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldAlert,
  BellOff,
  CheckCircle2,
  FileJson,
  Sliders
} from 'lucide-react';
import { ForwardingSettings, AppFilterRule } from '../types';
import { Language, LanguageMode, Theme, ThemeMode, translations } from '../utils/i18n';
import { DEFAULT_SETTINGS, PREDEFINED_APPS } from '../data/predefinedApps';

interface SettingsTabProps {
  settings: ForwardingSettings;
  rules: AppFilterRule[];
  onUpdateSettings: (newSettings: ForwardingSettings) => void;
  onUpdateRules: (newRules: AppFilterRule[]) => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  lang: Language;
  langMode: LanguageMode;
  onSetLangMode: (mode: LanguageMode) => void;
  theme: Theme;
  themeMode: ThemeMode;
  onSetThemeMode: (mode: ThemeMode) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  rules,
  onUpdateSettings,
  onUpdateRules,
  onShowToast,
  lang,
  langMode,
  onSetLangMode,
  theme,
  themeMode,
  onSetThemeMode,
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle handlers with Android Bridge sync
  const handleToggleShowNotifWhenStopped = () => {
    const nextVal = !settings.showNotificationWhenStopped;
    const updated = { ...settings, showNotificationWhenStopped: nextVal };
    onUpdateSettings(updated);

    if (window.AndroidBridge?.updateServiceStatus) {
      window.AndroidBridge.updateServiceStatus(
        settings.serviceRunning !== false,
        settings.forwardSmsEnabled,
        settings.forwardPushEnabled,
        nextVal
      );
    }
  };

  const handleToggleShowStatusBarNotification = () => {
    const nextVal = !settings.showStatusBarNotification;
    const updated = { ...settings, showStatusBarNotification: nextVal };
    onUpdateSettings(updated);

    if (window.AndroidBridge?.updateServiceStatus) {
      window.AndroidBridge.updateServiceStatus(
        settings.serviceRunning !== false,
        settings.forwardSmsEnabled,
        settings.forwardPushEnabled,
        settings.showNotificationWhenStopped ?? false
      );
    }
  };

  // Export Backup JSON
  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings,
      rules,
    };

    const fileName = `pushtoweb_backup_${new Date().toISOString().slice(0, 10)}.json`;
    const jsonString = JSON.stringify(backupData, null, 2);

    // If running inside native Android App, call native Share/Save file dialog
    if (typeof window !== 'undefined' && window.AndroidBridge?.saveBackupJson) {
      window.AndroidBridge.saveBackupJson(jsonString, fileName);
      onShowToast(t.backupSuccess, 'success');
      return;
    }

    // Web browser download fallback
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onShowToast(t.backupSuccess, 'success');
  };

  // Import Backup JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (parsed.settings && typeof parsed.settings === 'object') {
          onUpdateSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
        }
        if (Array.isArray(parsed.rules)) {
          onUpdateRules(parsed.rules);
        }

        onShowToast(t.importSuccess, 'success');
      } catch (err) {
        onShowToast(t.importError, 'error');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  // Reset to Defaults
  const handleResetSettings = () => {
    if (window.confirm(t.resetConfirm)) {
      onUpdateSettings(DEFAULT_SETTINGS);
      onUpdateRules(PREDEFINED_APPS);
      onShowToast(t.resetSuccess, 'success');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-5 space-y-6">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shrink-0">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold dark:text-white text-slate-900 tracking-tight">
              {t.settingsTitle}
            </h1>
            <p className="text-xs dark:text-slate-400 text-slate-500">
              {t.settingsDesc}
            </p>
          </div>
        </div>
      </div>

      {/* 1. Android Background & Notification Settings */}
      <div className="p-4 sm:p-5 rounded-2xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b dark:border-slate-800 border-slate-200 pb-3">
          <Power className="w-4 h-4 text-sky-500" />
          <h2 className="text-sm font-bold dark:text-white text-slate-900">
            {t.backgroundSection}
          </h2>
        </div>

        <div className="space-y-3">
          {/* Toggle 1: Work when disabled / Notification when stopped */}
          <div 
            onClick={handleToggleShowNotifWhenStopped}
            className="p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-950/40 bg-slate-50/70 hover:dark:bg-slate-800/50 hover:bg-slate-100/80 transition-all cursor-pointer flex items-start justify-between gap-3 select-none"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                settings.showNotificationWhenStopped 
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500' 
                  : 'dark:bg-slate-800 bg-slate-200 text-slate-400'
              }`}>
                {settings.showNotificationWhenStopped ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-semibold dark:text-white text-slate-900">
                  {t.showNotifWhenStopped}
                </div>
                <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-0.5 leading-relaxed">
                  {t.showNotifWhenStoppedSubtext}
                </p>
              </div>
            </div>

            <div className="shrink-0 pt-1">
              <div className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                settings.showNotificationWhenStopped ? 'bg-sky-500' : 'dark:bg-slate-700 bg-slate-300'
              }`}>
                <div className={`bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-200 ${
                  settings.showNotificationWhenStopped ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </div>
          </div>

          {/* Toggle 2: Persistent status bar notification while running */}
          <div 
            onClick={handleToggleShowStatusBarNotification}
            className="p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-950/40 bg-slate-50/70 hover:dark:bg-slate-800/50 hover:bg-slate-100/80 transition-all cursor-pointer flex items-start justify-between gap-3 select-none"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                settings.showStatusBarNotification !== false 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' 
                  : 'dark:bg-slate-800 bg-slate-200 text-slate-400'
              }`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-semibold dark:text-white text-slate-900">
                  {t.showStatusBarNotif}
                </div>
                <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-0.5 leading-relaxed">
                  {t.showStatusBarNotifSubtext}
                </p>
              </div>
            </div>

            <div className="shrink-0 pt-1">
              <div className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                settings.showStatusBarNotification !== false ? 'bg-emerald-500' : 'dark:bg-slate-700 bg-slate-300'
              }`}>
                <div className={`bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-200 ${
                  settings.showStatusBarNotification !== false ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Appearance & Language */}
      <div className="p-4 sm:p-5 rounded-2xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b dark:border-slate-800 border-slate-200 pb-3">
          <Sun className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold dark:text-white text-slate-900">
            {t.appearanceSection}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Theme Selector */}
          <div className="p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-950/40 bg-slate-50/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold dark:text-white text-slate-900">
              <span>{t.themeSetting}</span>
              <span className="text-[11px] dark:text-slate-400 text-slate-500 font-normal">
                ({themeMode === 'auto' ? `${t.themeAuto} (${theme === 'dark' ? t.themeDark : t.themeLight})` : themeMode === 'dark' ? t.themeDark : t.themeLight})
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl dark:bg-slate-900 bg-slate-200/80 border dark:border-slate-800 border-slate-300 text-xs">
              <button
                type="button"
                onClick={() => onSetThemeMode('auto')}
                className={`py-2 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  themeMode === 'auto'
                    ? 'dark:bg-slate-800 bg-white dark:text-sky-400 text-sky-600 shadow-sm border dark:border-slate-700 border-slate-300 font-semibold'
                    : 'dark:text-slate-400 text-slate-600 hover:dark:text-white hover:text-slate-900'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>{t.themeAuto}</span>
              </button>

              <button
                type="button"
                onClick={() => onSetThemeMode('light')}
                className={`py-2 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  themeMode === 'light'
                    ? 'dark:bg-slate-800 bg-white dark:text-amber-500 text-amber-600 shadow-sm border dark:border-slate-700 border-slate-300 font-semibold'
                    : 'dark:text-slate-400 text-slate-600 hover:dark:text-white hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>{t.themeLight}</span>
              </button>

              <button
                type="button"
                onClick={() => onSetThemeMode('dark')}
                className={`py-2 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'dark:bg-slate-800 bg-white dark:text-sky-400 text-sky-600 shadow-sm border dark:border-slate-700 border-slate-300 font-semibold'
                    : 'dark:text-slate-400 text-slate-600 hover:dark:text-white hover:text-slate-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.themeDark}</span>
              </button>
            </div>
          </div>

          {/* Language Selector */}
          <div className="p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-950/40 bg-slate-50/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold dark:text-white text-slate-900">
              <span>{t.langSetting}</span>
              <span className="text-[11px] dark:text-slate-400 text-slate-500 font-normal">
                ({langMode === 'auto' ? `${t.langAuto} (${lang.toUpperCase()})` : lang.toUpperCase()})
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl dark:bg-slate-900 bg-slate-200/80 border dark:border-slate-800 border-slate-300 text-xs">
              <button
                type="button"
                onClick={() => onSetLangMode('auto')}
                className={`py-2 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  langMode === 'auto'
                    ? 'dark:bg-slate-800 bg-white dark:text-sky-400 text-sky-600 shadow-sm border dark:border-slate-700 border-slate-300 font-semibold'
                    : 'dark:text-slate-400 text-slate-600 hover:dark:text-white hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.langAuto}</span>
              </button>

              <button
                type="button"
                onClick={() => onSetLangMode('ru')}
                className={`py-2 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  langMode === 'ru'
                    ? 'dark:bg-slate-800 bg-white dark:text-sky-400 text-sky-600 shadow-sm border dark:border-slate-700 border-slate-300 font-semibold'
                    : 'dark:text-slate-400 text-slate-600 hover:dark:text-white hover:text-slate-900'
                }`}
              >
                <span>RU</span>
              </button>

              <button
                type="button"
                onClick={() => onSetLangMode('en')}
                className={`py-2 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  langMode === 'en'
                    ? 'dark:bg-slate-800 bg-white dark:text-sky-400 text-sky-600 shadow-sm border dark:border-slate-700 border-slate-300 font-semibold'
                    : 'dark:text-slate-400 text-slate-600 hover:dark:text-white hover:text-slate-900'
                }`}
              >
                <span>EN</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Backup & Restore & Reset */}
      <div className="p-4 sm:p-5 rounded-2xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b dark:border-slate-800 border-slate-200 pb-3">
          <FileJson className="w-4 h-4 text-emerald-500" />
          <h2 className="text-sm font-bold dark:text-white text-slate-900">
            {t.backupSection}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportBackup}
            className="p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-950/40 bg-slate-50/70 hover:dark:bg-slate-800 hover:bg-slate-100 transition-all text-left flex flex-col justify-between gap-3 cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shrink-0">
                <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-semibold dark:text-white text-slate-900">
                {t.exportBackup}
              </span>
            </div>
            <p className="text-[11px] dark:text-slate-400 text-slate-500 leading-relaxed">
              {t.exportBackupSubtext}
            </p>
          </button>

          {/* Import JSON */}
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-950/40 bg-slate-50/70 hover:dark:bg-slate-800 hover:bg-slate-100 transition-all text-left flex flex-col justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-xs font-semibold dark:text-white text-slate-900">
                  {t.importBackup}
                </span>
              </div>
              <p className="text-[11px] dark:text-slate-400 text-slate-500 leading-relaxed">
                {t.importBackupSubtext}
              </p>
            </button>
          </div>

          {/* Reset Settings */}
          <button
            type="button"
            onClick={handleResetSettings}
            className="p-3.5 rounded-xl border dark:border-red-900/40 border-red-200 dark:bg-red-950/10 bg-red-50/50 hover:dark:bg-red-950/30 hover:bg-red-100/60 transition-all text-left flex flex-col justify-between gap-3 cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                <RotateCcw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" />
              </div>
              <span className="text-xs font-semibold dark:text-red-300 text-red-700">
                {t.resetSettings}
              </span>
            </div>
            <p className="text-[11px] dark:text-red-400/80 text-red-600/80 leading-relaxed">
              {t.resetSettingsSubtext}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
