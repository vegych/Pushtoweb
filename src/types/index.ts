export type AppCategory = 
  | 'sms' 
  | 'banking' 
  | 'messenger' 
  | 'marketplace' 
  | 'delivery' 
  | 'government' 
  | 'system' 
  | 'custom';

export type FilterMode = 'all' | 'keywords' | 'regex' | 'otp_only';

export interface AppFilterRule {
  id: string;
  name: string;
  packageName: string;
  category: AppCategory;
  enabled: boolean;
  filterMode: FilterMode;
  keywords: string[];
  excludeKeywords: string[];
  regexPattern?: string;
  senderFilter?: string; // Comma-separated or regex
  extractOtp: boolean;
  customFormat?: string;
  silent: boolean; // disable_notification in Telegram
  isCustom?: boolean;
  discoveredFromDevice?: boolean;
  installedOnDevice?: boolean;
}

export interface ForwardingSettings {
  serviceRunning: boolean; // Главный тумблер: Запустить сервис пересылки
  forwardSmsEnabled: boolean; // Включить пересылку SMS
  forwardPushEnabled: boolean; // Включить пересылку push-уведомлений
  telegramApiEndpoint: string; // API чата в Telegram (https://api.telegram.org или прокси)
  telegramBotToken: string;
  telegramChatId: string;
  gatewayApiKey: string;
  customWebhookUrl?: string;
  globalFilterMode: 'whitelist' | 'blacklist';
  otpOnlyGlobal: boolean;
  blockDuplicatesSec: number;
  ignoreOngoing: boolean;
  simFilter: 'all' | 'sim1' | 'sim2';
  sim1OperatorName: string; // Имя оператора для SIM 1 (напр. МТС)
  sim2OperatorName: string; // Имя оператора для SIM 2 (напр. МегаФон / Т-Банк)
  showOperator: boolean; // Показывать имя оператора в Telegram сообщении
  showTimestamp: boolean; // Показывать точное время
  maskSensitiveDigits: boolean;
  smsTemplate: string; // Шаблон для SMS
  pushTemplate: string; // Шаблон для Push-уведомлений
  otpHighlightTemplate: string; // Формат выделения 2FA кода
  showStatusBarNotification: boolean; // Уведомление в строке состояния о работе сервиса (SMS / Push)
  showNotificationWhenStopped: boolean; // Показывать ли уведомление в строке состояния при остановленном сервисе
}

export interface IncomingMessagePayload {
  type?: 'sms' | 'notification' | 'battery';
  packageName?: string;
  appName?: string;
  sender?: string;
  title?: string;
  text: string;
  timestamp?: number;
  simSlot?: number;
  operator?: string; // Имя оператора связи (МТС, билайн, МегаФон, t2 и т.д.)
  isOngoing?: boolean;
  apiKey?: string;
}

export interface ForwardedMessageLog {
  id: string;
  timestamp: number;
  type: 'sms' | 'notification' | 'battery' | 'system';
  packageName: string;
  appName: string;
  sender: string;
  title: string;
  text: string;
  otpCode?: string;
  simSlot?: number;
  operator?: string; // Имя оператора связи
  status: 'forwarded' | 'blocked' | 'error';
  blockedReason?: string;
  telegramMessageId?: number;
  errorDetails?: string;
  matchedRuleId?: string;
  rawPayload?: Record<string, any>;
}

export interface FilterResult {
  allowed: boolean;
  reason: string;
  otpCode?: string;
  formattedText: string;
  silent: boolean;
  matchedRule?: AppFilterRule;
}

export interface AndroidNativeBridge {
  isNativeApp?: () => boolean;
  isServiceRunning?: () => boolean;
  isNotificationAccessGranted?: () => boolean;
  isSmsPermissionGranted?: () => boolean;
  isBatteryOptimizationIgnored?: () => boolean;
  requestSmsPermissions?: () => void;
  requestNotificationAccess?: () => void;
  requestBatteryOptimizationExemption?: () => void;
  toggleService?: (enabled: boolean) => void;
  toggleSms?: (enabled: boolean) => void;
  togglePush?: (enabled: boolean) => void;
  updateServiceStatus?: (serviceRunning: boolean, smsEnabled: boolean, pushEnabled: boolean, showNotification?: boolean) => void;
  sendTestTelegram?: () => void;
  syncSettings?: (settingsJson: string) => void;
  saveTelegramConfig?: (token: string, chatId: string, endpoint: string, webhook: string) => void;
  getTelegramConfig?: () => string;
  getInstalledApps?: () => string;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidNativeBridge;
  }
}
