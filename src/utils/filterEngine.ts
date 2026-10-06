import { AppFilterRule, FilterResult, ForwardingSettings, IncomingMessagePayload } from '../types';

/**
 * Extract 4-8 digit OTP / Verification codes from text
 */
export function extractOtpCode(text: string): string | undefined {
  if (!text) return undefined;

  // Common OTP indicators in Russian & English
  const otpSignalRegex = /(?:код|code|пароль|pass|подтвержд|auth|verif|смс-код|sms-code|security|pin|пин|вход|одноразовый|secure|confirmation)/i;
  const hasSignal = otpSignalRegex.test(text);

  // Look for patterns like "код: 1234", "код 123456", "123-456", "Ваш пароль 9821"
  const signaledPatterns = [
    /(?:код(?: подтверждения| для входа| авторизации)?|code|пароль|pin|пин)[\s:—–-]+([0-9]{4,8})/i,
    /([0-9]{4,8})[\s:—–-]+(?:ваш |is your )?(?:код|code|пароль)/i,
    /(?:код|code)[\s:—–-]+([0-9]{3}[-\s][0-9]{3})/i,
  ];

  for (const pattern of signaledPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/\s/g, '');
    }
  }

  // If signal exists, look for standalone 4 to 8 digit numbers that are not years or phone numbers
  if (hasSignal) {
    const genericMatches = text.match(/\b([0-9]{4,8})\b/g);
    if (genericMatches) {
      for (const m of genericMatches) {
        const num = parseInt(m, 10);
        // Exclude current/adjacent years
        if (num >= 2020 && num <= 2030 && m.length === 4) continue;
        // Exclude common round numbers like 1000, 5000 (often amounts)
        if (num % 500 === 0 && num > 1000) continue;
        return m;
      }
    }
  }

  return undefined;
}

/**
 * Mask card numbers to protect sensitive financial data
 */
export function maskSensitiveNumbers(text: string): string {
  if (!text) return text;
  // Mask 16-digit PAN: 4276 1234 5678 9012 -> 4276 **** **** 9012
  return text.replace(/\b(\d{4})[\s-]?\d{4}[\s-]?\d{4}[\s-]?(\d{4})\b/g, '$1 **** **** $2');
}

/**
 * Find matching rule by package name or app name
 */
export function findMatchingRule(
  payload: IncomingMessagePayload,
  rules: AppFilterRule[]
): AppFilterRule | undefined {
  const pkg = payload.packageName?.trim().toLowerCase();
  const name = payload.appName?.trim().toLowerCase();

  // If it's an SMS and no specific package was sent or matches generic SMS packages
  if (payload.type === 'sms' && (!pkg || pkg.includes('mms') || pkg.includes('messaging'))) {
    const smsRule = rules.find((r) => r.category === 'sms' && r.enabled);
    if (smsRule) return smsRule;
  }

  if (pkg) {
    const ruleByPkg = rules.find((r) => r.packageName.toLowerCase() === pkg);
    if (ruleByPkg) return ruleByPkg;
  }

  if (name) {
    const ruleByName = rules.find((r) => r.name.toLowerCase() === name);
    if (ruleByName) return ruleByName;
  }

  return undefined;
}

/**
 * Core evaluation engine to decide whether to forward a message
 */
