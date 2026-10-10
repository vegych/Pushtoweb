export interface BotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}

export interface DetectedUser {
  chatId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  lastMessage?: string;
  date?: number;
}

/**
 * Validates bot token by calling getMe
 */
export async function testBotToken(
  token: string,
  apiEndpoint: string = 'https://api.telegram.org'
): Promise<{ success: boolean; bot?: BotInfo; error?: string }> {
  const cleanToken = token.trim();
  const endpoint = (apiEndpoint || 'https://api.telegram.org').replace(/\/+$/, '');
  if (!cleanToken) {
    return { success: false, error: 'Токен бота не указан' };
  }

  try {
    const res = await fetch(`${endpoint}/bot${cleanToken}/getMe`);
    const data = await res.json();
    if (data.ok && data.result) {
      return { success: true, bot: data.result };
    }
    return { success: false, error: data.description || 'Неверный токен бота' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Ошибка сети при обращении к Telegram API' };
  }
}

/**
 * Reads getUpdates to find recent users who interacted with the bot (e.g. sent /start)
 */
export async function detectRecentChat(
  token: string,
  apiEndpoint: string = 'https://api.telegram.org'
): Promise<{ success: boolean; user?: DetectedUser; allUsers?: DetectedUser[]; error?: string }> {
  const cleanToken = token.trim();
  const endpoint = (apiEndpoint || 'https://api.telegram.org').replace(/\/+$/, '');
  if (!cleanToken) {
    return { success: false, error: 'Токен бота не указан' };
  }

  try {
    const res = await fetch(`${endpoint}/bot${cleanToken}/getUpdates?limit=20&allowed_updates=["message","channel_post"]`);
    const data = await res.json();
    if (!data.ok) {
      return { success: false, error: data.description || 'Не удалось получить обновления бота' };
    }

    const updates = data.result || [];
    if (updates.length === 0) {
      return {
        success: false,
        error: 'В боте пока нет новых сообщений. Откройте вашего бота в Telegram, нажмите СТАРТ (/start) и повторите попытку.',
      };
    }

    const usersMap = new Map<string, DetectedUser>();

    // Process from newest to oldest
    for (let i = updates.length - 1; i >= 0; i--) {
      const u = updates[i];
      const msg = u.message || u.channel_post || u.edited_message;
      if (msg && msg.chat) {
        const id = String(msg.chat.id);
        if (!usersMap.has(id)) {
          usersMap.set(id, {
            chatId: id,
            firstName: msg.from?.first_name || msg.chat.title || 'Пользователь',
            lastName: msg.from?.last_name,
            username: msg.from?.username || msg.chat.username,
            lastMessage: msg.text || '(сообщение без текста)',
            date: msg.date,
          });
        }
      }
    }

    const allUsers = Array.from(usersMap.values());
    if (allUsers.length > 0) {
      return { success: true, user: allUsers[0], allUsers };
    }

    return {
      success: false,
      error: 'Сообщений от пользователей не найдено. Напишите боту любое сообщение или команду /start.',
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Ошибка запроса к Telegram API' };
  }
}

/**
 * Send formatted message to Telegram chat
 */
export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  silent: boolean = false,
  apiEndpoint: string = 'https://api.telegram.org'
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const cleanToken = token.trim();
  const cleanChatId = chatId.trim();
  const endpoint = (apiEndpoint || 'https://api.telegram.org').replace(/\/+$/, '');

  if (!cleanToken || !cleanChatId) {
    return { success: false, error: 'Не указан токен бота или Chat ID' };
  }

  try {
    // First attempt with HTML formatting
    const res = await fetch(`${endpoint}/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: 'HTML',
        disable_notification: silent,
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (data.ok && data.result) {
      return { success: true, messageId: data.result.message_id };
    }

    // If HTML parsing failed, fallback to plain text stripping HTML tags
    if (data.description && data.description.includes('can\'t parse entities')) {
      const strippedText = text.replace(/<[^>]+>/g, '');
      const fallbackRes = await fetch(`${endpoint}/bot${cleanToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: strippedText,
          disable_notification: silent,
        }),
      });
      const fallbackData = await fallbackRes.json();
      if (fallbackData.ok && fallbackData.result) {
        return { success: true, messageId: fallbackData.result.message_id };
      }
      return { success: false, error: fallbackData.description || 'Ошибка отправки сообщения' };
    }

    return { success: false, error: data.description || 'Ошибка отправки сообщения' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Ошибка сети при отправке в Telegram' };
  }
}

