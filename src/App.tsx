import React, { useState, useEffect, useCallback } from 'react';
import { Header, ActiveTab } from './components/Header';
import { DashboardTab } from './components/DashboardTab';
import { SidebarDrawer } from './components/SidebarDrawer';
import { AppFiltersTab } from './components/AppFiltersTab';
import { TelegramSettingsTab } from './components/TelegramSettingsTab';
import { TemplateEditorTab } from './components/TemplateEditorTab';
import { LogsTab } from './components/LogsTab';
import { AndroidSetupTab } from './components/AndroidSetupTab';
import { SettingsTab } from './components/SettingsTab';
import { AppFilterRule, ForwardedMessageLog, ForwardingSettings } from './types';
import { Language, LanguageMode, Theme, ThemeMode, translations, detectSystemLanguage, detectSystemTheme } from './utils/i18n';
import { 
  loadSettings, 
  saveSettings, 
  loadRules, 
  saveRules, 
  loadLogs, 
  saveLogs 
} from './services/storage';
import { syncDeviceApps } from './utils/appScanner';
import { sendTelegramMessage } from './services/telegram';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [settings, setSettings] = useState<ForwardingSettings>(loadSettings);
  const [rules, setRules] = useState<AppFilterRule[]>(loadRules);
  const [logs, setLogs] = useState<ForwardedMessageLog[]>(loadLogs);
  const [isTesting, setIsTesting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; id: number } | null>(null);

  // Automatic language state with system detection
  const [langMode, setLangMode] = useState<LanguageMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pushtoweb_lang_mode') as LanguageMode | null;
      if (saved === 'auto' || saved === 'ru' || saved === 'en') return saved;
      const legacy = localStorage.getItem('pushtoweb_lang') as LanguageMode | null;
      if (legacy === 'ru' || legacy === 'en') return legacy;
    }
    return 'auto';
  });

  const [systemLang, setSystemLang] = useState<Language>(detectSystemLanguage);
  const lang: Language = langMode === 'auto' ? systemLang : langMode;

  // Listen for system language changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleLangChange = () => {
      setSystemLang(detectSystemLanguage());
    };
    window.addEventListener('languagechange', handleLangChange);
    return () => window.removeEventListener('languagechange', handleLangChange);
  }, []);

  // Automatic theme state with system detection
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pushtoweb_theme_mode') as ThemeMode | null;
      if (saved === 'auto' || saved === 'dark' || saved === 'light') return saved;
      const legacy = localStorage.getItem('pushtoweb_theme') as ThemeMode | null;
      if (legacy === 'dark' || legacy === 'light') return legacy;
    }
    return 'auto';
  });

  const [systemTheme, setSystemTheme] = useState<Theme>(detectSystemTheme);
  const effectiveTheme: Theme = themeMode === 'auto' ? systemTheme : themeMode;

  // Listen for system color scheme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  // Apply dark mode class to document element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (effectiveTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
  }, [effectiveTheme]);

  // Persist language mode
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pushtoweb_lang_mode', langMode);
    }
  }, [langMode]);

  // Persist theme mode
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pushtoweb_theme_mode', themeMode);
    }
  }, [themeMode]);

  const t = translations[lang];

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync settings and rules with backend or Android Native Bridge on mount
  useEffect(() => {
    // 1. Scan installed apps from Android device if running inside native APK
    if (typeof window !== 'undefined' && window.AndroidBridge?.getInstalledApps) {
      setRules((prevRules) => {
        const { updatedRules, addedCount } = syncDeviceApps(prevRules);
        if (addedCount > 0) {
          saveRules(updatedRules);
        }
        return updatedRules;
      });
    }

    // Check if running inside native Android App
    if (typeof window !== 'undefined' && window.AndroidBridge?.getTelegramConfig) {
      try {
        const raw = window.AndroidBridge.getTelegramConfig();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.botToken || parsed.chatId) {
            setSettings((prev) => ({
              ...prev,
              telegramBotToken: parsed.botToken || prev.telegramBotToken,
              telegramChatId: parsed.chatId || prev.telegramChatId,
              telegramApiEndpoint: parsed.apiEndpoint || prev.telegramApiEndpoint,
              customWebhookUrl: parsed.webhookUrl || prev.customWebhookUrl,
            }));
          }
        }
      } catch (e) {
        // ignore
      }
    }

    fetch('/api/settings')
      .then((res) => res.json())
      .then((backendSettings) => {
        if (backendSettings && backendSettings.telegramBotToken) {
          setSettings((prev) => ({ ...prev, ...backendSettings }));
        } else {
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
          }).catch(() => {});
        }
      })
      .catch(() => {});

    fetch('/api/rules')
      .then((res) => res.json())
      .then((backendRules) => {
        if (Array.isArray(backendRules) && backendRules.length > 0) {
          setRules(backendRules);
        } else {
          fetch('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rules),
          }).catch(() => {});
        }
      })
      .catch(() => {});

    fetch('/api/logs')
      .then((res) => res.json())
      .then((backendLogs) => {
        if (Array.isArray(backendLogs) && backendLogs.length > 0) {
          setLogs(backendLogs);
        }
      })
      .catch(() => {});
  }, []);

  // Handlers for state updates
  const handleUpdateSettings = (newSettings: ForwardingSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);

    // Sync directly to Android native config if running inside APK
    if (typeof window !== 'undefined' && window.AndroidBridge?.saveTelegramConfig) {
      try {
        window.AndroidBridge.saveTelegramConfig(
          newSettings.telegramBotToken || '',
          newSettings.telegramChatId || '',
          newSettings.telegramApiEndpoint || '',
          newSettings.customWebhookUrl || ''
        );
      } catch (e) {
        // ignore
      }
    }
  };

  const handleUpdateRules = (newRules: AppFilterRule[]) => {
    setRules(newRules);
    saveRules(newRules);
  };

  const handleRefreshLogs = useCallback(() => {
    fetch('/api/logs')
      .then((res) => res.json())
      .then((backendLogs) => {
        if (Array.isArray(backendLogs)) {
          setLogs(backendLogs);
          saveLogs(backendLogs);
        }
      })
      .catch(() => {});
  }, []);

  const handleClearLogs = () => {
    setLogs([]);
    saveLogs([]);
    fetch('/api/logs/clear', { method: 'POST' }).catch(() => {});
    showToast(lang === 'ru' ? 'Журнал сообщений успешно очищен' : 'Forwarding history log cleared', 'success');
  };

  const isConfigured = Boolean(settings.telegramBotToken && settings.telegramChatId);

  // Quick test button in Header / Drawer
  const handleQuickTest = async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      setActiveTab('telegram');
      showToast(lang === 'ru' ? 'Укажите токен бота и Chat ID для отправки теста' : 'Enter bot token and Chat ID to send test', 'error');
      return;
    }

    setIsTesting(true);
    try {
      const timeStr = new Date().toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US');
      const opName = settings.sim1OperatorName || (lang === 'ru' ? 'МТС' : 'Carrier');
      const testMsg = `🔔 <b>PushToWeb · Test Message</b>\n\nTelegram forwarding connection is working properly!\n\n🔑 2FA Code Sample: <code>${Math.floor(1000 + Math.random() * 9000)}</code>\n\n<pre>📶 ${opName}  ·  ⏰ ${timeStr}</pre>`;

      const res = await sendTelegramMessage(
        settings.telegramBotToken,
        settings.telegramChatId,
        testMsg,
        false,
        settings.telegramApiEndpoint
      );
      if (res.success) {
        showToast(t.testSent, 'success');
      } else {
        const errHint = res.error?.includes('chat not found')
          ? `${res.error} (Сначала нажмите /start в вашем боте в Telegram!)`
          : res.error;
        showToast(`${t.testError}${errHint}`, 'error');
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col dark:bg-slate-950 bg-slate-50 dark:text-slate-100 text-slate-900 font-sans selection:bg-sky-500/20 selection:text-sky-400 transition-colors duration-200">
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium ${
              toast.type === 'success'
                ? 'dark:bg-slate-900 bg-white border-emerald-500/50 text-emerald-600 dark:text-emerald-300 shadow-emerald-500/10'
                : 'dark:bg-slate-900 bg-white border-rose-500/50 text-rose-600 dark:text-rose-300 shadow-rose-500/10'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span className="truncate max-w-sm">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors ml-1 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Left Slide-out Sidebar Drawer Menu */}
      <SidebarDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        settings={settings}
        rules={rules}
        logsCount={logs.length}
        onQuickTest={handleQuickTest}
        isTesting={isTesting}
        onShowToast={showToast}
        lang={lang}
      />

      {/* Top Header with Hamburger menu button & Status indicator */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenMenu={() => setIsMenuOpen(true)}
        isConfigured={isConfigured}
        settings={settings}
        lang={lang}
      />

      {/* Main Content Body */}
      <main className="flex-1 pb-6">
        {activeTab === 'dashboard' && (
          <DashboardTab
            settings={settings}
            rules={rules}
            logs={logs}
            onNavigate={setActiveTab}
            onUpdateSettings={handleUpdateSettings}
            onShowToast={showToast}
            onQuickTest={handleQuickTest}
            isTesting={isTesting}
            lang={lang}
          />
        )}

        {activeTab === 'filters' && (
          <AppFiltersTab
            rules={rules}
            settings={settings}
            onUpdateRules={handleUpdateRules}
            onUpdateSettings={handleUpdateSettings}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'telegram' && (
          <TelegramSettingsTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'templates' && (
          <TemplateEditorTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'logs' && (
          <LogsTab
            logs={logs}
            settings={settings}
            onClearLogs={handleClearLogs}
            onRefreshLogs={handleRefreshLogs}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'setup' && (
          <AndroidSetupTab
            settings={settings}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            rules={rules}
            onUpdateSettings={handleUpdateSettings}
            onUpdateRules={handleUpdateRules}
            onShowToast={showToast}
            lang={lang}
            langMode={langMode}
            onSetLangMode={setLangMode}
            theme={effectiveTheme}
            themeMode={themeMode}
            onSetThemeMode={setThemeMode}
          />
        )}
      </main>
    </div>
  );
}
