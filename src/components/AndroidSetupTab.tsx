import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  BatteryCharging, 
  BellRing, 
  ShieldAlert, 
  Terminal, 
  ChevronRight,
  Sparkles,
  Code,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Cpu
} from 'lucide-react';
import { ForwardingSettings } from '../types';

interface AndroidSetupTabProps {
  settings: ForwardingSettings;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AndroidSetupTab: React.FC<AndroidSetupTabProps> = ({
  settings,
  onShowToast,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const isNativeApp = typeof window !== 'undefined' && Boolean(window.AndroidBridge?.isNativeApp?.());
  const [hasSmsPermission, setHasSmsPermission] = useState(false);
  const [hasNotifPermission, setHasNotifPermission] = useState(false);
  const [hasBatteryIgnored, setHasBatteryIgnored] = useState(false);

  useEffect(() => {
    if (isNativeApp && window.AndroidBridge) {
      setHasSmsPermission(Boolean(window.AndroidBridge.isSmsPermissionGranted?.()));
      setHasNotifPermission(Boolean(window.AndroidBridge.isNotificationAccessGranted?.()));
      setHasBatteryIgnored(Boolean(window.AndroidBridge.isBatteryOptimizationIgnored?.()));
    }
  }, [isNativeApp]);

  const webhookUrl = `${window.location.origin}/api/forward?key=${settings.gatewayApiKey}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    onShowToast('Webhook URL скопирован в буфер обмена', 'success');
  };

  const sampleCurl = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "sms",
    "sender": "900",
    "text": "Код для входа: 4892",
    "appName": "СберБанк",
    "packageName": "ru.sberbankmobile",
    "operator": "МТС",
    "simSlot": 1
  }'`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(sampleCurl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
    onShowToast('cURL команда скопирована', 'success');
  };

  const handleDownloadAndroidProject = () => {
    window.open('/api/export/android-project.zip', '_blank');
    onShowToast('Скачивание единого Android-проекта...', 'success');
  };

  const handleDownloadMacroDroid = () => {
    window.open('/api/export/macrodroid', '_blank');
    onShowToast('Скачивание файла настроек MacroDroid...', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-5 space-y-4">
      {/* Native App Status Card (if running inside native Android APK) */}
      {isNativeApp && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/50 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Приложение запущено нативно на Android</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
              Встроенный перехватчик активен
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                window.AndroidBridge?.requestSmsPermissions?.();
                setTimeout(() => setHasSmsPermission(Boolean(window.AndroidBridge?.isSmsPermissionGranted?.())), 1000);
              }}
              className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                hasSmsPermission ? 'bg-slate-900 border-emerald-500/40 text-emerald-300' : 'bg-amber-950/40 border-amber-500/50 text-amber-300'
              }`}
            >
              <span>1. Доступ к SMS</span>
              <span className="font-semibold text-[11px]">{hasSmsPermission ? '✓ Разрешено' : 'Разрешить'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                window.AndroidBridge?.requestNotificationAccess?.();
                setTimeout(() => setHasNotifPermission(Boolean(window.AndroidBridge?.isNotificationAccessGranted?.())), 1000);
              }}
              className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                hasNotifPermission ? 'bg-slate-900 border-emerald-500/40 text-emerald-300' : 'bg-amber-950/40 border-amber-500/50 text-amber-300'
              }`}
            >
              <span>2. Доступ к пушам</span>
              <span className="font-semibold text-[11px]">{hasNotifPermission ? '✓ Разрешено' : 'Разрешить'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                window.AndroidBridge?.requestBatteryOptimizationExemption?.();
                setTimeout(() => setHasBatteryIgnored(Boolean(window.AndroidBridge?.isBatteryOptimizationIgnored?.())), 1000);
              }}
              className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                hasBatteryIgnored ? 'bg-slate-900 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
            >
              <span>3. Работа в фоне 24/7</span>
              <span className="font-semibold text-[11px]">{hasBatteryIgnored ? '✓ Настроено' : 'Настроить'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 🚀 PRIMARY OPTION: ALL-IN-ONE ANDROID APPLICATION (APK) */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900 border-2 border-sky-500/40 space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Вариант 1 (Всё в одном приложении)
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Единый автономный Android APK
            </h3>
            <p className="text-xs text-slate-400">
              Внутри одного APK упакованы и этот интерфейс управления, и нативный системный перехватчик SMS / Push.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadAndroidProject}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 shadow-md shadow-sky-600/30"
          >
            <Download className="w-4 h-4" />
            <span>Скачать единый проект (.ZIP)</span>
          </button>
        </div>

        {/* 4 Steps for APK Assembly */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[11px]">1</span>
              Распакуйте архив
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Скачайте и распакуйте <code>sms_forwarder_android_app.zip</code> на компьютере.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[11px]">2</span>
              Android Studio
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Откройте папку проекта в бесплатной программе <b>Android Studio</b>.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[11px]">3</span>
              Соберите APK
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Нажмите в меню: <b>Build → Build APK(s)</b>. Готовый <code>.apk</code> файл создастся за полминуты.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[11px]">4</span>
              Установите на телефон
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Установите APK, откройте и разрешите доступ к SMS и уведомлениям в 1 клик.
            </p>
          </div>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-300 font-medium">
          <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 flex items-center gap-1 text-emerald-400">
            ✓ Работа в фоне 24/7 (Foreground Service)
          </span>
          <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 flex items-center gap-1 text-sky-400">
            ✓ Уведомление в строке состояния (SMS [ВКЛ] · Push [ВКЛ])
          </span>
          <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 flex items-center gap-1 text-indigo-400">
            ✓ Автозапуск при перезагрузке телефона
          </span>
          <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 flex items-center gap-1 text-purple-400">
            ✓ Встроенный JS-Bridge и управление
          </span>
        </div>
      </div>

      {/* OPTION 2: MACRODROID / TASKER */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">
              Вариант 2: Готовая утилита MacroDroid (без компиляции APK)
            </h3>
            <p className="text-xs text-slate-400">
              Если не хотите собирать APK, можно поставить бесплатный MacroDroid из Google Play и импортировать готовый шаблон.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadMacroDroid}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Скачать шаблон .json</span>
          </button>
        </div>

        {/* Webhook bar */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 shrink-0 text-[11px]">Webhook URL:</span>
          <div className="flex-1 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-sky-300 font-mono text-[11px] select-all truncate">
            {webhookUrl}
          </div>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs cursor-pointer flex items-center gap-1"
          >
            {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedUrl ? 'Скопировано' : 'Копировать'}</span>
          </button>
        </div>
      </div>

      {/* Android System Battery & Auto-start Tips */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
        <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Важные настройки Android для бесперебойной работы в фоне</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-1 text-[11px]">
              <BellRing className="w-3.5 h-3.5 text-sky-400" />
              1. Доступ к уведомлениям
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Настройки → Приложения → Специальный доступ → Доступ к уведомлениям → Включить.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-1 text-[11px]">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              2. Без ограничений батареи
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Установите режим «Без ограничений», чтобы Android не усыплял фоновую службу.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-1 text-[11px]">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              3. Автозапуск (Xiaomi/Huawei)
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Включите «Автозапуск» и закрепите приложение в меню запущенных задач (замочек).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