export interface BotMetadataConfig {
  name?: string;
  description?: string;
  shortDescription?: string;
}

/**
 * Automatically sets bot display name, description and short description
 */
export async function setBotMetadata(
  token: string,
  config: BotMetadataConfig,
  apiEndpoint: string = 'https://api.telegram.org'
): Promise<{ success: boolean; results: { [key: string]: boolean }; error?: string }> {
  const cleanToken = token.trim();
  const endpoint = (apiEndpoint || 'https://api.telegram.org').replace(/\/+$/, '');
  if (!cleanToken) {
    return { success: false, results: {}, error: 'Токен бота не указан' };
  }

  const results: { [key: string]: boolean } = {};
  const errors: string[] = [];

  // 1. Set Name
  if (config.name !== undefined) {
    try {
      const res = await fetch(`${endpoint}/bot${cleanToken}/setMyName`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: config.name }),
      });
      const data = await res.json();
      results.name = Boolean(data.ok && data.result);
      if (!data.ok) errors.push(`Имя: ${data.description || 'ошибка'}`);
    } catch (e: any) {
      results.name = false;
      errors.push(`Имя: ${e.message}`);
    }
  }

  // 2. Set Description (chat empty screen)
  if (config.description !== undefined) {
    try {
      const res = await fetch(`${endpoint}/bot${cleanToken}/setMyDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: config.description }),
      });
      const data = await res.json();
      results.description = Boolean(data.ok && data.result);
      if (!data.ok) errors.push(`Описание: ${data.description || 'ошибка'}`);
    } catch (e: any) {
      results.description = false;
      errors.push(`Описание: ${e.message}`);
    }
  }

  // 3. Set Short Description (profile & share link)
  if (config.shortDescription !== undefined) {
    try {
      const res = await fetch(`${endpoint}/bot${cleanToken}/setMyShortDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_description: config.shortDescription }),
      });
      const data = await res.json();
      results.shortDescription = Boolean(data.ok && data.result);
      if (!data.ok) errors.push(`Краткое описание: ${data.description || 'ошибка'}`);
    } catch (e: any) {
      results.shortDescription = false;
      errors.push(`Краткое описание: ${e.message}`);
    }
  }

  const success = Object.values(results).some(Boolean);
  return {
    success,
    results,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

/**
 * Automatically sets bot profile photo (avatar) using image Blob or File (JPEG required by Telegram API)
 */
export async function setBotProfilePhoto(
  token: string,
  photoBlob: Blob,
  apiEndpoint: string = 'https://api.telegram.org'
): Promise<{ success: boolean; error?: string }> {
  const cleanToken = token.trim();
  const endpoint = (apiEndpoint || 'https://api.telegram.org').replace(/\/+$/, '');
  if (!cleanToken) {
    return { success: false, error: 'Токен бота не указан' };
  }

  try {
    const formData = new FormData();
    // Telegram setMyProfilePhoto expects photo: InputProfilePhotoStatic with attach:// syntax
    formData.append(
      'photo',
      JSON.stringify({
        type: 'static',
        photo: 'attach://bot_avatar',
      })
    );
    formData.append('bot_avatar', photoBlob, 'avatar.jpg');

    const res = await fetch(`${endpoint}/bot${cleanToken}/setMyProfilePhoto`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (data.ok && data.result) {
      return { success: true };
    }
    return {
      success: false,
      error: data.description || 'Не удалось установить аватарку бота в Telegram',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Ошибка сети при отправке фото в Telegram',
    };
  }
}
