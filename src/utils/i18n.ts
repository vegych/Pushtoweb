export type LanguageMode = 'auto' | 'ru' | 'en';
export type Language = 'ru' | 'en';
export type ThemeMode = 'auto' | 'dark' | 'light';
export type Theme = 'dark' | 'light';

export function detectSystemLanguage(): Language {
  if (typeof navigator === 'undefined') return 'ru';
  const lang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
  if (lang.startsWith('ru') || lang.startsWith('be') || lang.startsWith('uk') || lang.startsWith('kk')) {
    return 'ru';
  }
  return 'en';
}

export function detectSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const translations = {
  ru: {
    // Header & Brand
    appTitle: 'PushToWeb',
    menu: 'Меню',
    connected: 'Telegram подключен',
    notConfigured: 'Настроить Telegram',
    testBtn: 'Тест связи',
    testing: 'Отправка...',
    quickTest: 'Тест в Telegram',
    testSent: 'Тестовое уведомление доставлено в Telegram!',
    testError: 'Ошибка отправки в Telegram: ',

    // Tabs
    tabDashboard: 'Главная (Статистика)',
    tabFilters: 'Фильтр приложений',
    tabTelegram: 'Телеграм и шлюз',
    tabTemplates: 'Шаблоны сообщений',
    tabLogs: 'Журнал пересылки',
    tabSetup: 'Инструкция Android',

    // Dashboard
    forwardingService: 'Сервис пересылки',
    serviceRunning: 'ЗАПУЩЕН (24/7)',
    serviceStopped: 'ОСТАНОВЛЕН',
    botReady: 'Бот готов',
    botNotConfigured: 'Бот не настроен',
    smsForwarding: 'Пересылка SMS',
    smsSubtextOn: 'SMS и коды 2FA пересылаются',
    smsSubtextOff: 'Отключено',
    pushForwarding: 'Пересылка уведомлений',
    pushSubtextOn: 'Активно',
    pushSubtextOff: 'Отключено',
    appsCountSuffix: 'приложений',
    on: 'ВКЛ',
    off: 'ВЫКЛ',
    processedTotal: 'Всего обработано',
    delivered: 'Доставлено в Telegram',
    successRate: 'Успешность',
    blockedSpam: 'Заблокировано (Спам)',
    recentActivity: 'Лента последних событий',
    viewAllLogs: 'Весь журнал',
    noLogsYet: 'Сообщений пока нет. Они появятся здесь после пересылки.',
    sendTestFirst: 'Отправить первый тест',
    allActive: 'Все активные',

    // Filters
    filtersTitle: 'Фильтрация приложений',
    filtersDesc: 'Выбирайте, от каких приложений принимать пуши и как отсекать спам',
    searchApps: 'Поиск по названию или пакету...',
    categoryAll: 'Все',
    categoryBanking: 'Банки & Финансы',
    categoryMessenger: 'Мессенджеры',
    categoryMarketplace: 'Маркетплейсы',
    categorySystem: 'Системные',
    categoryCustom: 'Свои правила',
    addCustomRule: 'Добавить приложение',
    enabledApps: 'активно из',

    // Telegram Tab
    tgSettingsTitle: 'Настройки Telegram и шлюза',
    tgBotToken: 'Токен бота (Bot Token)',
    tgChatId: 'Chat ID или ID канала',
    tgEndpoint: 'Эндпоинт Telegram API',
    apiKeyTitle: 'API-ключ шлюза',
    webhookTitle: 'Webhook URL для внешних устройств',
    saveSettings: 'Сохранить настройки',
    settingsSaved: 'Настройки сохранены',

    // Templates Tab
    templatesTitle: 'Конструктор оформления сообщений',
    templatesDesc: 'Выберите готовый стиль или настройте внешний вид под себя',
    presetClassic: '🌟 Классика',
    presetCompact: '⚡ Компактный',
    presetOtpOnly: '🛡️ Только код',
    presetDetailed: '📋 Подробный',
    codeHighlight: 'Выделение 2FA кода',
    simOperator: 'Операторы SIM-карт',
    previewTitle: 'Предпросмотр сообщения в Telegram',

    // Logs Tab
    logsTitle: 'Журнал пересылки',
    clearLogs: 'Очистить журнал',
    refreshLogs: 'Обновить',
    searchLogs: 'Поиск по тексту или отправителю...',
    noMatchingLogs: 'Совпадений не найдено',

    // Android Tab
    setupTitle: 'Подключение Android устройства',
    setupDesc: 'Инструкция по настройке перехватчика SMS и уведомлений',
    nativeAppTitle: 'Нативное приложение (APK)',
    macrodroidTitle: 'Шаблон MacroDroid / Tasker',
    webhookDirect: 'Прямой HTTP Webhook',

    // Drawer & Settings
    sections: 'Разделы приложения',
    forwardingStatus: 'Статус пересылки:',
    copyUrl: 'Копировать',
    copied: 'Скопировано',
    themeSetting: 'Тема оформления',
    themeAuto: 'Авто',
    themeLight: 'Светлая',
    themeDark: 'Темная',
    langSetting: 'Язык приложения',
    langAuto: 'Авто',
    langRu: 'Русский',
    langEn: 'English'
  },
  en: {
    // Header & Brand
    appTitle: 'PushToWeb',
    menu: 'Menu',
    connected: 'Telegram Connected',
    notConfigured: 'Configure Telegram',
    testBtn: 'Test Connection',
    testing: 'Sending...',
    quickTest: 'Test in Telegram',
    testSent: 'Test notification delivered to Telegram!',
    testError: 'Telegram delivery error: ',

    // Tabs
    tabDashboard: 'Dashboard (Stats)',
    tabFilters: 'App Filters',
    tabTelegram: 'Telegram & Gateway',
    tabTemplates: 'Message Templates',
    tabLogs: 'Forwarding Logs',
    tabSetup: 'Android Setup',

    // Dashboard
    forwardingService: 'Forwarding Service',
    serviceRunning: 'RUNNING (24/7)',
    serviceStopped: 'STOPPED',
    botReady: 'Bot ready',
    botNotConfigured: 'Bot not configured',
    smsForwarding: 'SMS Forwarding',
    smsSubtextOn: 'SMS & 2FA codes forwarded',
    smsSubtextOff: 'Disabled',
    pushForwarding: 'Push Notifications',
    pushSubtextOn: 'Active',
    pushSubtextOff: 'Disabled',
    appsCountSuffix: 'apps',
    on: 'ON',
    off: 'OFF',
    processedTotal: 'Total Processed',
    delivered: 'Delivered to Telegram',
    successRate: 'Success Rate',
    blockedSpam: 'Blocked (Spam)',
    recentActivity: 'Live Activity Feed',
    viewAllLogs: 'View Full Log',
    noLogsYet: 'No forwarded messages yet. They will appear here once processed.',
    sendTestFirst: 'Send First Test',
    allActive: 'All active',

    // Filters
    filtersTitle: 'App Filters & Rules',
    filtersDesc: 'Choose which apps forward notifications and block unwanted marketing spam',
    searchApps: 'Search by app name or package...',
    categoryAll: 'All',
    categoryBanking: 'Banks & Finance',
    categoryMessenger: 'Messengers',
    categoryMarketplace: 'Marketplaces',
    categorySystem: 'System',
    categoryCustom: 'Custom Rules',
    addCustomRule: 'Add Custom App',
    enabledApps: 'active of',

    // Telegram Tab
    tgSettingsTitle: 'Telegram & Gateway Settings',
    tgBotToken: 'Bot Token',
    tgChatId: 'Chat ID or Channel ID',
    tgEndpoint: 'Telegram API Endpoint',
    apiKeyTitle: 'Gateway API Key',
    webhookTitle: 'Webhook URL for external devices',
    saveSettings: 'Save Settings',
    settingsSaved: 'Settings saved successfully',

    // Templates Tab
    templatesTitle: 'Message Format Designer',
    templatesDesc: 'Choose a pre-made compact style or customize formatting options',
    presetClassic: '🌟 Classic',
    presetCompact: '⚡ Compact',
    presetOtpOnly: '🛡️ OTP Only',
    presetDetailed: '📋 Detailed',
    codeHighlight: '2FA Code Highlighting',
    simOperator: 'SIM Card Carriers',
    previewTitle: 'Telegram Message Preview',

    // Logs Tab
    logsTitle: 'Forwarding History Log',
    clearLogs: 'Clear Log',
    refreshLogs: 'Refresh',
    searchLogs: 'Search message text or sender...',
    noMatchingLogs: 'No matching records found',

    // Android Tab
    setupTitle: 'Android Device Connection',
    setupDesc: 'Setup guide for intercepting SMS and push notifications',
    nativeAppTitle: 'Native App (APK)',
    macrodroidTitle: 'MacroDroid / Tasker Template',
    webhookDirect: 'Direct HTTP Webhook',

    // Drawer & Settings
    sections: 'Application Sections',
    forwardingStatus: 'Forwarding Status:',
    copyUrl: 'Copy',
    copied: 'Copied',
    themeSetting: 'Theme',
    themeAuto: 'Auto',
    themeLight: 'Light',
    themeDark: 'Dark',
    langSetting: 'Language',
    langAuto: 'Auto',
    langRu: 'Русский',
    langEn: 'English'
  }
};
