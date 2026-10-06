import React, { useState, useEffect, useCallback } from 'react';
import { Header, ActiveTab } from './components/Header';
import { DashboardTab } from './components/DashboardTab';
import { SidebarDrawer } from './components/SidebarDrawer';
import { AppFiltersTab } from './components/AppFiltersTab';
import { TelegramSettingsTab } from './components/TelegramSettingsTab';
import { TemplateEditorTab } from './components/TemplateEditorTab';
import { LogsTab } from './components/LogsTab';
import { AndroidSetupTab } from './components/AndroidSetupTab';
import { AppFilterRule, ForwardedMessageLog, ForwardingSettings } from './types';
import { 
  loadSettings, 
  saveSettings, 
  loadRules, 
  saveRules, 
  loadLogs, 
  saveLogs 
} from './services/storage';
import { sendTelegramMessage } from './services/telegram';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function App() {
  // Default opens to 'dashboard' (Главная со статистикой пересылки)
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [settings, setSettings] = useState<ForwardingSettings>(loadSettings);
  const [rules, setRules] = useState<AppFilterRule[]>(loadRules);
  const [logs, setLogs] = useState<ForwardedMessageLog[]>(loadLogs);
  const [isTesting, setIsTesting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; id: number } | null>(null);

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

  // Sync settings and rules with backend on mount
  useEffect(() => {
    // Initial fetch from backend if running fullstack
    fetch('/api/settings')
      .then((res) => res.json())
      .then((backendSettings) => {
        if (backendSettings && backendSettings.telegramBotToken) {
          setSettings((prev) => ({ ...prev, ...backendSettings }));
        } else {
          // Push local settings to backend
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
          // Push local rules to backend
          fetch('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rules),
          }).catch(() => {});
        }
      })
      .catch(() => {});

    // Initial fetch of logs
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
    showToast('Журнал сообщений успешно очищен', 'success');
  };

  const isConfigured = Boolean(settings.telegramBotToken && settings.telegramChatId);

  // Quick test button in Header / Drawer
  const handleQuickTest = async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      setActiveTab('telegram');
      showToast('Укажите токен бота и Chat ID для отправки теста', 'error');
      return;
    }

    setIsTesting(true);
    try {
      const timeStr = new Date().toLocaleTimeString('ru-RU');
      const opName = settings.sim1OperatorName || 'МТС';
      const testMsg = `🔔 <b>Проверка связи с SMS Forwarder</b>\n\nБот и пересылка настроены успешно!\n\n🔑 Пример 2FA кода: <code>${Math.floor(1000 + Math.random() * 9000)}</code>\n\n<pre>📶 ${opName}  ·  ⏰ ${timeStr}</pre>`;

      const res = await sendTelegramMessage(
        settings.telegramBotToken,
        settings.telegramChatId,
        testMsg,
        false,
        settings.telegramApiEndpoint
      );
      if (res.success) {
        showToast('Тестовое уведомление доставлено в Telegram!', 'success');
      } else {
        showToast(`Ошибка Telegram: ${res.error}`, 'error');
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-sky-500/20 selection:text-sky-300">
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-slate-900 border-emerald-500/50 text-emerald-300 shadow-emerald-950/40'
                : 'bg-slate-900 border-rose-500/50 text-rose-300 shadow-rose-950/40'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="truncate max-w-sm">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-slate-500 hover:text-white transition-colors ml-1 p-0.5 cursor-pointer"
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
      />

      {/* Top Header with Hamburger menu button */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenMenu={() => setIsMenuOpen(true)}
        isConfigured={isConfigured}
        onQuickTest={handleQuickTest}
        isTesting={isTesting}
        settings={settings}
      />

      {/* Main Content Body */}
      <main className="flex-1 pb-16">
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
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300"><span className="text-sky-400">Push</span>ToWeb</span>
            <span aria-hidden="true">·</span>
            <span>SMS & Push шлюз в Telegram</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Статистика
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveTab('filters')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Приложения
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveTab('telegram')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Telegram
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveTab('templates')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Шаблоны сообщений
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveTab('setup')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Android
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