export function evaluateMessage(
  payload: IncomingMessagePayload,
  rules: AppFilterRule[],
  settings: ForwardingSettings,
  recentHashes: Map<string, number> = new Map()
): FilterResult {
  const text = (payload.text || '').trim();
  const title = (payload.title || '').trim();
  const sender = (payload.sender || '').trim();
  const combinedText = `${title} ${text}`.trim();
  const now = Date.now();

  // 0. Master switches: check if main forwarding service is running
  if (settings.serviceRunning === false) {
    return {
      allowed: false,
      reason: 'Заблокировано: Главный сервис пересылки приостановлен на главной странице',
      formattedText: '',
      silent: false,
    };
  }

  const isSms = Boolean(payload.type === 'sms' || (!payload.packageName && payload.sender));
  if (isSms && settings.forwardSmsEnabled === false) {
    return {
      allowed: false,
      reason: 'Заблокировано: Главный переключатель "Пересылка SMS" выключен в панели управления',
      formattedText: '',
      silent: false,
    };
  }

  if (!isSms && settings.forwardPushEnabled === false) {
    return {
      allowed: false,
      reason: 'Заблокировано: Главный переключатель "Пересылка уведомлений (push)" выключен в панели управления',
      formattedText: '',
      silent: false,
    };
  }

  // 1. Check Ongoing notifications (e.g. music playing, download running)
  if (payload.isOngoing && settings.ignoreOngoing) {
    return {
      allowed: false,
      reason: 'Заблокировано: Постоянное / фоновое уведомление (isOngoing=true)',
      formattedText: '',
      silent: false,
    };
  }

  // 2. Check Duplicate Suppression
  const textHash = `${payload.packageName || payload.type}_${sender}_${text}`;
  const lastSeen = recentHashes.get(textHash);
  if (lastSeen && now - lastSeen < settings.blockDuplicatesSec * 1000) {
    return {
      allowed: false,
      reason: `Заблокировано: Дубликат уведомления (получено ${Math.round((now - lastSeen) / 1000)}с назад)`,
      formattedText: '',
      silent: false,
    };
  }

  // 3. SIM Slot check
  if (settings.simFilter !== 'all' && payload.simSlot !== undefined) {
    const expectedSlot = settings.simFilter === 'sim1' ? 1 : 2;
    if (payload.simSlot !== expectedSlot) {
      return {
        allowed: false,
        reason: `Заблокировано: Фильтр SIM-карт настроен на ${settings.simFilter.toUpperCase()}, получено на SIM ${payload.simSlot}`,
        formattedText: '',
        silent: false,
      };
    }
  }

  // 4. Find rule for this application
  const matchedRule = findMatchingRule(payload, rules);

  if (settings.globalFilterMode === 'whitelist') {
    if (!matchedRule) {
      return {
        allowed: false,
        reason: `Заблокировано: Приложение [${payload.appName || payload.packageName || 'Неизвестно'}] не добавлено в Белый список`,
        formattedText: '',
        silent: false,
      };
    }
    if (!matchedRule.enabled) {
      return {
        allowed: false,
        reason: `Заблокировано: Приложение [${matchedRule.name}] отключено в Белом списке`,
        formattedText: '',
        silent: false,
        matchedRule,
      };
    }
  } else {
    // Blacklist mode: forward all unless explicitly disabled in list
    if (matchedRule && !matchedRule.enabled) {
      return {
        allowed: false,
        reason: `Заблокировано: Приложение [${matchedRule.name}] находится в Чёрном списке`,
        formattedText: '',
        silent: false,
        matchedRule,
      };
    }
  }

  // 5. Exclude keywords check
  if (matchedRule && matchedRule.excludeKeywords && matchedRule.excludeKeywords.length > 0) {
    for (const kw of matchedRule.excludeKeywords) {
      const trimmed = kw.trim().toLowerCase();
      if (trimmed && combinedText.toLowerCase().includes(trimmed)) {
        return {
          allowed: false,
          reason: `Заблокировано: Сработало слово-исключение "${kw}" для ${matchedRule.name}`,
          formattedText: '',
          silent: false,
          matchedRule,
        };
      }
    }
  }

  // 6. Sender filter check (if rule specifies a sender whitelist)
  if (matchedRule && matchedRule.senderFilter && matchedRule.senderFilter.trim()) {
    const allowedSenders = matchedRule.senderFilter
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const matchesSender = allowedSenders.some((s) => sender.toLowerCase().includes(s));
    if (!matchesSender) {
      return {
        allowed: false,
        reason: `Заблокировано: Отправитель "${sender}" не совпадает с фильтром отправителей (${matchedRule.senderFilter})`,
        formattedText: '',
        silent: false,
        matchedRule,
      };
    }
  }

  // 7. Regex filter
  if (matchedRule && matchedRule.filterMode === 'regex' && matchedRule.regexPattern) {
    try {
      const regex = new RegExp(matchedRule.regexPattern, 'i');
      if (!regex.test(combinedText)) {
        return {
          allowed: false,
          reason: `Заблокировано: Текст не соответствует регулярному выражению /${matchedRule.regexPattern}/i`,
          formattedText: '',
          silent: false,
          matchedRule,
        };
      }
    } catch {
      // Regex invalid, ignore or log
    }
  }

  // 8. Keyword include filter
  if (matchedRule && matchedRule.filterMode === 'keywords' && matchedRule.keywords.length > 0) {
    const hasKeyword = matchedRule.keywords.some((kw) => {
      const t = kw.trim().toLowerCase();
      return t && combinedText.toLowerCase().includes(t);
    });

    if (!hasKeyword) {
      return {
        allowed: false,
        reason: `Заблокировано: Не найдено ни одного ключевого слова из списка (${matchedRule.keywords.join(', ')})`,
        formattedText: '',
        silent: false,
        matchedRule,
      };
    }
  }

  // 9. OTP / 2FA extraction
  const shouldExtractOtp = matchedRule ? matchedRule.extractOtp : true;
  const otpCode = shouldExtractOtp ? extractOtpCode(combinedText) : undefined;

  // 10. OTP-only Mode (either per app or global)
  const isOtpOnly = (matchedRule && matchedRule.filterMode === 'otp_only') || settings.otpOnlyGlobal;
  if (isOtpOnly && !otpCode) {
    return {
      allowed: false,
      reason: 'Заблокировано: Включен режим "Только коды 2FA / OTP", но код в сообщении не обнаружен',
      formattedText: '',
      silent: false,
      matchedRule,
    };
  }

  // 11. Format final Telegram message
  const appDisplayName = matchedRule ? matchedRule.name : payload.appName || payload.packageName || (payload.type === 'sms' ? 'SMS' : 'Уведомление');
  const safeText = settings.maskSensitiveDigits ? maskSensitiveNumbers(text) : text;
  const safeTitle = settings.maskSensitiveDigits ? maskSensitiveNumbers(title) : title;
  const operatorName = payload.operator || (payload.simSlot === 2 ? settings.sim2OperatorName : settings.sim1OperatorName || 'МТС');

  const formattedText = formatTelegramMessage({
    appDisplayName,
    title: safeTitle,
    text: safeText,
    sender,
    otpCode,
    operator: operatorName,
    simSlot: payload.simSlot,
    timestamp: payload.timestamp || now,
    settings,
    isSms,
    customFormat: matchedRule?.customFormat,
  });

  return {
    allowed: true,
    reason: `Разрешено: Сообщение от [${appDisplayName}] успешно прошло все фильтры${otpCode ? ` (Найден код: ${otpCode})` : ''}`,
    otpCode,
    formattedText,
    silent: matchedRule?.silent ?? false,
    matchedRule,
  };
}

