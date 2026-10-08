import { AppFilterRule } from '../types';

export const PREDEFINED_APPS: AppFilterRule[] = [];

export const DEFAULT_SETTINGS = {
  serviceRunning: false, // Главный переключатель работы сервиса пересылки (по умолчанию выключен)
  forwardSmsEnabled: true, // Включить пересылку SMS (по умолчанию включено при старте сервиса)
  forwardPushEnabled: true, // Включить пересылку уведомлений (push) (по умолчанию включено при старте сервиса)
  telegramApiEndpoint: 'https://api.telegram.org', // API чата в Telegram
  telegramBotToken: '',
  telegramChatId: '',
  gatewayApiKey: 'smsf_' + Math.random().toString(36).substring(2, 12),
  globalFilterMode: 'whitelist' as const,
  otpOnlyGlobal: false,
  blockDuplicatesSec: 10,
  ignoreOngoing: true,
  simFilter: 'all' as const,
  sim1OperatorName: 'МТС',
  sim2OperatorName: 'МегаФон',
  showOperator: true,
  showTimestamp: true,
  maskSensitiveDigits: true,
  smsTemplate: '💬 <b>[SMS]</b> {sender}\n{text}\n\n{otp_block}{meta_footer}',
  pushTemplate: '📲 <b>[{app_name}]</b> {sender_info}\n{text}\n\n{otp_block}{meta_footer}',
  otpHighlightTemplate: '🔑 Код: <code>{otp_code}</code>',
  showStatusBarNotification: true,
  showNotificationWhenStopped: false,
};
