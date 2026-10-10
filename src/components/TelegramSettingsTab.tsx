import React, { useState } from 'react';
import { 
  Send, 
  Search, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  Bell, 
  CheckCircle2,
  Globe,
  AlertTriangle,
  Sparkles,
  Bot
} from 'lucide-react';
import { ForwardingSettings } from '../types';
import { testBotToken, detectRecentChat, sendTelegramMessage, setBotMetadata, setBotProfilePhoto } from '../services/telegram';
import { TelegramMessageBubble } from './TelegramMessageBubble';

const DEFAULT_BOT_HEADER = '🔔 Пересылка SMS, кодов подтверждения и пуш-уведомлений Android';

interface TelegramSettingsTabProps {
  settings: ForwardingSettings;
  onUpdateSettings: (newSettings: ForwardingSettings) => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const TelegramSettingsTab: React.FC<TelegramSettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
}) => {
  const [apiEndpoint, setApiEndpoint] = useState(settings.telegramApiEndpoint || 'https://api.telegram.org');
  const [botToken, setBotToken] = useState(settings.telegramBotToken);
  const [chatId, setChatId] = useState(settings.telegramChatId);
  const [apiKey, setApiKey] = useState(settings.gatewayApiKey);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [verifiedBotName, setVerifiedBotName] = useState<string | null>(null);
  const [isDetectingChat, setIsDetectingChat] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedApiUrl, setCopiedApiUrl] = useState(false);
  const [isSettingUpBot, setIsSettingUpBot] = useState(false);
  const [botSetupSuccess, setBotSetupSuccess] = useState<string | null>(null);
  const avatarTimestamp = React.useMemo(() => Date.now(), []);

  const webhookUrl = `${window.location.origin}/api/forward?key=${apiKey}`;
  const cleanEndpoint = (apiEndpoint || 'https://api.telegram.org').replace(/\/+$/, '');
  const isValidChatId = Boolean(chatId && /^(@[a-zA-Z0-9_]{5,32}|-?\d+)$/.test(chatId.trim()));
  const displayChatId = isValidChatId ? chatId.trim() : '<CHAT_ID>';
  const telegramChatApiUrl = `${cleanEndpoint}/bot${botToken ? botToken.substring(0, 10) + '...' : '<BOT_TOKEN>'}/sendMessage?chat_id=${displayChatId}`;

  const handleSaveApiSettings = () => {
    onUpdateSettings({
      ...settings,
      telegramApiEndpoint: apiEndpoint.trim(),
      telegramBotToken: botToken.trim(),
      telegramChatId: chatId.trim(),
      gatewayApiKey: apiKey.trim(),
    });
    onShowToast('Настройки API Telegram чата сохранены', 'success');
  };

  const handleTestToken = async () => {
    if (!botToken.trim()) {
      onShowToast('Введите токен бота', 'error');
      return;
    }
    setIsVerifyingToken(true);
    setVerifiedBotName(null);
    try {
      const res = await testBotToken(botToken, apiEndpoint);
      if (res.success && res.bot) {
        setVerifiedBotName(`@${res.bot.username} (${res.bot.first_name})`);
        onShowToast(`Токен верный! Бот: @${res.bot.username}`, 'success');
      } else {
        onShowToast(res.error || 'Неверный токен или недоступен API эндпоинт', 'error');
      }
    } finally {
      setIsVerifyingToken(false);
    }
  };

  const handleDetectChatId = async () => {
    if (!botToken.trim()) {
      onShowToast('Сначала укажите токен бота', 'error');
      return;
    }
    setIsDetectingChat(true);
    try {
      const res = await detectRecentChat(botToken, apiEndpoint);
      if (res.success && res.user) {
        setChatId(res.user.chatId);
        onUpdateSettings({
          ...settings,
          telegramApiEndpoint: apiEndpoint.trim(),
          telegramBotToken: botToken.trim(),
          telegramChatId: res.user.chatId,
        });
        const name = res.user.firstName || res.user.username || res.user.chatId;
        onShowToast(`Chat ID успешно определен: ${res.user.chatId} (${name})`, 'success');
      } else {
        onShowToast(res.error || 'Отправьте боту команду /start в Telegram и повторите попытку!', 'error');
      }
    } finally {
      setIsDetectingChat(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      onShowToast('Укажите токен бота и Chat ID', 'error');
      return;
    }
    setIsSendingTest(true);
    try {
      const opName = settings.sim1OperatorName || 'МТС';
      const timeStr = new Date().toLocaleTimeString('ru-RU');
      const testText = `🤖 <b>Тестовое сообщение от SMS Forwarder</b>\n\nAPI чата в Telegram настроен успешно!\n\n🔑 Проверочный код: <code>9842</code>\n\n<pre>📶 ${opName}  ·  ⏰ ${timeStr}</pre>`;
      const res = await sendTelegramMessage(botToken, chatId, testText, false, apiEndpoint);
      if (res.success) {
        onShowToast('Тестовое сообщение успешно доставлено в Telegram!', 'success');
      } else {
        const errHint = res.error?.includes('chat not found')
          ? 'Bad Request: chat not found (Обязательно откройте бота в Telegram и нажмите /start!)'
          : res.error;
        onShowToast(`Ошибка отправки: ${errHint}`, 'error');
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleRegenerateApiKey = () => {
    const newKey = 'smsf_' + Math.random().toString(36).substring(2, 12);
    setApiKey(newKey);
    onUpdateSettings({ ...settings, gatewayApiKey: newKey });
    onShowToast('Новый API-ключ шлюза сгенерирован', 'success');
  };

  const handleSetupBotProfile = async () => {
    if (!botToken.trim()) {
      onShowToast('Сначала укажите токен бота', 'error');
      return;
    }

    setIsSettingUpBot(true);
    setBotSetupSuccess(null);

    try {
      // 1. Try server endpoint first (sets descriptions + avatar)
      let serverOk = false;
      try {
        const res = await fetch('/api/telegram/setup-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: botToken.trim(),
            apiEndpoint: apiEndpoint.trim(),
          }),
        });
        const data = await res.json();
        if (data && data.success) {
          serverOk = true;
          const msg = 'Стандартные описания и аватарка бота успешно применены в Telegram!';
          setBotSetupSuccess(msg);
          onShowToast(msg, 'success');
          return;
        }
      } catch (err) {
        // Fallback to client-side direct calls if server is offline or in APK standalone
      }

      if (!serverOk) {
        // 2. Direct client-side calls
        let metaOk = false;
        try {
          const metaRes = await setBotMetadata(botToken, {
            description: '', // Очистка приветственного описания
            shortDescription: DEFAULT_BOT_HEADER, // Шапка бота
          }, apiEndpoint);
          metaOk = metaRes.success;
        } catch {}

        let photoOk = false;
        try {
          const photoFetch = await fetch('./bot-avatar.jpg');
          if (photoFetch.ok) {
            const blob = await photoFetch.blob();
            const photoRes = await setBotProfilePhoto(botToken, blob, apiEndpoint);
            photoOk = photoRes.success;
          }
        } catch {}

        if (photoOk || metaOk) {
          const summary = 'Шапка и аватарка бота успешно применены!';
          setBotSetupSuccess(summary);
          onShowToast(summary, 'success');
        } else {
          onShowToast('Не удалось обновить профиль бота. Проверьте токен бота.', 'error');
        }
      }
    } finally {
      setIsSettingUpBot(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    onShowToast('Webhook URL скопирован в буфер обмена', 'success');
  };

  const handleCopyApiUrl = () => {
    const full = `${cleanEndpoint}/bot${botToken}/sendMessage?chat_id=${chatId}`;
    navigator.clipboard.writeText(full);
    setCopiedApiUrl(true);
    setTimeout(() => setCopiedApiUrl(false), 2000);
    onShowToast('URL вызова Chat API скопирован', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Telegram Chat API & Gateway (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION: API ЧАТА В TELEGRAM (Requested explicitly by user) */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-sky-500/30 space-y-5 shadow-lg shadow-sky-950/10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">API чата в Telegram</h3>
              </div>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
              >
                @BotFather
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Настройте параметры вызова Telegram Bot API для отправки сообщений в нужный чат, группу или канал:
            </p>

            {/* Warning banner about /start */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-400">
                <span>⚠️ Важное правило Telegram для ботов:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Чтобы бот мог отправлять вам сообщения, <b>откройте вашего бота в Telegram и обязательно нажмите кнопку <code className="text-amber-400 font-mono bg-slate-950 px-1 py-0.5 rounded">/start</code></b>. Если отправка в канал или группу — добавьте бота в подписчики/админы. Без этого Telegram заблокирует отправку с ошибкой <i>Bad Request: chat not found</i>.
              </p>
            </div>

            {/* 1. Endpoint */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                  URL эндпоинта Telegram API
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setApiEndpoint('https://api.telegram.org')}
                    className="text-[11px] text-sky-400 hover:underline"
                  >
                    По умолчанию (api.telegram.org)
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://api.telegram.org"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* 2. Bot Token */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                  Токен бота (Bot Token)
                </label>
                {verifiedBotName && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {verifiedBotName}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
                  className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-sky-500 placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleTestToken}
                  disabled={isVerifyingToken || !botToken.trim()}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {isVerifyingToken ? 'Проверка...' : 'Проверить токен'}
                </button>
              </div>
            </div>

            {/* 3. Chat ID */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                ID чата получателя (Chat ID / Channel ID)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="Например: 123456789 или -100123456789"
                  className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-sky-500 placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleDetectChatId}
                  disabled={isDetectingChat || !botToken.trim()}
                  className="px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm shadow-sky-600/20"
                  title="Автоматически найти Chat ID по команде /start в боте"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isDetectingChat ? 'Поиск...' : 'Автоопределить ID'}</span>
                </button>
              </div>
              {chatId && !isValidChatId && (
                <p className="text-[11px] text-amber-400 font-medium pt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Введенный текст не является валидным Chat ID (должен состоять из цифр, например 123456789 или быть юзернеймом канала @channel).</span>
                </p>
              )}
            </div>

            {/* Chat API preview */}
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold uppercase tracking-wider">Формат вызова Telegram Chat API:</span>
                <button
                  type="button"
                  onClick={handleCopyApiUrl}
                  disabled={!botToken || !chatId}
                  className="text-sky-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  {copiedApiUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Скопировать URL API</span>
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 break-all select-all">
                {telegramChatApiUrl}
              </div>
            </div>

            {/* Save & Test Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSaveApiSettings}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors cursor-pointer shadow-sm shadow-sky-600/20"
              >
                Сохранить параметры API чата
              </button>
              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={isSendingTest || !botToken.trim() || !chatId.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingTest ? 'Отправка...' : 'Отправить тест в чат'}</span>
              </button>
            </div>
          </div>

          {/* SECTION: АВАТАРКА И ШАПКА БОТА */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg shadow-sky-950/5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Оформление бота в Telegram</h3>
                  <p className="text-[11px] text-slate-400">
                    Установка официальной аватарки и шапки бота
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* 1. Avatar info */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <img
                  src={`./bot-avatar.jpg?v=${avatarTimestamp}`}
                  alt="Default Bot Avatar"
                  className="w-12 h-12 rounded-full ring-2 ring-sky-500/30 object-cover shadow-md shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = './icon.png';
                  }}
                />
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold text-slate-200">
                    Аватарка бота
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Фирменный значок PushToWeb
                  </p>
                </div>
              </div>

              {/* 2. Bot Header */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                <span className="font-semibold text-slate-200">
                  Шапка бота
                </span>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-sky-300 font-medium select-all">
                  {DEFAULT_BOT_HEADER}
                </div>
              </div>
            </div>

            {botSetupSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{botSetupSuccess}</span>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                Применение параметров через Telegram Bot API:
              </span>
              <button
                type="button"
                onClick={handleSetupBotProfile}
                disabled={isSettingUpBot || !botToken.trim()}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-sky-950/20 whitespace-nowrap self-stretch sm:self-auto"
              >
                {isSettingUpBot ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Установка в Telegram...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Установить по умолчанию</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Webhook & Gateway API Key */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-semibold text-white text-base">Шлюз для смартфона (Webhook URL)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Прямой HTTP Webhook адрес для внешних интеграций и передачи уведомлений:
            </p>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sky-300 font-mono text-xs focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? 'Скопировано' : 'Копировать'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span>API Ключ:</span>
                  <code className="text-slate-300 font-mono bg-slate-800 px-2 py-0.5 rounded">
                    {apiKey}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateApiKey}
                  className="text-slate-400 hover:text-sky-400 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Перегенерировать
                </button>
              </div>
            </div>
          </div>

          {/* Global Safety Rules */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-semibold text-white text-base">Фильтры и безопасность</h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800 cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-200">
                    Маскировать номера банковских карт
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Заменять 16-значные номера на формат 4276 **** **** 9012
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.maskSensitiveDigits}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, maskSensitiveDigits: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Telegram Preview & Appearance (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 sticky top-24">
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-sky-400" />
              <span>Предпросмотр сообщения в Telegram чате</span>
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              Так уведомления будут приходить в ваш чат через настроенный Bot API:
            </p>

            <div className="pt-2">
              <TelegramMessageBubble
                appDisplayName="СберБанк"
                sender="900"
                title="Покупка в магазине"
                text="Карта 4276 **** **** 5678: Покупка 1,450 RUB в MAGNIT. Доступно: 18,240 RUB."
                otpCode="8291"
                operator={settings.showOperator ? settings.sim1OperatorName || 'МТС' : undefined}
                timestamp={Date.now()}
              />
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
              <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[11px]">
                Отображение в сообщении:
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showOperator}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, showOperator: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                />
                <span>Показывать имя оператора связи (📶 {settings.sim1OperatorName || 'МТС'})</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showTimestamp}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, showTimestamp: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                />
                <span>Показывать время (⏰ {new Date().toLocaleTimeString('ru-RU')})</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
