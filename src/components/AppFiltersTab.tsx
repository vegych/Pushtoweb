import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Sliders, 
  Smartphone,
  Landmark,
  MessageSquare,
  ShoppingBag,
  Truck,
  Building2,
  Trash2,
  Info,
  Check,
  X,
  Upload,
  RefreshCw,
  Bell,
  MessageSquareText,
  ShieldCheck,
  CheckSquare,
  Square,
  Plus
} from 'lucide-react';
import { AppCategory, AppFilterRule, ForwardingSettings } from '../types';
import { FilterEditModal } from './FilterEditModal';
import { syncDeviceApps } from '../utils/appScanner';

interface AppFiltersTabProps {
  rules: AppFilterRule[];
  settings: ForwardingSettings;
  onUpdateRules: (newRules: AppFilterRule[]) => void;
  onUpdateSettings: (newSettings: ForwardingSettings) => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AppFiltersTab: React.FC<AppFiltersTabProps> = ({
  rules,
  settings,
  onUpdateRules,
  onUpdateSettings,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled'>('all');
  const [activeCategory, setActiveCategory] = useState<AppCategory | 'all'>('all');
  const [editingRule, setEditingRule] = useState<AppFilterRule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');

  // Filtered rules by search, status, and category
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      // Status filter
      if (statusFilter === 'enabled' && !rule.enabled) return false;

      // Category filter
      if (activeCategory !== 'all' && rule.category !== activeCategory) return false;

      // Search query
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      return (
        rule.name.toLowerCase().includes(q) ||
        rule.packageName.toLowerCase().includes(q) ||
        rule.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [rules, statusFilter, activeCategory, searchQuery]);

  // Toggle single rule
  const handleToggleRule = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    onUpdateRules(updated);
  };

  // Batch toggle
  const handleSetAll = (enabled: boolean) => {
    // If a search filter is active, only toggle filtered rules
    if (searchQuery.trim()) {
      const filteredIds = new Set(filteredRules.map((r) => r.id));
      const updated = rules.map((r) => (filteredIds.has(r.id) ? { ...r, enabled } : r));
      onUpdateRules(updated);
      onShowToast(
        `${enabled ? 'Включено' : 'Отключено'} ${filteredIds.size} найденных приложений`,
        'success'
      );
      return;
    }

    const updated = rules.map((r) => ({ ...r, enabled }));
    onUpdateRules(updated);
    onShowToast(enabled ? 'Все приложения включены' : 'Все приложения отключены', 'success');
  };

  // Save edited rule from modal
  const handleSaveModal = (updatedRule: AppFilterRule) => {
    const exists = rules.some((r) => r.id === updatedRule.id);
    let newRules: AppFilterRule[];
    if (exists) {
      newRules = rules.map((r) => (r.id === updatedRule.id ? updatedRule : r));
    } else {
      newRules = [updatedRule, ...rules];
    }
    onUpdateRules(newRules);
    onShowToast(`Правило "${updatedRule.name}" сохранено`, 'success');
  };

  // Import apps list from device
  const handleImportApps = () => {
    if (!importText.trim()) return;

    const lines = importText.split('\n').map((l) => l.trim()).filter(Boolean);
    const existingMap = new Map(rules.map((r) => [r.packageName.toLowerCase(), r]));
    const newItems: AppFilterRule[] = [];
    let countAdded = 0;

    for (const rawLine of lines) {
      // Handle lines like "package:com.whatsapp" or "com.whatsapp" or "com.whatsapp WhatsApp"
      let cleanPkg = rawLine.replace(/^package:/i, '').trim();
      let customName = '';

      if (cleanPkg.includes('=')) {
        const parts = cleanPkg.split('=');
        cleanPkg = parts[0].trim();
        customName = parts[1].trim();
      } else if (cleanPkg.includes(' ')) {
        const parts = cleanPkg.split(/\s+/);
        cleanPkg = parts[0].trim();
        customName = parts.slice(1).join(' ').trim();
      }

      if (!cleanPkg || !cleanPkg.includes('.')) continue;

      const lower = cleanPkg.toLowerCase();
      if (existingMap.has(lower)) {
        const existing = existingMap.get(lower)!;
        existing.installedOnDevice = true;
        existing.enabled = true; // turn on imported app
      } else {
        const guessedName =
          customName ||
          cleanPkg
            .split('.')
            .pop()
            ?.replace(/^(app|android|mobile)/, '') ||
          cleanPkg;

        const newRule: AppFilterRule = {
          id: 'imported_' + Math.random().toString(36).substring(2, 9),
          name: guessedName.charAt(0).toUpperCase() + guessedName.slice(1),
          packageName: cleanPkg,
          category: 'custom',
          enabled: false,
          filterMode: 'all',
          keywords: [],
          excludeKeywords: [],
          extractOtp: true,
          silent: false,
          discoveredFromDevice: true,
          installedOnDevice: true,
        };
        newItems.push(newRule);
        existingMap.set(lower, newRule);
        countAdded++;
      }
    }

    const updated = [...newItems, ...rules];
    onUpdateRules(updated);
    setIsImportModalOpen(false);
    setImportText('');
    onShowToast(`Синхронизировано: добавлено ${countAdded} новых приложений с устройства`, 'success');
  };

  // Scan device apps
  const handleScanDeviceApps = () => {
    if (typeof window !== 'undefined' && window.AndroidBridge?.getInstalledApps) {
      const { updatedRules, addedCount, purgedCount } = syncDeviceApps(rules, true);
      onUpdateRules(updatedRules);
      let msg = `Просканировано ${updatedRules.length} приложений устройства.`;
      if (addedCount > 0) msg += ` Добавлено новых: +${addedCount}.`;
      if (purgedCount > 0) msg += ` Очищены отсутствующие: -${purgedCount}.`;
      onShowToast(msg, 'success');
    } else {
      setIsImportModalOpen(true);
    }
  };

  // Add custom manual app
  const handleAddNewApp = () => {
    const newRule: AppFilterRule = {
      id: 'custom_' + Date.now(),
      name: 'Новое приложение',
      packageName: 'com.example.app',
      category: 'custom',
      enabled: true,
      filterMode: 'all',
      keywords: [],
      excludeKeywords: [],
      extractOtp: true,
      silent: false,
      isCustom: true,
      installedOnDevice: true,
    };
    setEditingRule(newRule);
    setIsModalOpen(true);
  };

  const enabledCount = rules.filter((r) => r.enabled).length;
  const totalCount = rules.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Device Apps Section Header & Search Bar */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Список приложений устройства
              </h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-slate-800 text-sky-300 border border-slate-700">
                Выбрано: {enabledCount} из {totalCount}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Отметьте галочками приложения, от которых вы хотите получать пересылку в Telegram.
              Вы можете быстро найти нужное приложение через строку поиска ниже.
            </p>
          </div>

          {/* Top Actions: Sync & Add */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={handleScanDeviceApps}
              className="px-3.5 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-xs font-semibold text-sky-400 border border-sky-500/30 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Сканировать все установленные приложения непосредственно с Android-устройства"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              Сканировать устройство
            </button>
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Вставить список пакетов вручную"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              Импорт списка
            </button>
            <button
              type="button"
              onClick={handleAddNewApp}
              className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm shadow-sky-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить приложение
            </button>
          </div>
        </div>

        {/* SEARCH BAR (Prominent, instant search as requested) */}
        <div className="relative">
          <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Быстрый поиск приложения по названию или пакету (например: Сбер, WhatsApp, Tinkoff, Ozon, ru.vtb)..."
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500 placeholder:text-slate-500 shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Filter Tabs & Bulk Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-slate-800 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'all', label: `Все (${totalCount})` },
              { id: 'enabled', label: `Включенные (${enabledCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-slate-800 text-sky-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bulk Selection shortcuts */}
          <div className="flex items-center gap-2 text-slate-400 self-end sm:self-auto shrink-0">
            <span>Выбор:</span>
            <button
              type="button"
              onClick={() => handleSetAll(true)}
              className="hover:text-sky-400 transition-colors font-medium underline cursor-pointer"
            >
              Выбрать все
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => handleSetAll(false)}
              className="hover:text-rose-400 transition-colors font-medium underline cursor-pointer"
            >
              Снять все
            </button>
          </div>
        </div>
      </div>

      {/* APPS LIST (Clean, high-efficiency list with checkboxes) */}
      <div className="space-y-2">
        {filteredRules.map((rule) => {
          const isEnabled = rule.enabled;

          return (
            <div
              key={rule.id}
              onClick={() => handleToggleRule(rule.id)}
              className={`px-4 py-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                isEnabled
                  ? 'bg-slate-900 border-slate-700/80 hover:border-sky-500/60 shadow-sm'
                  : 'bg-slate-950/60 border-slate-900 opacity-60 hover:opacity-100'
              }`}
            >
              {/* Left Zone: Checkbox & App Identity */}
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Custom Checkbox */}
                <div
                  onClick={(e) => handleToggleRule(rule.id, e)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                    isEnabled
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>

                {/* Category Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                    rule.category === 'banking'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : rule.category === 'sms'
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      : rule.category === 'messenger'
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                      : rule.category === 'marketplace' || rule.category === 'delivery'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {rule.category === 'banking' ? (
                    <Landmark className="w-4 h-4" />
                  ) : rule.category === 'sms' ? (
                    <MessageSquare className="w-4 h-4" />
                  ) : rule.category === 'messenger' ? (
                    <MessageSquare className="w-4 h-4" />
                  ) : rule.category === 'marketplace' ? (
                    <ShoppingBag className="w-4 h-4" />
                  ) : rule.category === 'delivery' ? (
                    <Truck className="w-4 h-4" />
                  ) : (
                    <Smartphone className="w-4 h-4" />
                  )}
                </div>

                {/* Names */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold truncate ${
                        isEnabled ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {rule.name}
                    </span>
                    {(rule.discoveredFromDevice || rule.installedOnDevice) && (
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-sky-950 border border-sky-800/50 text-sky-400">
                        С устройства
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">
                    {rule.packageName}
                  </div>
                </div>
              </div>

              {/* Right Zone: Filter Tags & Settings button */}
              <div className="flex items-center gap-3 shrink-0">
                {/* 2FA / Keyword indicators */}
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                  {rule.extractOtp && (
                    <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      2FA
                    </span>
                  )}
                  {rule.filterMode === 'keywords' && (
                    <span className="text-slate-400 text-[11px]">
                      Слов: {rule.keywords.length}
                    </span>
                  )}
                  {rule.filterMode === 'otp_only' && (
                    <span className="text-sky-400 text-[11px]">
                      Только коды
                    </span>
                  )}
                </div>

                {/* Fine-tuning filter button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingRule(rule);
                    setIsModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Настроить ключевые слова и фильтры для этого приложения"
                >
                  <Sliders className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden md:inline">Фильтры</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredRules.length === 0 && (
          <div className="py-12 text-center p-8 rounded-2xl bg-slate-900 border border-slate-800">
            <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <div className="text-slate-300 font-semibold text-sm">
              По запросу "{searchQuery}" приложений не найдено
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Проверьте правильность написания или нажмите кнопку "Добавить приложение", чтобы добавить любой пакет вручную.
            </p>
          </div>
        )}
      </div>

      {/* Fine-Tuning Modal */}
      <FilterEditModal
        rule={editingRule}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
      />

      {/* Import Device Apps Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">
                  Импорт списка приложений с Android
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Вы можете скопировать и вставить список установленных пакетов с вашего смартфона. Приложения добавятся в общий список и включатся для пересылки:
              </p>

              <textarea
                rows={7}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`com.whatsapp WhatsApp\ncom.idamob.tinkoff.android Т-Банк\nru.sberbankmobile Сбер\nru.ozon.app.android Ozon\npackage:com.instagram.android`}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportText(
                      `com.whatsapp WhatsApp\ncom.idamob.tinkoff.android Т-Банк\nru.sberbankmobile СберБанк\nru.alfabank.mobile.android Альфа-Банк\nru.ozon.app.android Ozon\ncom.wildberries.ru Wildberries\nru.yandex.taxi Яндекс Go\nru.rostel.gosuslugi Госуслуги`
                    );
                  }}
                  className="text-xs text-sky-400 hover:underline cursor-pointer"
                >
                  Вставить тестовый набор
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleImportApps}
                    disabled={!importText.trim()}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold shadow-sm"
                  >
                    Синхронизировать
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
