import React, { useState } from 'react';
import { X, Plus, Trash2, Shield, BellOff, Code, Sliders, Check } from 'lucide-react';
import { AppCategory, AppFilterRule, FilterMode } from '../types';

interface FilterEditModalProps {
  rule: AppFilterRule | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: AppFilterRule) => void;
}

const CATEGORIES: { id: AppCategory; label: string }[] = [
  { id: 'sms', label: 'SMS / Сообщения' },
  { id: 'banking', label: 'Банки и финансы' },
  { id: 'messenger', label: 'Мессенджеры' },
  { id: 'marketplace', label: 'Маркетплейсы' },
  { id: 'delivery', label: 'Доставка' },
  { id: 'government', label: 'Госуслуги' },
  { id: 'system', label: 'Системные' },
  { id: 'custom', label: 'Пользовательские' },
];

export const FilterEditModal: React.FC<FilterEditModalProps> = ({
  rule,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !rule) return null;

  const [formData, setFormData] = useState<AppFilterRule>({ ...rule });
  const [keywordInput, setKeywordInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');
  const [regexTestText, setRegexTestText] = useState('Ваш код подтверждения: 9482');
  const [regexTestResult, setRegexTestResult] = useState<boolean | null>(null);

  // Test regex when pattern or test text changes
  React.useEffect(() => {
    if (formData.filterMode === 'regex' && formData.regexPattern) {
      try {
        const re = new RegExp(formData.regexPattern, 'i');
        setRegexTestResult(re.test(regexTestText));
      } catch {
        setRegexTestResult(false);
      }
    } else {
      setRegexTestResult(null);
    }
  }, [formData.regexPattern, formData.filterMode, regexTestText]);

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !formData.keywords.includes(trimmed)) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, trimmed],
      });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((k) => k !== kw),
    });
  };

  const handleAddExclude = () => {
    const trimmed = excludeInput.trim();
    if (trimmed && !formData.excludeKeywords.includes(trimmed)) {
      setFormData({
        ...formData,
        excludeKeywords: [...formData.excludeKeywords, trimmed],
      });
      setExcludeInput('');
    }
  };

  const handleRemoveExclude = (kw: string) => {
    setFormData({
      ...formData,
      excludeKeywords: formData.excludeKeywords.filter((k) => k !== kw),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 my-8 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-sky-400" />
              <span>Настройка фильтрации: {formData.name}</span>
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{formData.packageName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5 text-sm">
          {/* Basic App Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Название приложения
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Пакет Android (Package Name)
              </label>
              <input
                type="text"
                value={formData.packageName}
                onChange={(e) => setFormData({ ...formData, packageName: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Категория
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as AppCategory })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-5">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                <span className="ml-3 text-sm font-medium text-slate-200">
                  {formData.enabled ? 'Пересылка включена' : 'Пересылка выключена'}
                </span>
              </label>
            </div>
          </div>

          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Режим фильтрации сообщений
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'all', title: 'Все уведомления', desc: 'Без ограничений' },
                { id: 'otp_only', title: 'Только 2FA / Коды', desc: 'Авторизация и SMS' },
                { id: 'keywords', title: 'По ключевым словам', desc: 'Включение / Исключение' },
                { id: 'regex', title: 'Регулярное выражение', desc: 'Для профи' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, filterMode: m.id as FilterMode })}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    formData.filterMode === m.id
                      ? 'border-sky-500 bg-sky-950/40 text-sky-200'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-xs">{m.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Specific Filters depending on mode */}
          {formData.filterMode === 'keywords' && (
            <div className="space-y-4 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-sky-300 mb-1">
                  Пересылать, только если есть хотя бы ОДНО ключевое слово:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                    placeholder="Например: списание, код, перевод, пароль, заказ..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Добавить
                  </button>
                </div>
                {/* Keywords list */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-950/80 border border-sky-600/40 text-sky-300 text-xs"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="hover:text-red-400 text-slate-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {formData.keywords.length === 0 && (
                    <span className="text-xs text-amber-400">
                      Внимание: если список пуст, ни одно сообщение не пройдёт фильтр!
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {formData.filterMode === 'regex' && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-sky-300 mb-1">
                  Регулярное выражение (JavaScript RegExp без слешей):
                </label>
                <input
                  type="text"
                  value={formData.regexPattern || ''}
                  onChange={(e) => setFormData({ ...formData, regexPattern: e.target.value })}
                  placeholder="Например: (код|пароль)\s*[:=]\s*\d{4,6}"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Regex Tester */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Проверка регулярного выражения на примере:</span>
                  {regexTestResult !== null && (
                    <span className={regexTestResult ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {regexTestResult ? '✓ Совпадает (пройдёт)' : '✗ Не совпадает (заблокируется)'}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={regexTestText}
                  onChange={(e) => setRegexTestText(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Exclude Keywords (Available for all modes) */}
          <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-rose-300">
              Блокировать сообщения со словами-исключениями (Черный список слов):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={excludeInput}
                onChange={(e) => setExcludeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExclude())}
                placeholder="Например: реклама, акция, скидка, займы, казино..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={handleAddExclude}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Добавить
              </button>
            </div>
            {/* Excluded list */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {formData.excludeKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/60 border border-rose-600/40 text-rose-300 text-xs"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => handleRemoveExclude(kw)}
                    className="hover:text-white text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {formData.excludeKeywords.length === 0 && (
                <span className="text-xs text-slate-500">Слова-исключения не заданы</span>
              )}
            </div>
          </div>

          {/* Additional Options: Sender filter, 2FA code extraction, Silent toggle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Фильтр отправителя / номера (опционально)
              </label>
              <input
                type="text"
                value={formData.senderFilter || ''}
                onChange={(e) => setFormData({ ...formData, senderFilter: e.target.value })}
                placeholder="Например: 900, Tinkoff, Sber (через запятую)"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Оставьте пустым для получения от всех отправителей
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.extractOtp}
                  onChange={(e) => setFormData({ ...formData, extractOtp: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-4 h-4"
                />
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Автоматически выделять код подтверждения (2FA / OTP)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.silent}
                  onChange={(e) => setFormData({ ...formData, silent: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-4 h-4"
                />
                <span className="flex items-center gap-1.5">
                  <BellOff className="w-4 h-4 text-slate-400" />
                  Пересылать без звука (тихое уведомление в Telegram)
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-sky-600/20"
            >
              <Check className="w-4 h-4" /> Сохранить правила
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
