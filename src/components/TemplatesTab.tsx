import React, { useState } from 'react';
import { 
  FileCode, 
  Check, 
  RotateCcw, 
  Eye, 
  Radio, 
  Clock, 
  ShieldCheck, 
  MessageSquareText, 
  Bell, 
  Plus, 
  Sparkles,
  Info
} from 'lucide-react';
import { ForwardingSettings } from '../types';
import { TelegramMessageBubble } from './TelegramMessageBubble';

interface TemplatesTabProps {
  settings: ForwardingSettings;
  onUpdateSettings: (newSettings: ForwardingSettings) => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const TemplatesTab: React.FC<TemplatesTabProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
}) => {
  const [smsTemplate, setSmsTemplate] = useState(
    settings.smsTemplate || '💬 <b>[SMS]</b> {sender}\n{text}\n\n{otp_block}{meta_footer}'
  );
  const [pushTemplate, setPushTemplate] = useState(
    settings.pushTemplate || '📲 <b>[{app_name}]</b> {sender_info}\n{text}\n\n{otp_block}{meta_footer}'
  );
  const [otpHighlightTemplate, setOtpHighlightTemplate] = useState(
    settings.otpHighlightTemplate || '🔑 Код: <code>{otp_code}</code>'
  );
  const [sim1Operator, setSim1Operator] = useState(settings.sim1OperatorName || 'МТС');
  const [sim2Operator, setSim2Operator] = useState(settings.sim2OperatorName || 'МегаФон');
  const [showOperator, setShowOperator] = useState(settings.showOperator ?? true);
  const [showTimestamp, setShowTimestamp] = useState(settings.showTimestamp ?? true);

  const [previewType, setPreviewType] = useState<'sms' | 'push'>('sms');

  const handleSave = () => {
    onUpdateSettings({
      ...settings,
      smsTemplate: smsTemplate.trim(),
      pushTemplate: pushTemplate.trim(),
      otpHighlightTemplate: otpHighlightTemplate.trim(),
      sim1OperatorName: sim1Operator.trim(),
      sim2OperatorName: sim2Operator.trim(),
      showOperator,
      showTimestamp,
    });
    onShowToast('Шаблоны сообщений успешно сохранены', 'success');
  };

  const handleResetDefaults = () => {
    const defaultSms = '💬 <b>[SMS]</b> {sender}\n{text}\n\n{otp_block}{meta_footer}';
    const defaultPush = '📲 <b>[{app_name}]</b> {sender_info}\n{text}\n\n{otp_block}{meta_footer}';
    const defaultOtp = '🔑 Код: <code>{otp_code}</code>';
    setSmsTemplate(defaultSms);
    setPushTemplate(defaultPush);
    setOtpHighlightTemplate(defaultOtp);
    setSim1Operator('МТС');
    setSim2Operator('МегаФон');
    setShowOperator(true);
    setShowTimestamp(true);
    onUpdateSettings({
      ...settings,
      smsTemplate: defaultSms,
      pushTemplate: defaultPush,
      otpHighlightTemplate: defaultOtp,
      sim1OperatorName: 'МТС',
      sim2OperatorName: 'МегаФон',
      showOperator: true,
      showTimestamp: true,
    });
    onShowToast('Шаблоны сброшены к значениям по умолчанию', 'success');
  };

  // Helper to insert tag at cursor or end
  const insertTag = (target: 'sms' | 'push' | 'otp', tag: string) => {
    if (target === 'sms') {
      setSmsTemplate((prev) => prev + tag);
    } else if (target === 'push') {
      setPushTemplate((prev) => prev + tag);
    } else {
      setOtpHighlightTemplate((prev) => prev + tag);
    }
  };

  // Apply a preset
  const applyPreset = (preset: 'standard' | 'minimal' | 'compact' | 'focus_code') => {
    if (preset === 'standard') {
      setSmsTemplate('💬 <b>[SMS]</b> {sender}\n{text}\n\n{otp_block}{meta_footer}');
      setPushTemplate('📲 <b>[{app_name}]</b> {sender_info}\n{text}\n\n{otp_block}{meta_footer}');
      setOtpHighlightTemplate('🔑 Код: <code>{otp_code}</code>');
    } else if (preset === 'minimal') {
      setSmsTemplate('<b>{sender}</b>: {text}\n{otp_block}');
      setPushTemplate('<b>{app_name}</b>: {text}\n{otp_block}');
      setOtpHighlightTemplate('Код: <code>{otp_code}</code>');
    } else if (preset === 'compact') {
      setSmsTemplate('💬 {sender} — {text}\n{otp_block}\n{meta_footer}');
      setPushTemplate('📲 {app_name} — {text}\n{otp_block}\n{meta_footer}');
      setOtpHighlightTemplate('🔑 <code>{otp_code}</code>');
    } else if (preset === 'focus_code') {
      setSmsTemplate('{otp_block}\n\n💬 <b>{sender}</b>: {text}\n{meta_footer}');
      setPushTemplate('{otp_block}\n\n📲 <b>{app_name}</b>: {text}\n{meta_footer}');
      setOtpHighlightTemplate('⚡ ВАШ КОД: <code>{otp_code}</code> ⚡');
    }
    onShowToast('Пресет шаблона применён', 'success');
  };

  // Compute live preview text
  const previewData = previewType === 'sms'
    ? {
        appDisplayName: 'SMS',
        sender: '900',
        title: '',
        text: 'Пароль для входа в СберБанк Онлайн: 6841. Никому не сообщайте код.',
        otpCode: '6841',
        operator: sim1Operator || 'МТС',
        timestamp: Date.now(),
      }
    : {
        appDisplayName: 'Т-Банк',
        sender: 'Tinkoff',
        title: 'Операция по карте',
        text: 'Покупка 1,250 RUB в SUPERMARKET. Доступно: 24,190 RUB.',
        otpCode: '8392',
        operator: sim1Operator || 'МТС',
        timestamp: Date.now(),
      };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-sky-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Редактор шаблонов сообщений Telegram
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Настройте формат отображения пересылаемых SMS и пуш-уведомлений. 
            Используйте теги переменных и HTML-разметку (<code>&lt;b&gt;</code>, <code>&lt;i&gt;</code>, <code>&lt;code&gt;</code>).
          </p>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Сбросить
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm shadow-sky-600/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Сохранить шаблоны
          </button>
        </div>
      </div>

      {/* Main Grid: Editors (7 cols) + Live Preview (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Editors (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Presets Bar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Быстрые пресеты шаблонов:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('standard')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                Стандартный (с подвалом)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('compact')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                Компактный
              </button>
              <button
                type="button"
                onClick={() => applyPreset('focus_code')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                Акцент на 2FA коде
              </button>
              <button
                type="button"
                onClick={() => applyPreset('minimal')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                Минималистичный
              </button>
            </div>
          </div>

          {/* 1. SMS Template Editor */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <MessageSquareText className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-white text-sm">Шаблон входящих SMS</h3>
            </div>

            <p className="text-xs text-slate-400">
              Формат пересылки входящих текстовых сообщений:
            </p>

            <textarea
              rows={4}
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500 leading-relaxed"
            />

            {/* Quick tags for SMS */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500 mr-1">Вставить тег:</span>
              {[
                { label: '{sender}', desc: 'Отправитель' },
                { label: '{text}', desc: 'Текст' },
                { label: '{otp_block}', desc: 'Блок кода' },
                { label: '{meta_footer}', desc: 'Оператор и время' },
                { label: '{operator}', desc: 'Оператор' },
                { label: '{time}', desc: 'Время' },
              ].map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => insertTag('sms', ` ${t.label} `)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-mono text-[11px] transition-colors cursor-pointer"
                  title={t.desc}
                >
                  +{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Push Notifications Template Editor */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Bell className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Шаблон Push-уведомлений приложений</h3>
            </div>

            <p className="text-xs text-slate-400">
              Формат пересылки уведомлений от установленных приложений:
            </p>

            <textarea
              rows={4}
              value={pushTemplate}
              onChange={(e) => setPushTemplate(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500 leading-relaxed"
            />

            {/* Quick tags for Push */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500 mr-1">Вставить тег:</span>
              {[
                { label: '{app_name}', desc: 'Имя приложения' },
                { label: '{sender_info}', desc: 'Отправитель' },
                { label: '{text}', desc: 'Текст' },
                { label: '{otp_block}', desc: 'Блок кода' },
                { label: '{meta_footer}', desc: 'Оператор и время' },
                { label: '{time}', desc: 'Время' },
              ].map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => insertTag('push', ` ${t.label} `)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-mono text-[11px] transition-colors cursor-pointer"
                  title={t.desc}
                >
                  +{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 2FA Code Highlight Block Template */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-white text-sm">Формат блока кода подтверждения (2FA / OTP)</h3>
            </div>

            <p className="text-xs text-slate-400">
              Текст блока, который выделяет одноразовый пароль (тег <code>&lt;code&gt;</code> позволяет копировать код в Telegram в 1 клик):
            </p>

            <input
              type="text"
              value={otpHighlightTemplate}
              onChange={(e) => setOtpHighlightTemplate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* 4. Operator & Metadata Settings (No Battery) */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Radio className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-white text-sm">Настройка имён операторов связи и времени</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Имя оператора (SIM 1)
                </label>
                <input
                  type="text"
                  value={sim1Operator}
                  onChange={(e) => setSim1Operator(e.target.value)}
                  placeholder="МТС, МегаФон, билайн..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Имя оператора (SIM 2)
                </label>
                <input
                  type="text"
                  value={sim2Operator}
                  onChange={(e) => setSim2Operator(e.target.value)}
                  placeholder="МегаФон, t2, Tele2..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2.5 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOperator}
                  onChange={(e) => setShowOperator(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                />
                <span>Писать имя оператора связи в подвале сообщения (📶 {sim1Operator || 'МТС'})</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTimestamp}
                  onChange={(e) => setShowTimestamp(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                />
                <span>Писать точное время поступления (⏰ {new Date().toLocaleTimeString('ru-RU')})</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Telegram Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 sticky top-24">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-white text-sm">Живой предпросмотр в Telegram</h3>
              </div>

              {/* Toggle SMS / Push preview */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewType('sms')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    previewType === 'sms'
                      ? 'bg-slate-800 text-sky-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SMS
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewType('push')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    previewType === 'push'
                      ? 'bg-slate-800 text-sky-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Push
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Так сформированное сообщение выглядит в чате Telegram с учётом текущего шаблона:
            </p>

            {/* Bubble */}
            <div className="pt-2">
              <TelegramMessageBubble
                appDisplayName={previewData.appDisplayName}
                sender={previewData.sender}
                title={previewData.title}
                text={previewData.text}
                otpCode={previewData.otpCode}
                operator={showOperator ? previewData.operator : undefined}
                timestamp={previewData.timestamp}
              />
            </div>

            <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="font-semibold text-slate-300">Доступные переменные:</div>
              <ul className="space-y-1 font-mono text-[11px] text-slate-400">
                <li><code>{'{app_name}'}</code> — название приложения</li>
                <li><code>{'{sender}'}</code> — номер или контакт отправителя</li>
                <li><code>{'{text}'}</code> — текст SMS или пуш-уведомления</li>
                <li><code>{'{otp_code}'}</code> — выделенный 2FA код</li>
                <li><code>{'{operator}'}</code> — имя оператора ({sim1Operator})</li>
                <li><code>{'{time}'}</code> — точное время (14:32:05)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
