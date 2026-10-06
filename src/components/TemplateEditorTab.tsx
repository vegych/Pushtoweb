import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Check, 
  Smartphone, 
  Radio, 
  Clock, 
  ShieldCheck, 
  MessageSquareText, 
  Bell, 
  Tag, 
  Info,
  User,
  MessageSquare,
  Heading,
  Key,
  Calendar,
  Layers,
  Bold,
  Italic,
  Code,
  SquareCode,
  HelpCircle,
  AtSign,
  Plus,
  SlidersHorizontal,
  CheckCircle2,
  ArrowRight,
  Eye,
  Settings2
} from 'lucide-react';
import { ForwardingSettings } from '../types';
import { DEFAULT_SETTINGS } from '../data/predefinedApps';
import { formatTelegramMessage } from '../utils/filterEngine';

interface TemplateEditorTabProps {
  settings: ForwardingSettings;
  onUpdateSettings: (newSettings: ForwardingSettings) => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

interface TagDefinition {
  id: string;
  tag: string;
  title: string;
  desc: string;
  example: string;
  category: 'main' | 'otp' | 'sim' | 'html';
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}

const TEMPLATE_TAGS: TagDefinition[] = [
  {
    id: 'appName',
    tag: '{appName}',
    title: 'Приложение',
    desc: 'Название приложения (напр. СберБанк или SMS)',
    example: 'СберБанк',
    category: 'main',
    icon: Smartphone,
    colorClass: 'text-sky-400 bg-sky-950/60 border-sky-500/40 hover:bg-sky-900/60',
  },
  {
    id: 'sender',
    tag: '{sender}',
    title: 'Отправитель',
    desc: 'Номер телефона или контакт',
    example: '900',
    category: 'main',
    icon: User,
    colorClass: 'text-blue-400 bg-blue-950/60 border-blue-500/40 hover:bg-blue-900/60',
  },
  {
    id: 'text',
    tag: '{text}',
    title: 'Текст сообщения',
    desc: 'Основное содержимое SMS или уведомления',
    example: 'Покупка 1450 ₽...',
    category: 'main',
    icon: MessageSquare,
    colorClass: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40 hover:bg-cyan-900/60',
  },
  {
    id: 'title',
    tag: '{title}',
    title: 'Заголовок пуша',
    desc: 'Заголовок push-уведомления',
    example: 'Перевод средств',
    category: 'main',
    icon: Heading,
    colorClass: 'text-indigo-400 bg-indigo-950/60 border-indigo-500/40 hover:bg-indigo-900/60',
  },
  {
    id: 'senderInfo',
    tag: '{senderInfo}',
    title: 'Блок отправителя',
    desc: 'Вставка (· Отправитель)',
    example: '· 900',
    category: 'main',
    icon: AtSign,
    colorClass: 'text-teal-400 bg-teal-950/60 border-teal-500/40 hover:bg-teal-900/60',
  },
  {
    id: 'otpBlock',
    tag: '{otpBlock}',
    title: 'Блок 2FA с кодом',
    desc: 'Красивая плашка с кодом',
    example: '🔑 Код: 8492',
    category: 'otp',
    icon: ShieldCheck,
    colorClass: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40 hover:bg-emerald-900/60',
  },
  {
    id: 'otpCode',
    tag: '{otpCode}',
    title: 'Только код',
    desc: 'Только цифры кода',
    example: '8492',
    category: 'otp',
    icon: Key,
    colorClass: 'text-green-400 bg-green-950/60 border-green-500/40 hover:bg-green-900/60',
  },
  {
    id: 'operator',
    tag: '{operator}',
    title: 'Оператор связи',
    desc: 'Имя оператора (МТС, билайн)',
    example: 'МТС',
    category: 'sim',
    icon: Radio,
    colorClass: 'text-amber-400 bg-amber-950/60 border-amber-500/40 hover:bg-amber-900/60',
  },
  {
    id: 'time',
    tag: '{time}',
    title: 'Точное время',
    desc: 'Время (ЧЧ:ММ:СС)',
    example: '14:35:20',
    category: 'sim',
    icon: Clock,
    colorClass: 'text-orange-400 bg-orange-950/60 border-orange-500/40 hover:bg-orange-900/60',
  },
  {
    id: 'metaFooter',
    tag: '{metaFooter}',
    title: 'Подвал',
    desc: '📶 Оператор · ⏰ Время',
    example: '<pre>📶 МТС · ⏰ 14:35</pre>',
    category: 'sim',
    icon: Layers,
    colorClass: 'text-violet-400 bg-violet-950/60 border-violet-500/40 hover:bg-violet-900/60',
  },
];

const HTML_BUTTONS = [
  { label: '<b>Жирный</b>', insert: '<b>текст</b>', icon: Bold, desc: 'Жирный шрифт' },
  { label: '<i>Курсив</i>', insert: '<i>текст</i>', icon: Italic, desc: 'Курсивный шрифт' },
  { label: '<code>Код</code>', insert: '<code>текст</code>', icon: Code, desc: 'Копируемый код' },
  { label: '<pre>Блок</pre>', insert: '<pre>блок</pre>', icon: SquareCode, desc: 'Моноширинный блок' },
];

export const TemplateEditorTab: React.FC<TemplateEditorTabProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
}) => {
  // Mode: 'visual' (Конструктор переключателей) or 'manual' (Текстовый шаблон)
  const [editorMode, setEditorMode] = useState<'visual' | 'manual'>('visual');
  const [activeTab, setActiveTab] = useState<'sms' | 'push'>('sms');
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [lastInsertedTag, setLastInsertedTag] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<'classic' | 'compact' | 'minimal' | 'detailed' | null>('classic');

  // Form state
  const [smsTemplate, setSmsTemplate] = useState(
    settings.smsTemplate || DEFAULT_SETTINGS.smsTemplate
  );
  const [pushTemplate, setPushTemplate] = useState(
    settings.pushTemplate || DEFAULT_SETTINGS.pushTemplate
  );
  const [otpHighlightTemplate, setOtpHighlightTemplate] = useState(
    settings.otpHighlightTemplate || DEFAULT_SETTINGS.otpHighlightTemplate
  );
  const [sim1OperatorName, setSim1OperatorName] = useState(
    settings.sim1OperatorName || 'МТС'
  );
  const [sim2OperatorName, setSim2OperatorName] = useState(
    settings.sim2OperatorName || 'МегаФон'
  );
  const [showOperator, setShowOperator] = useState(settings.showOperator ?? true);
  const [showTimestamp, setShowTimestamp] = useState(settings.showTimestamp ?? true);

  // Visual builder state for SMS
  const [smsShowHeader, setSmsShowHeader] = useState(true);
  const [smsShowSender, setSmsShowSender] = useState(true);
  const [smsShowText, setSmsShowText] = useState(true);
  const [smsShowOtp, setSmsShowOtp] = useState(true);
  const [smsShowFooter, setSmsShowFooter] = useState(true);

  // Visual builder state for Push
  const [pushShowApp, setPushShowApp] = useState(true);
  const [pushShowSender, setPushShowSender] = useState(true);
  const [pushShowTitle, setPushShowTitle] = useState(false);
  const [pushShowText, setPushShowText] = useState(true);
  const [pushShowOtp, setPushShowOtp] = useState(true);
  const [pushShowFooter, setPushShowFooter] = useState(true);

  // Refs for cursor insertion in manual mode
  const smsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const pushTextareaRef = useRef<HTMLTextAreaElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Re-generate templates automatically when visual builder controls change
  useEffect(() => {
    if (editorMode !== 'visual') return;

    // Build SMS template
    let smsTpl = '';
    if (smsShowHeader && smsShowSender) {
      smsTpl += '💬 <b>[SMS]</b> {sender}\n';
    } else if (smsShowHeader) {
      smsTpl += '💬 <b>[SMS]</b>\n';
    } else if (smsShowSender) {
      smsTpl += '👤 <b>{sender}</b>\n';
    }

    if (smsShowText) {
      smsTpl += '{text}\n\n';
    }

    if (smsShowOtp) {
      smsTpl += '{otpBlock}';
    }

    if (smsShowFooter) {
      smsTpl += '{metaFooter}';
    }

    setSmsTemplate(smsTpl.trim());

    // Build Push template
    let pushTpl = '';
    if (pushShowApp && pushShowSender) {
      pushTpl += '📲 <b>[{appName}]</b> {senderInfo}\n';
    } else if (pushShowApp) {
      pushTpl += '📲 <b>[{appName}]</b>\n';
    } else if (pushShowSender) {
      pushTpl += '👤 <i>{sender}</i>\n';
    }

    if (pushShowTitle) {
      pushTpl += '📌 <b>{title}</b>\n';
    }

    if (pushShowText) {
      pushTpl += '{text}\n\n';
    }

    if (pushShowOtp) {
      pushTpl += '{otpBlock}';
    }

    if (pushShowFooter) {
      pushTpl += '{metaFooter}';
    }

    setPushTemplate(pushTpl.trim());
  }, [
    editorMode,
    smsShowHeader,
    smsShowSender,
    smsShowText,
    smsShowOtp,
    smsShowFooter,
    pushShowApp,
    pushShowSender,
    pushShowTitle,
    pushShowText,
    pushShowOtp,
    pushShowFooter,
  ]);

  // Insert tag at cursor in manual mode
  const handleInsertTag = (
    tagText: string,
    target: 'sms' | 'push' | 'otp'
  ) => {
    let targetElement: HTMLTextAreaElement | HTMLInputElement | null = null;
    let currentValue = '';
    let setter: (val: string) => void = () => {};

    if (target === 'sms') {
      targetElement = smsTextareaRef.current;
      currentValue = smsTemplate;
      setter = setSmsTemplate;
    } else if (target === 'push') {
      targetElement = pushTextareaRef.current;
      currentValue = pushTemplate;
      setter = setPushTemplate;
    } else {
      targetElement = otpInputRef.current;
      currentValue = otpHighlightTemplate;
      setter = setOtpHighlightTemplate;
    }

    if (!targetElement) {
      setter(currentValue ? `${currentValue} ${tagText}` : tagText);
      setLastInsertedTag(tagText);
      return;
    }

    const start = targetElement.selectionStart ?? currentValue.length;
    const end = targetElement.selectionEnd ?? currentValue.length;
    const before = currentValue.substring(0, start);
    const after = currentValue.substring(end);
    const updated = before + tagText + after;

    setter(updated);
    setLastInsertedTag(tagText);

    setTimeout(() => {
      if (targetElement) {
        targetElement.focus();
        const nextPos = start + tagText.length;
        targetElement.setSelectionRange(nextPos, nextPos);
      }
    }, 50);
  };

  // Preset Styles (Compact presets)
  const applyPreset = (presetKey: 'classic' | 'compact' | 'minimal' | 'detailed') => {
    setSelectedPreset(presetKey);
    if (presetKey === 'classic') {
      setSmsShowHeader(true);
      setSmsShowSender(true);
      setSmsShowText(true);
      setSmsShowOtp(true);
      setSmsShowFooter(true);
      setPushShowApp(true);
      setPushShowSender(true);
      setPushShowTitle(false);
      setPushShowText(true);
      setPushShowOtp(true);
      setPushShowFooter(true);
      setSmsTemplate('💬 <b>[SMS]</b> {sender}\n{text}\n\n{otpBlock}{metaFooter}');
      setPushTemplate('📲 <b>[{appName}]</b> {senderInfo}\n{text}\n\n{otpBlock}{metaFooter}');
      setOtpHighlightTemplate('🔑 Код: <code>{otpCode}</code>');
    } else if (presetKey === 'compact') {
      setSmsShowHeader(false);
      setSmsShowSender(true);
      setSmsShowText(true);
      setSmsShowOtp(true);
      setSmsShowFooter(false);
      setPushShowApp(true);
      setPushShowSender(false);
      setPushShowTitle(false);
      setPushShowText(true);
      setPushShowOtp(true);
      setPushShowFooter(false);
      setSmsTemplate('💬 <b>{sender}</b>: {text}\n{otpBlock}');
      setPushTemplate('📲 <b>[{appName}]</b>: {text}\n{otpBlock}');
      setOtpHighlightTemplate('👉 <code>{otpCode}</code>');
    } else if (presetKey === 'minimal') {
      setSmsShowHeader(false);
      setSmsShowSender(false);
      setSmsShowText(true);
      setSmsShowOtp(true);
      setSmsShowFooter(false);
      setPushShowApp(false);
      setPushShowSender(false);
      setPushShowTitle(false);
      setPushShowText(true);
      setPushShowOtp(true);
      setPushShowFooter(false);
      setSmsTemplate('{text}\n\n{otpBlock}');
      setPushTemplate('{text}\n\n{otpBlock}');
      setOtpHighlightTemplate('👉 <code>{otpCode}</code>');
    } else if (presetKey === 'detailed') {
      setSmsShowHeader(true);
      setSmsShowSender(true);
      setSmsShowText(true);
      setSmsShowOtp(true);
      setSmsShowFooter(true);
      setPushShowApp(true);
      setPushShowSender(true);
      setPushShowTitle(true);
      setPushShowText(true);
      setPushShowOtp(true);
      setPushShowFooter(true);
      setSmsTemplate('📩 <b>Входящее SMS</b>\n👤 Отправитель: <code>{sender}</code>\n💬 Текст: {text}\n\n{otpBlock}\n{metaFooter}');
      setPushTemplate('📲 <b>[{appName}]</b>\n📌 Заголовок: <i>{title}</i>\n👤 От: <code>{sender}</code>\n💬 Текст: {text}\n\n{otpBlock}\n{metaFooter}');
      setOtpHighlightTemplate('🛡️ <b>Код подтверждения:</b> <code>{otpCode}</code>');
    }
  };

  const handleResetToDefault = () => {
    setSelectedPreset('classic');
    setSmsTemplate(DEFAULT_SETTINGS.smsTemplate);
    setPushTemplate(DEFAULT_SETTINGS.pushTemplate);
    setOtpHighlightTemplate(DEFAULT_SETTINGS.otpHighlightTemplate);
    setSim1OperatorName('МТС');
    setSim2OperatorName('МегаФон');
    setShowOperator(true);
    setShowTimestamp(true);
    setSmsShowHeader(true);
    setSmsShowSender(true);
    setSmsShowText(true);
    setSmsShowOtp(true);
    setSmsShowFooter(true);
    setPushShowApp(true);
    setPushShowSender(true);
    setPushShowTitle(false);
    setPushShowText(true);
    setPushShowOtp(true);
    setPushShowFooter(true);
    onShowToast('Шаблоны сброшены к стандартным', 'success');
  };

  const handleSave = () => {
    onUpdateSettings({
      ...settings,
      smsTemplate: smsTemplate.trim(),
      pushTemplate: pushTemplate.trim(),
      otpHighlightTemplate: otpHighlightTemplate.trim(),
      sim1OperatorName: sim1OperatorName.trim(),
      sim2OperatorName: sim2OperatorName.trim(),
      showOperator,
      showTimestamp,
    });
    onShowToast('Настройки оформления сохранены', 'success');
  };

  // Preview formatted data
  const now = Date.now();
  const currentSettingsPreview: ForwardingSettings = {
    ...settings,
    smsTemplate,
    pushTemplate,
    otpHighlightTemplate,
    sim1OperatorName,
    sim2OperatorName,
    showOperator,
    showTimestamp,
  };

  const sampleSmsFormatted = formatTelegramMessage({
    appDisplayName: 'SMS',
    sender: '900',
    title: '',
    text: 'Код подтверждения для входа в СберБанк Онлайн: 8492. Никому не сообщайте код.',
    otpCode: '8492',
    operator: sim1OperatorName || 'МТС',
    timestamp: now,
    settings: currentSettingsPreview,
    isSms: true,
  });

  const samplePushFormatted = formatTelegramMessage({
    appDisplayName: 'СберБанк',
    title: 'Операция по карте',
    text: 'Перевод 3 500 ₽ от Иван И. Баланс: 48 230 ₽. Код подтверждения 7193',
    sender: 'SberBank',
    otpCode: '7193',
    operator: sim1OperatorName || 'МТС',
    timestamp: now,
    settings: currentSettingsPreview,
    isSms: false,
  });

  const currentPreviewFormatted = activeTab === 'sms' ? sampleSmsFormatted : samplePushFormatted;

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(currentPreviewFormatted);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
    onShowToast('Текст скопирован', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 space-y-3">
      {/* Top Banner Bar - Ultra Compact */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Оформление и шаблоны сообщений
            </h2>
            <p className="text-[11px] text-slate-400">
              Вид сообщений в Telegram, оператор связи и коды 2FA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            title="Сбросить к стандарту"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Сброс</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-sky-600/20"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Сохранить</span>
          </button>
        </div>
      </div>

      {/* 🚀 COMPACT STYLE PRESETS: 4 Sleek Horizontal Buttons */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1 text-[11px] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            Готовые стили оформления:
          </span>
          <span className="text-slate-500 text-[10px]">Кликните для выбора</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Preset 1: Classic (Sky Theme) */}
          <button
            type="button"
            onClick={() => applyPreset('classic')}
            className={`h-[68px] p-2.5 rounded-xl transition-all text-left group cursor-pointer flex flex-col justify-between border-2 overflow-hidden ${
              selectedPreset === 'classic'
                ? 'bg-sky-950/60 border-sky-400 ring-2 ring-sky-500/40 shadow-md shadow-sky-950/50'
                : 'bg-slate-950 hover:bg-slate-850 border-slate-800/90 hover:border-sky-500/40 opacity-85 hover:opacity-100 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between gap-1 min-w-0">
              <span className={`font-bold text-xs truncate whitespace-nowrap ${selectedPreset === 'classic' ? 'text-sky-300' : 'text-white group-hover:text-sky-400'}`}>
                🌟 Классика
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded border shrink-0 whitespace-nowrap ${
                selectedPreset === 'classic'
                  ? 'bg-sky-900/80 text-sky-200 border-sky-400 font-semibold'
                  : 'bg-sky-950/80 text-sky-300 border-sky-800'
              }`}>
                Топ
              </span>
            </div>
            <p className={`text-[10px] truncate ${selectedPreset === 'classic' ? 'text-sky-200/90' : 'text-slate-400'}`}>
              [SMS] + Текст + 2FA + Оператор
            </p>
          </button>

          {/* Preset 2: Compact (Emerald Theme) */}
          <button
            type="button"
            onClick={() => applyPreset('compact')}
            className={`h-[68px] p-2.5 rounded-xl transition-all text-left group cursor-pointer flex flex-col justify-between border-2 overflow-hidden ${
              selectedPreset === 'compact'
                ? 'bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-500/40 shadow-md shadow-emerald-950/50'
                : 'bg-slate-950 hover:bg-slate-850 border-slate-800/90 hover:border-emerald-500/40 opacity-85 hover:opacity-100 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between gap-1 min-w-0">
              <span className={`font-bold text-xs truncate whitespace-nowrap ${selectedPreset === 'compact' ? 'text-emerald-300' : 'text-white group-hover:text-emerald-400'}`}>
                ⚡ Компактный
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded border shrink-0 whitespace-nowrap ${
                selectedPreset === 'compact'
                  ? 'bg-emerald-900/80 text-emerald-200 border-emerald-400 font-semibold'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              }`}>
                1 строка
              </span>
            </div>
            <p className={`text-[10px] truncate ${selectedPreset === 'compact' ? 'text-emerald-200/90' : 'text-slate-400'}`}>
              Отправитель: Текст + Код
            </p>
          </button>

          {/* Preset 3: Minimal (Amber Theme) */}
          <button
            type="button"
            onClick={() => applyPreset('minimal')}
            className={`h-[68px] p-2.5 rounded-xl transition-all text-left group cursor-pointer flex flex-col justify-between border-2 overflow-hidden ${
              selectedPreset === 'minimal'
                ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-500/40 shadow-md shadow-amber-950/50'
                : 'bg-slate-950 hover:bg-slate-850 border-slate-800/90 hover:border-amber-500/40 opacity-85 hover:opacity-100 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between gap-1 min-w-0">
              <span className={`font-bold text-xs truncate whitespace-nowrap ${selectedPreset === 'minimal' ? 'text-amber-300' : 'text-white group-hover:text-amber-400'}`}>
                🛡️ Только код
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded border shrink-0 whitespace-nowrap ${
                selectedPreset === 'minimal'
                  ? 'bg-amber-900/80 text-amber-200 border-amber-400 font-semibold'
                  : 'bg-amber-950/80 text-amber-300 border-amber-800'
              }`}>
                Минимум
              </span>
            </div>
            <p className={`text-[10px] truncate ${selectedPreset === 'minimal' ? 'text-amber-200/90' : 'text-slate-400'}`}>
              Текст + код без плашек
            </p>
          </button>

          {/* Preset 4: Detailed (Purple Theme) */}
          <button
            type="button"
            onClick={() => applyPreset('detailed')}
            className={`h-[68px] p-2.5 rounded-xl transition-all text-left group cursor-pointer flex flex-col justify-between border-2 overflow-hidden ${
              selectedPreset === 'detailed'
                ? 'bg-purple-950/60 border-purple-400 ring-2 ring-purple-500/40 shadow-md shadow-purple-950/50'
                : 'bg-slate-950 hover:bg-slate-850 border-slate-800/90 hover:border-purple-500/40 opacity-85 hover:opacity-100 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between gap-1 min-w-0">
              <span className={`font-bold text-xs truncate whitespace-nowrap ${selectedPreset === 'detailed' ? 'text-purple-300' : 'text-white group-hover:text-purple-400'}`}>
                📋 Подробный
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded border shrink-0 whitespace-nowrap ${
                selectedPreset === 'detailed'
                  ? 'bg-purple-900/80 text-purple-200 border-purple-400 font-semibold'
                  : 'bg-purple-950/80 text-purple-300 border-purple-800'
              }`}>
                Карточка
              </span>
            </div>
            <p className={`text-[10px] truncate ${selectedPreset === 'detailed' ? 'text-purple-200/90' : 'text-slate-400'}`}>
              Заголовок + Отправитель + Подвал
            </p>
          </button>
        </div>
      </div>

      {/* Main Grid: Builder / Editor + Live Telegram Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left Column: Builder & Operator Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Mode switch & Tab Selector in 1 Compact Row */}
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Tab: SMS vs Push */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('sms')}
                className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'sms'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquareText className="w-3.5 h-3.5" />
                <span>SMS</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('push')}
                className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'push'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Push</span>
              </button>
            </div>

            {/* Mode: Visual vs Manual */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setEditorMode('visual')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  editorMode === 'visual'
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Конструктор</span>
              </button>

              <button
                type="button"
                onClick={() => setEditorMode('manual')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  editorMode === 'manual'
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3 h-3" />
                <span>Текст</span>
              </button>
            </div>
          </div>

          {/* MODE 1: VISUAL CONSTRUCTOR (Compact toggles) */}
          {editorMode === 'visual' && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="font-bold text-white text-xs">
                  Элементы сообщения {activeTab === 'sms' ? 'SMS' : 'Push'}
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Предпросмотр справа
                </span>
              </div>

              {activeTab === 'sms' ? (
                /* SMS Visual Toggles */
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <MessageSquareText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="text-white text-xs">Заголовок «💬 [SMS]»</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsShowHeader}
                      onChange={(e) => setSmsShowHeader(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="text-white text-xs">Номер или имя отправителя (900)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsShowSender}
                      onChange={(e) => setSmsShowSender(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-white text-xs">Полный текст сообщения</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsShowText}
                      onChange={(e) => setSmsShowText(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50 transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300 font-medium text-xs">Выделение 2FA кода (🔑 Код: 1234)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsShowOtp}
                      onChange={(e) => setSmsShowOtp(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span className="text-white text-xs">Подвал (📶 Оператор · ⏰ Время)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsShowFooter}
                      onChange={(e) => setSmsShowFooter(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>
                </div>
              ) : (
                /* Push Visual Toggles */
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-white text-xs">Имя приложения (📲 [СберБанк])</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={pushShowApp}
                      onChange={(e) => setPushShowApp(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span className="text-white text-xs">Отправитель / Контакт</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={pushShowSender}
                      onChange={(e) => setPushShowSender(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Heading className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-white text-xs">Заголовок пуша</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={pushShowTitle}
                      onChange={(e) => setPushShowTitle(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-white text-xs">Текст пуш-уведомления</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={pushShowText}
                      onChange={(e) => setPushShowText(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50 transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300 font-medium text-xs">Выделение 2FA кода (🔑 Код: 1234)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={pushShowOtp}
                      onChange={(e) => setPushShowOtp(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span className="text-white text-xs">Подвал (📶 Оператор · ⏰ Время)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={pushShowFooter}
                      onChange={(e) => setPushShowFooter(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: MANUAL TEXT EDITOR */}
          {editorMode === 'manual' && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="font-bold text-white text-xs">
                  Шаблон ({activeTab === 'sms' ? 'SMS' : 'Push'})
                </span>
                {lastInsertedTag && (
                  <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3" /> Вставлен {lastInsertedTag}
                  </span>
                )}
              </div>

              <textarea
                ref={activeTab === 'sms' ? smsTextareaRef : pushTextareaRef}
                rows={3}
                value={activeTab === 'sms' ? smsTemplate : pushTemplate}
                onChange={(e) =>
                  activeTab === 'sms'
                    ? setSmsTemplate(e.target.value)
                    : setPushTemplate(e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sky-200 font-mono text-xs focus:outline-none focus:border-sky-500 leading-relaxed shadow-inner"
              />

              {/* Tag Buttons Grid - Compact */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-medium">Вставка тега в позицию курсора:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {TEMPLATE_TAGS.map((tagItem) => {
                    const Icon = tagItem.icon;
                    return (
                      <button
                        key={tagItem.id}
                        type="button"
                        onClick={() => handleInsertTag(tagItem.tag, activeTab)}
                        className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-1 shadow-sm text-xs ${tagItem.colorClass}`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Icon className="w-3 h-3 shrink-0" />
                          <span className="font-medium truncate">{tagItem.title}</span>
                        </div>
                        <code className="font-mono text-[9px] opacity-75">{tagItem.tag}</code>
                      </button>
                    );
                  })}
                </div>

                {/* HTML formatting helpers */}
                <div className="pt-1.5 flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="text-slate-500 mr-1">HTML:</span>
                  {HTML_BUTTONS.map((htmlItem) => {
                    return (
                      <button
                        key={htmlItem.label}
                        type="button"
                        onClick={() => handleInsertTag(htmlItem.insert, activeTab)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 cursor-pointer"
                        title={htmlItem.desc}
                      >
                        {htmlItem.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Настройки операторов связи (SIM 1 / SIM 2) - Compact */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <h3 className="font-bold text-white text-xs">
                  Операторы связи и время (вместо Сим 1/2)
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-slate-300 font-medium text-[11px]">
                  Имя оператора (SIM 1)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={sim1OperatorName}
                    onChange={(e) => setSim1OperatorName(e.target.value)}
                    placeholder="МТС"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium text-xs focus:outline-none focus:border-sky-500"
                  />
                  {['МТС', 'МегаФон', 'билайн'].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setSim1OperatorName(op)}
                      className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-sky-400 border border-slate-700 cursor-pointer"
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-medium text-[11px]">
                  Имя оператора (SIM 2)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={sim2OperatorName}
                    onChange={(e) => setSim2OperatorName(e.target.value)}
                    placeholder="МегаФон"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium text-xs focus:outline-none focus:border-sky-500"
                  />
                  {['Т-Банк', 'Сбер', 't2'].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setSim2OperatorName(op)}
                      className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-sky-400 border border-slate-700 cursor-pointer"
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Operator and Time switches - Compact */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer text-xs">
                <span className="text-slate-300 text-[11px]">📶 Оператор</span>
                <input
                  type="checkbox"
                  checked={showOperator}
                  onChange={(e) => setShowOperator(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer text-xs">
                <span className="text-slate-300 text-[11px]">⏰ Время</span>
                <input
                  type="checkbox"
                  checked={showTimestamp}
                  onChange={(e) => setShowTimestamp(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* SECTION: Оформление блока 2FA кодов - Compact */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <h3 className="font-bold text-white text-xs">
                Формат выделения кода 2FA
              </h3>
            </div>

            <div className="space-y-1.5">
              <input
                ref={otpInputRef}
                type="text"
                value={otpHighlightTemplate}
                onChange={(e) => setOtpHighlightTemplate(e.target.value)}
                placeholder="🔑 Код: <code>{otpCode}</code>"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sky-300 font-mono text-xs focus:outline-none focus:border-sky-500"
              />

              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setOtpHighlightTemplate('🔑 Код: <code>{otpCode}</code>')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer font-mono text-[10px] ${
                    otpHighlightTemplate === '🔑 Код: <code>{otpCode}</code>'
                      ? 'bg-sky-950 text-sky-300 border-2 border-sky-400 ring-1 ring-sky-500 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700'
                  }`}
                >
                  🔑 Код: &lt;code&gt;1234&lt;/code&gt;
                </button>
                <button
                  type="button"
                  onClick={() => setOtpHighlightTemplate('👉 <code>{otpCode}</code>')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer font-mono text-[10px] ${
                    otpHighlightTemplate === '👉 <code>{otpCode}</code>'
                      ? 'bg-amber-950 text-amber-300 border-2 border-amber-400 ring-1 ring-amber-500 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                  }`}
                >
                  👉 &lt;code&gt;1234&lt;/code&gt;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Telegram Message Bubble Preview (5 cols) - Compact */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 sticky top-20 shadow-md">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                <h3 className="font-bold text-white text-xs">
                  Предпросмотр в Telegram
                </h3>
              </div>

              {/* Toggle SMS / Push preview */}
              <div className="flex items-center p-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveTab('sms')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    activeTab === 'sms'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SMS
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('push')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    activeTab === 'push'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Push
                </button>
              </div>
            </div>

            {/* Simulated Telegram Message Bubble - Compact */}
            <div className="w-full py-0.5">
              <div className="w-full rounded-xl rounded-bl-sm bg-[#1e2c3a] text-slate-100 p-3 shadow-md border border-slate-700/50 text-xs font-sans space-y-1.5 transition-all">
                <div 
                  className="text-xs text-slate-200 leading-relaxed break-words whitespace-pre-wrap font-sans [&_b]:font-bold [&_b]:text-white [&_i]:italic [&_i]:text-slate-300 [&_code]:bg-sky-950/80 [&_code]:text-sky-300 [&_code]:px-1 [&_code]:py-0.2 [&_code]:rounded [&_code]:font-mono [&_code]:border [&_code]:border-sky-500/40 [&_code]:select-all [&_pre]:bg-slate-900/60 [&_pre]:p-1 [&_pre]:rounded [&_pre]:font-mono [&_pre]:text-[10px] [&_pre]:text-slate-400 [&_pre]:mt-1.5"
                  dangerouslySetInnerHTML={{ __html: currentPreviewFormatted }}
                />
              </div>
            </div>

            {/* Quick Copy Raw Preview HTML */}
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <button
                type="button"
                onClick={handleCopyPreview}
                className="text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedPreview ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPreview ? 'Скопировано' : 'Скопировать текст'}</span>
              </button>
              <span className="text-[10px] text-slate-500 font-mono">HTML</span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-sky-600/20"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Сохранить настройки</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
