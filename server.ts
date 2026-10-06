import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PREDEFINED_APPS, DEFAULT_SETTINGS } from './src/data/predefinedApps.js';
import { evaluateMessage } from './src/utils/filterEngine.js';
import { sendTelegramMessage, testBotToken, detectRecentChat } from './src/services/telegram.js';
import { ForwardedMessageLog, ForwardingSettings, AppFilterRule, IncomingMessagePayload } from './src/types/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory runtime state (can sync with client)
let serverSettings: ForwardingSettings = { ...DEFAULT_SETTINGS };
let serverRules: AppFilterRule[] = [...PREDEFINED_APPS];
let serverLogs: ForwardedMessageLog[] = [];
const recentHashes = new Map<string, number>();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON and URL-encoded body parser
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // CORS for external device webhooks
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      configured: Boolean(serverSettings.telegramBotToken && serverSettings.telegramChatId),
      logsCount: serverLogs.length,
      timestamp: Date.now(),
    });
  });

  // Settings sync
  app.get('/api/settings', (req, res) => {
    res.json(serverSettings);
  });

  app.post('/api/settings', (req, res) => {
    serverSettings = { ...serverSettings, ...req.body };
    res.json({ success: true, settings: serverSettings });
  });

  // Rules sync
  app.get('/api/rules', (req, res) => {
    res.json(serverRules);
  });

  app.post('/api/rules', (req, res) => {
    if (Array.isArray(req.body)) {
      serverRules = req.body;
    }
    res.json({ success: true, count: serverRules.length });
  });

  // Logs
  app.get('/api/logs', (req, res) => {
    res.json(serverLogs.slice(0, 100));
  });

  app.post('/api/logs/clear', (req, res) => {
    serverLogs = [];
    res.json({ success: true });
  });

  // Apps Sync endpoint: device can send full package list
  app.post('/api/apps/sync', (req, res) => {
    const incomingApps = req.body.apps;
    if (Array.isArray(incomingApps)) {
      const existingMap = new Map(serverRules.map((r) => [r.packageName.toLowerCase(), r]));
      for (const item of incomingApps) {
        if (!item.packageName) continue;
        const pkgLower = item.packageName.toLowerCase();
        if (existingMap.has(pkgLower)) {
          const rule = existingMap.get(pkgLower)!;
          rule.installedOnDevice = true;
          if (item.name && rule.name.includes('.')) rule.name = item.name;
        } else {
          const newRule: AppFilterRule = {
            id: 'dev_' + Math.random().toString(36).substring(2, 9),
            name: item.name || item.packageName,
            packageName: item.packageName,
            category: item.category || 'custom',
            enabled: item.enabled ?? false,
            filterMode: 'all',
            keywords: [],
            excludeKeywords: [],
            extractOtp: true,
            silent: false,
            discoveredFromDevice: true,
            installedOnDevice: true,
          };
          serverRules.push(newRule);
          existingMap.set(pkgLower, newRule);
        }
      }
    }
    res.json({ success: true, total: serverRules.length });
  });

  // Telegram bot test
  app.post('/api/telegram/test', async (req, res) => {
    const token = req.body.token || serverSettings.telegramBotToken;
    const chatId = req.body.chatId || serverSettings.telegramChatId;
    const endpoint = req.body.apiEndpoint || serverSettings.telegramApiEndpoint || 'https://api.telegram.org';
    const text = req.body.text || '🔔 <b>Тестовое уведомление от SMS Forwarder!</b>\n\nБот и пересылка настроены успешно. Вы будете получать сообщения и пуши в этот чат.';

    const tokenRes = await testBotToken(token, endpoint);
    if (!tokenRes.success) {
      res.status(400).json(tokenRes);
      return;
    }

    if (!chatId) {
      res.json({ success: true, bot: tokenRes.bot, warning: 'Chat ID не указан для тестового сообщения' });
      return;
    }

    const sendRes = await sendTelegramMessage(token, chatId, text, false, endpoint);
    res.json({
      success: sendRes.success,
      bot: tokenRes.bot,
      messageId: sendRes.messageId,
      error: sendRes.error,
    });
  });

  // Auto-detect chat ID
  app.get('/api/telegram/detect', async (req, res) => {
    const token = (req.query.token as string) || serverSettings.telegramBotToken;
    const endpoint = (req.query.apiEndpoint as string) || serverSettings.telegramApiEndpoint || 'https://api.telegram.org';
    const detectRes = await detectRecentChat(token, endpoint);
    res.json(detectRes);
  });

  /**
   * Main Webhook Endpoint for mobile devices (MacroDroid, Tasker, custom script)
   * URL: POST /api/forward?key=<gatewayApiKey>
   */
  app.post('/api/forward', async (req, res) => {
    const providedKey = (req.query.key as string) || req.headers['x-api-key'] || req.body.apiKey;

    // Validate gateway API key if one is set
    if (serverSettings.gatewayApiKey && serverSettings.gatewayApiKey.trim() !== '') {
      if (providedKey !== serverSettings.gatewayApiKey) {
        res.status(401).json({
          success: false,
          error: 'Неверный API ключ шлюза (Invalid Gateway API key)',
        });
        return;
      }
    }

    const payload: IncomingMessagePayload = {
      type: req.body.type || (req.body.sender ? 'sms' : 'notification'),
      packageName: req.body.packageName || req.body.package || req.body.appPackage,
      appName: req.body.appName || req.body.app_name || req.body.app,
      sender: req.body.sender || req.body.from || req.body.contact,
      title: req.body.title || req.body.header || '',
      text: req.body.text || req.body.body || req.body.message || '',
      timestamp: req.body.timestamp ? Number(req.body.timestamp) : Date.now(),
      simSlot: req.body.simSlot ? Number(req.body.simSlot) : req.body.sim ? Number(req.body.sim) : undefined,
      operator: req.body.operator || req.body.simOperator || req.body.carrier || req.body.sim_operator,
      isOngoing: Boolean(req.body.isOngoing || req.body.ongoing),
    };

    if (!payload.text && !payload.title) {
      res.status(400).json({
        success: false,
        error: 'Отсутствует текст сообщения (text or title is required)',
      });
      return;
    }

    // Evaluate message against filters
    const filterRes = evaluateMessage(payload, serverRules, serverSettings, recentHashes);

    // Save hash for duplicate detection if allowed
    const textHash = `${payload.packageName || payload.type}_${payload.sender}_${payload.text}`;
    recentHashes.set(textHash, Date.now());

    // Clean up old hashes (> 5 minutes)
    if (recentHashes.size > 500) {
      const now = Date.now();
      for (const [k, time] of recentHashes.entries()) {
        if (now - time > 300000) recentHashes.delete(k);
      }
    }

    const logEntry: ForwardedMessageLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: payload.timestamp || Date.now(),
      type: payload.type || 'notification',
      packageName: payload.packageName || '',
      appName: payload.appName || filterRes.matchedRule?.name || (payload.type === 'sms' ? 'SMS' : 'Уведомление'),
      sender: payload.sender || '',
      title: payload.title || '',
      text: payload.text,
      otpCode: filterRes.otpCode,
      simSlot: payload.simSlot,
      operator: payload.operator || (payload.simSlot === 2 ? serverSettings.sim2OperatorName : serverSettings.sim1OperatorName || 'МТС'),
      status: filterRes.allowed ? 'forwarded' : 'blocked',
      blockedReason: filterRes.allowed ? undefined : filterRes.reason,
      matchedRuleId: filterRes.matchedRule?.id,
      rawPayload: req.body,
    };

    if (!filterRes.allowed) {
      serverLogs.unshift(logEntry);
      if (serverLogs.length > 200) serverLogs.pop();

      res.json({
        success: true,
        forwarded: false,
        reason: filterRes.reason,
        logId: logEntry.id,
      });
      return;
    }

    // Forward to Telegram
    if (!serverSettings.telegramBotToken || !serverSettings.telegramChatId) {
      logEntry.status = 'error';
      logEntry.errorDetails = 'Бот Telegram или Chat ID не настроены в панели управления';
      serverLogs.unshift(logEntry);
      if (serverLogs.length > 200) serverLogs.pop();

      res.status(500).json({
        success: false,
        forwarded: false,
        error: 'Бот Telegram не настроен. Укажите Bot Token и Chat ID в панели управления.',
        logId: logEntry.id,
      });
      return;
    }

    // Auto-discover package from incoming device message if new
    if (payload.packageName) {
      const exists = serverRules.some(
        (r) => r.packageName.toLowerCase() === payload.packageName!.toLowerCase()
      );
      if (!exists) {
        serverRules.push({
          id: 'dev_' + Math.random().toString(36).substring(2, 9),
          name: payload.appName || payload.packageName,
          packageName: payload.packageName,
          category: payload.type === 'sms' ? 'sms' : 'custom',
          enabled: true,
          filterMode: 'all',
          keywords: [],
          excludeKeywords: [],
          extractOtp: true,
          silent: false,
          discoveredFromDevice: true,
          installedOnDevice: true,
        });
      }
    }

    const tgRes = await sendTelegramMessage(
      serverSettings.telegramBotToken,
      serverSettings.telegramChatId,
      filterRes.formattedText,
      filterRes.silent,
      serverSettings.telegramApiEndpoint || 'https://api.telegram.org'
    );

    if (tgRes.success) {
      logEntry.status = 'forwarded';
      logEntry.telegramMessageId = tgRes.messageId;
    } else {
      logEntry.status = 'error';
      logEntry.errorDetails = tgRes.error;
    }

    serverLogs.unshift(logEntry);
    if (serverLogs.length > 200) serverLogs.pop();

    res.json({
      success: tgRes.success,
      forwarded: tgRes.success,
      otpCode: filterRes.otpCode,
      telegramMessageId: tgRes.messageId,
      error: tgRes.error,
      logId: logEntry.id,
    });
  });

  // MacroDroid ready-to-import configuration file download
  app.get('/api/export/macrodroid', (req, res) => {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const webhookUrl = `${protocol}://${host}/api/forward?key=${serverSettings.gatewayApiKey}`;

    const macroTemplate = {
      name: "SMS & Push to Telegram Forwarder",
      description: "Автоматическая пересылка СМС и уведомлений в Telegram через шлюз " + host,
      exportedAt: new Date().toISOString(),
      webhookUrl: webhookUrl,
      apiKey: serverSettings.gatewayApiKey,
      instructions: [
        "1. Установите бесплатное приложение MacroDroid из Google Play",
        "2. Создайте макрос с Триггерами: 'Получено SMS' и 'Получено уведомление'",
        "3. Добавьте Действие: 'HTTP-запрос (POST)' на URL: " + webhookUrl,
        "4. В теле запроса выберите JSON и добавьте поля: text, sender, appName, packageName"
      ],
      samplePayload: {
        type: "{trigger_type}",
        packageName: "{package_name}",
        appName: "{app_name}",
        sender: "{sms_from}",
        title: "{notification_title}",
        text: "{sms_body}{notification_text}",
        simSlot: 1,
        operator: "{sim_operator_name}"
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="sms_forwarder_macrodroid.json"');
    res.send(JSON.stringify(macroTemplate, null, 2));
  });

  // Full Native Android Studio Project ZIP Download (Autonomous Service)
  app.get('/api/export/android-project.zip', async (req, res) => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const webhookUrl = `${protocol}://${host}/api/forward?key=${serverSettings.gatewayApiKey}`;
      const botToken = serverSettings.telegramBotToken || "";
      const chatId = serverSettings.telegramChatId || "";
      const apiEndpoint = serverSettings.telegramApiEndpoint || "https://api.telegram.org";

      // 1. Root files
      zip.file("settings.gradle.kts", `
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "PushToWeb"
include(":app")
      `.trim());

      zip.file("build.gradle.kts", `
plugins {
    id("com.android.application") version "8.5.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.24" apply false
}
      `.trim());

      // 2. app/build.gradle.kts
      zip.file("app/build.gradle.kts", `
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ru.smsforwarder.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "ru.smsforwarder.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
      `.trim());

      // 3. AndroidManifest.xml
      zip.file("app/src/main/AndroidManifest.xml", `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.RECEIVE_SMS" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@android:drawable/ic_dialog_email"
        android:label="SMS &amp; Push Forwarder"
        android:roundIcon="@android:drawable/ic_dialog_email"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.AppCompat.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Foreground Keep-Alive Service -->
        <service
            android:name=".ForwarderForegroundService"
            android:foregroundServiceType="dataSync"
            android:exported="false" />

        <!-- Notification Listener Service (Intercepts banking & app push notifications) -->
        <service
            android:name=".NotificationForwarderService"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

        <!-- SMS Broadcast Receiver -->
        <receiver
            android:name=".SmsBroadcastReceiver"
            android:exported="true"
            android:permission="android.permission.BROADCAST_SMS">
            <intent-filter android:priority="999">
                <action android:name="android.provider.Telephony.SMS_RECEIVED" />
            </intent-filter>
        </receiver>

        <!-- Boot Receiver to auto-start service on phone reboot -->
        <receiver
            android:name=".BootReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>

    </application>

</manifest>`.trim());

      // 4. Config.kt
      zip.file("app/src/main/java/ru/smsforwarder/app/Config.kt", `package ru.smsforwarder.app

object Config {
    const val APP_WEB_URL = "${protocol}://${host}"
    const val WEBHOOK_URL = "${webhookUrl}"
    const val TELEGRAM_BOT_TOKEN = "${botToken}"
    const val TELEGRAM_CHAT_ID = "${chatId}"
    const val TELEGRAM_API_ENDPOINT = "${apiEndpoint}"
}
`.trim());

      // 5. TelegramSender.kt
      zip.file("app/src/main/java/ru/smsforwarder/app/TelegramSender.kt", `package ru.smsforwarder.app

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object TelegramSender {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    fun forwardPayload(
        type: String,
        sender: String,
        text: String,
        appName: String = "",
        packageName: String = "",
        title: String = "",
        operator: String = ""
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val json = JSONObject().apply {
                    put("type", type)
                    put("sender", sender)
                    put("text", text)
                    put("appName", appName)
                    put("packageName", packageName)
                    put("title", title)
                    put("operator", operator)
                    put("timestamp", System.currentTimeMillis())
                }

                // 1. Отправка на персональный сервер-шлюз
                if (Config.WEBHOOK_URL.isNotEmpty()) {
                    val mediaType = "application/json; charset=utf-8".toMediaType()
                    val body = json.toString().toRequestBody(mediaType)
                    val request = Request.Builder()
                        .url(Config.WEBHOOK_URL)
                        .post(body)
                        .build()
                    client.newCall(request).execute().close()
                }

                // 2. Прямая отправка в Telegram
                if (Config.TELEGRAM_BOT_TOKEN.isNotEmpty() && Config.TELEGRAM_CHAT_ID.isNotEmpty()) {
                    val messageText = buildString {
                        if (type == "sms") {
                            append("💬 <b>[SMS]</b> <code>$sender</code>\\n")
                        } else {
                            append("📲 <b>[\${appName.ifEmpty { "Уведомление" }}]</b> · <i>$sender</i>\\n")
                        }
                        if (title.isNotEmpty() && title != sender && title != appName) {
                            append("<b>$title</b>\\n")
                        }
                        append("$text\\n")
                        if (operator.isNotEmpty()) {
                            append("\\n<pre>📶 $operator</pre>")
                        }
                    }

                    val tgJson = JSONObject().apply {
                        put("chat_id", Config.TELEGRAM_CHAT_ID)
                        put("text", messageText)
                        put("parse_mode", "HTML")
                    }

                    val tgUrl = "\${Config.TELEGRAM_API_ENDPOINT.trimEnd('/')}/bot\${Config.TELEGRAM_BOT_TOKEN}/sendMessage"
                    val tgBody = tgJson.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
                    val tgRequest = Request.Builder().url(tgUrl).post(tgBody).build()
                    client.newCall(tgRequest).execute().close()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
`.trim());

      // 6. NotificationForwarderService.kt
      zip.file("app/src/main/java/ru/smsforwarder/app/NotificationForwarderService.kt", `package ru.smsforwarder.app

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class NotificationForwarderService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        // Пропускаем служебные системные уведомления самого приложения
        if (sbn.packageName == packageName) return

        val extras = sbn.notification.extras ?: return
        val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val appPackage = sbn.packageName ?: ""

        // Получаем имя приложения
        val pm = applicationContext.packageManager
        val appName = try {
            val appInfo = pm.getApplicationInfo(appPackage, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            appPackage
        }

        if (text.isNotEmpty() || title.isNotEmpty()) {
            TelegramSender.forwardPayload(
                type = "notification",
                sender = title.ifEmpty { appName },
                text = text,
                appName = appName,
                packageName = appPackage,
                title = title
            )
        }
    }
}
`.trim());

      // 7. SmsBroadcastReceiver.kt
      zip.file("app/src/main/java/ru/smsforwarder/app/SmsBroadcastReceiver.kt", `package ru.smsforwarder.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.telephony.TelephonyManager

class SmsBroadcastReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            val tm = context?.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
            val operatorName = tm?.networkOperatorName ?: ""

            for (sms in messages) {
                val sender = sms.originatingAddress ?: "SMS"
                val body = sms.messageBody ?: ""

                TelegramSender.forwardPayload(
                    type = "sms",
                    sender = sender,
                    text = body,
                    appName = "SMS",
                    packageName = "com.android.sms",
                    operator = operatorName
                )
            }
        }
    }
}
`.trim());

      // 8. ForwarderForegroundService.kt (Keep-alive in Background with Dynamic Status Bar Notification)
      zip.file("app/src/main/java/ru/smsforwarder/app/ForwarderForegroundService.kt", `package ru.smsforwarder.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class ForwarderForegroundService : Service() {
    companion object {
        const val CHANNEL_ID = "sms_forwarder_fg_channel"
        const val NOTIFICATION_ID = 1001

        private const val PREFS_NAME = "forwarder_service_prefs"
        private const val KEY_SERVICE_RUNNING = "key_service_running"
        private const val KEY_SMS_ENABLED = "key_sms_enabled"
        private const val KEY_PUSH_ENABLED = "key_push_enabled"
        private const val KEY_SHOW_NOTIF = "key_show_notif"

        fun start(context: Context) {
            val intent = Intent(context, ForwarderForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, ForwarderForegroundService::class.java)
            context.stopService(intent)
        }

        fun updateStatus(
            context: Context,
            serviceRunning: Boolean,
            smsEnabled: Boolean,
            pushEnabled: Boolean,
            showNotification: Boolean = true
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean(KEY_SERVICE_RUNNING, serviceRunning)
                .putBoolean(KEY_SMS_ENABLED, smsEnabled)
                .putBoolean(KEY_PUSH_ENABLED, pushEnabled)
                .putBoolean(KEY_SHOW_NOTIF, showNotification)
                .apply()

            val intent = Intent(context, ForwarderForegroundService::class.java).apply {
                action = "ACTION_UPDATE_NOTIFICATION"
                putExtra("serviceRunning", serviceRunning)
                putExtra("smsEnabled", smsEnabled)
                putExtra("pushEnabled", pushEnabled)
                putExtra("showNotification", showNotification)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startWithCurrentStatus()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val serviceRunning = intent?.getBooleanExtra("serviceRunning", prefs.getBoolean(KEY_SERVICE_RUNNING, true))
            ?: prefs.getBoolean(KEY_SERVICE_RUNNING, true)
        val smsEnabled = intent?.getBooleanExtra("smsEnabled", prefs.getBoolean(KEY_SMS_ENABLED, true))
            ?: prefs.getBoolean(KEY_SMS_ENABLED, true)
        val pushEnabled = intent?.getBooleanExtra("pushEnabled", prefs.getBoolean(KEY_PUSH_ENABLED, true))
            ?: prefs.getBoolean(KEY_PUSH_ENABLED, true)

        buildAndPostNotification(serviceRunning, smsEnabled, pushEnabled)
        return START_STICKY
    }

    private fun startWithCurrentStatus() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val serviceRunning = prefs.getBoolean(KEY_SERVICE_RUNNING, true)
        val smsEnabled = prefs.getBoolean(KEY_SMS_ENABLED, true)
        val pushEnabled = prefs.getBoolean(KEY_PUSH_ENABLED, true)
        buildAndPostNotification(serviceRunning, smsEnabled, pushEnabled)
    }

    private fun buildAndPostNotification(serviceRunning: Boolean, smsEnabled: Boolean, pushEnabled: Boolean) {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        val statusText = when {
            !serviceRunning -> "⏸️ Сервис на паузе (SMS: Выкл · Push: Выкл)"
            smsEnabled && pushEnabled -> "🟢 Активен: SMS [ВКЛ] · Push [ВКЛ]"
            smsEnabled && !pushEnabled -> "🟢 Активен: SMS [ВКЛ] · Push [ВЫКЛ]"
            !smsEnabled && pushEnabled -> "🟢 Активен: Push [ВКЛ] · SMS [ВЫКЛ]"
            else -> "⚠️ Сервис включен (SMS и Push выключены)"
        }

        val subInfo = if (serviceRunning) "Telegram шлюз активен" else "Нажмите для включения"

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SMS & Push Forwarder")
            .setContentText(statusText)
            .setSubText(subInfo)
            .setSmallIcon(if (serviceRunning) android.R.drawable.ic_dialog_email else android.R.drawable.ic_lock_idle_lock)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOnlyAlertOnce(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Статус сервиса SMS & Push Forwarder",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Показывает в строке состояния работу пересылки SMS и Push в реальном времени"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
`.trim());

      // 9. BootReceiver.kt
      zip.file("app/src/main/java/ru/smsforwarder/app/BootReceiver.kt", `package ru.smsforwarder.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED || intent?.action == "android.intent.action.QUICKBOOT_POWERON") {
            context?.let {
                ForwarderForegroundService.start(it)
            }
        }
    }
}
`.trim());

      // 10. AndroidBridge.kt (Bridge between WebView UI and Native Android)
      zip.file("app/src/main/java/ru/smsforwarder/app/AndroidBridge.kt", `package ru.smsforwarder.app

import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class AndroidBridge(private val activity: Activity) {

    @JavascriptInterface
    fun isNativeApp(): Boolean = true

    @JavascriptInterface
    fun isNotificationAccessGranted(): Boolean {
        val cn = ComponentName(activity, NotificationForwarderService::class.java)
        val flat = Settings.Secure.getString(activity.contentResolver, "enabled_notification_listeners")
        return flat != null && flat.contains(cn.flattenToString())
    }

    @JavascriptInterface
    fun isSmsPermissionGranted(): Boolean {
        return ContextCompat.checkSelfPermission(activity, android.Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
    }

    @JavascriptInterface
    fun isBatteryOptimizationIgnored(): Boolean {
        val pm = activity.getSystemService(Context.POWER_SERVICE) as? PowerManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && pm != null) {
            pm.isIgnoringBatteryOptimizations(activity.packageName)
        } else {
            true
        }
    }

    @JavascriptInterface
    fun requestSmsPermissions() {
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(
                android.Manifest.permission.RECEIVE_SMS,
                android.Manifest.permission.READ_SMS
            ),
            101
        )
    }

    @JavascriptInterface
    fun requestNotificationAccess() {
        activity.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
    }

    @JavascriptInterface
    fun requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:\${activity.packageName}")
                }
                activity.startActivity(intent)
            } catch (e: Exception) {
                activity.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
            }
        }
    }

    @JavascriptInterface
    fun toggleService(enabled: Boolean) {
        val prefs = activity.getSharedPreferences("forwarder_service_prefs", Context.MODE_PRIVATE)
        val sms = prefs.getBoolean("key_sms_enabled", true)
        val push = prefs.getBoolean("key_push_enabled", true)
        ForwarderForegroundService.updateStatus(activity, enabled, sms, push)
    }

    @JavascriptInterface
    fun toggleSms(enabled: Boolean) {
        val prefs = activity.getSharedPreferences("forwarder_service_prefs", Context.MODE_PRIVATE)
        val running = prefs.getBoolean("key_service_running", true)
        val push = prefs.getBoolean("key_push_enabled", true)
        ForwarderForegroundService.updateStatus(activity, running, enabled, push)
    }

    @JavascriptInterface
    fun togglePush(enabled: Boolean) {
        val prefs = activity.getSharedPreferences("forwarder_service_prefs", Context.MODE_PRIVATE)
        val running = prefs.getBoolean("key_service_running", true)
        val sms = prefs.getBoolean("key_sms_enabled", true)
        ForwarderForegroundService.updateStatus(activity, running, sms, enabled)
    }

    @JavascriptInterface
    fun updateServiceStatus(serviceRunning: Boolean, smsEnabled: Boolean, pushEnabled: Boolean, showNotification: Boolean = true) {
        ForwarderForegroundService.updateStatus(activity, serviceRunning, smsEnabled, pushEnabled, showNotification)
    }

    @JavascriptInterface
    fun sendTestTelegram() {
        TelegramSender.forwardPayload(
            type = "notification",
            sender = "Тест из приложения",
            text = "Связь со встроенным Android-сервисом пересылки работает отлично!",
            appName = "SMS Forwarder"
        )
        Toast.makeText(activity, "Тестовое сообщение отправлено в Telegram", Toast.LENGTH_SHORT).show()
    }
}
`.trim());

      // 11. MainActivity.kt (Hosting the modern Web UI in WebView)
      zip.file("app/src/main/java/ru/smsforwarder/app/MainActivity.kt", `package ru.smsforwarder.app

import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Request POST_NOTIFICATIONS on Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 102)
            }
        }

        // Auto start background service
        ForwarderForegroundService.start(this)

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            }
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
            addJavascriptInterface(AndroidBridge(this@MainActivity), "AndroidBridge")
        }

        setContentView(webView)
        webView.loadUrl(Config.APP_WEB_URL)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
`.trim());

      // 12. README.md
      zip.file("README.md", `# SMS & Push to Telegram (Единый нативный Android APK)

Полноценное Android-приложение «Всё-в-одном» со встроенным веб-интерфейсом и нативным фоновым сервисом пересылки SMS и Push-уведомлений.

## Как собрать APK за 1 минуту:
1. Распакуйте этот архив.
2. Откройте папку проекта в бесплатной программе **Android Studio** или запустите \`./gradlew assembleDebug\`.
3. Нажмите меню **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
4. Скопируйте полученный \`app-debug.apk\` на телефон и установите.
5. При запуске приложение само попросит необходимые разрешения на SMS и доступ к уведомлениям.

Приложение работает 100% автономно в фоне 24/7!
`.trim());

      // 13. Gradle wrapper files & scripts
      const wrapperJarPath = path.join(__dirname, 'android/gradle/wrapper/gradle-wrapper.jar');
      if (fs.existsSync(wrapperJarPath)) {
        zip.file("gradle/wrapper/gradle-wrapper.jar", fs.readFileSync(wrapperJarPath));
      }
      const wrapperPropPath = path.join(__dirname, 'android/gradle/wrapper/gradle-wrapper.properties');
      if (fs.existsSync(wrapperPropPath)) {
        zip.file("gradle/wrapper/gradle-wrapper.properties", fs.readFileSync(wrapperPropPath));
      }
      const gradlewPath = path.join(__dirname, 'android/gradlew');
      if (fs.existsSync(gradlewPath)) {
        zip.file("gradlew", fs.readFileSync(gradlewPath), { unixPermissions: "755" });
      }

      const content = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="pushtoweb_android_app.zip"');
      res.send(content);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Full Repository ZIP Export (Ready for GitHub upload)
  app.get('/api/export/full-project.zip', async (req, res) => {
    try {
      const fs = await import('fs');
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const ignoredDirs = new Set(['node_modules', 'dist', '.git', '.cache']);
      const ignoredFiles = new Set(['.env', 'bun.lock']);

      function addDirectoryToZip(dirPath: string, zipFolder: any) {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') && entry.name !== '.gitignore' && entry.name !== '.env.example') {
            continue;
          }
          if (entry.isDirectory()) {
            if (!ignoredDirs.has(entry.name)) {
              const subFolder = zipFolder.folder(entry.name);
              addDirectoryToZip(path.join(dirPath, entry.name), subFolder);
            }
          } else if (entry.isFile()) {
            if (!ignoredFiles.has(entry.name)) {
              const fileData = fs.readFileSync(path.join(dirPath, entry.name));
              zipFolder.file(entry.name, fileData);
            }
          }
        }
      }

      addDirectoryToZip(__dirname, zip);

      const content = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="pushtoweb-v1.0.0.zip"');
      res.send(content);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SMS & Push Forwarder server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