/**
 * Formats Telegram HTML message
 */
export function formatTelegramMessage(params: {
  appDisplayName: string;
  title: string;
  text: string;
  sender: string;
  otpCode?: string;
  operator?: string;
  simSlot?: number;
  timestamp: number;
  settings: ForwardingSettings;
  isSms?: boolean;
  customFormat?: string;
}): string {
  const {
    appDisplayName,
    title,
    text,
    sender,
    otpCode,
    operator,
    timestamp,
    settings,
    isSms,
    customFormat,
  } = params;

  // Helper to escape HTML entities for Telegram HTML parse_mode
  const escapeHtml = (str: string) => {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  const escapedApp = escapeHtml(appDisplayName);
  const escapedSender = escapeHtml(sender);
  const escapedTitle = escapeHtml(title);
  const escapedText = escapeHtml(text);
  const escapedOperator = escapeHtml(operator || settings.sim1OperatorName || 'МТС');

  const timeStr = new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateStr = new Date(timestamp).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // OTP highlight block
  const otpBlock = otpCode
    ? (settings.otpHighlightTemplate || '🔑 Код: <code>{otp_code}</code>').replace(/\{otp_code\}/g, otpCode)
    : '';

  // Footer metadata
  const metaParts: string[] = [];
  if (settings.showOperator && escapedOperator) {
    metaParts.push(`📶 ${escapedOperator}`);
  }
  if (settings.showTimestamp) {
    metaParts.push(`⏰ ${timeStr}`);
  }
  const metaFooter = metaParts.length > 0 ? `<pre>${metaParts.join('  ·  ')}</pre>` : '';

  // Replace all aliases for template variables (both snake_case and camelCase)
  const applyVariables = (tpl: string) => {
    return tpl
      .replace(/\{(?:app_name|appName)\}/gi, escapedApp)
      .replace(/\{(?:sender)\}/gi, escapedSender)
      .replace(/\{(?:sender_info|senderInfo)\}/gi, senderInfo)
      .replace(/\{(?:title)\}/gi, escapedTitle)
      .replace(/\{(?:text|message|body)\}/gi, escapedText)
      .replace(/\{(?:otp_code|otpCode)\}/gi, otpCode || '')
      .replace(/\{(?:otp_block|otpBlock)\}/gi, otpBlock ? `${otpBlock}\n` : '')
      .replace(/\{(?:operator|simOperator|carrier)\}/gi, escapedOperator)
      .replace(/\{(?:time|timestamp)\}/gi, timeStr)
      .replace(/\{(?:date)\}/gi, dateStr)
      .replace(/\{(?:meta_footer|metaFooter|footer)\}/gi, metaFooter);
  };

  // Custom app format override
  if (customFormat && customFormat.trim()) {
    return applyVariables(customFormat).replace(/\n{3,}/g, '\n\n').trim();
  }

  // Template based formatting (SMS vs Push)
  const template = isSms
    ? (settings.smsTemplate || '💬 <b>[SMS]</b> {sender}\n{text}\n\n{otp_block}{meta_footer}')
    : (settings.pushTemplate || '📲 <b>[{app_name}]</b> {sender_info}\n{text}\n\n{otp_block}{meta_footer}');

  const senderInfo = escapedSender ? `· <i>${escapedSender}</i>` : '';

  let output = applyVariables(template);

  // Clean extra blank lines
  return output.replace(/\n{3,}/g, '\n\n').trim();
}
