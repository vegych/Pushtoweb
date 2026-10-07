package ru.pushtoweb.app

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
                    data = Uri.parse("package:${activity.packageName}")
                }
                activity.startActivity(intent)
            } catch (e: Exception) {
                activity.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
            }
        }
    }

    private fun checkAndRequestPermissionsOnEnable(serviceRunning: Boolean, smsEnabled: Boolean, pushEnabled: Boolean) {
        if (!serviceRunning) return
        activity.runOnUiThread {
            if (smsEnabled && !isSmsPermissionGranted()) {
                requestSmsPermissions()
            } else if (pushEnabled && !isNotificationAccessGranted()) {
                requestNotificationAccess()
            }
        }
    }

    @JavascriptInterface
    fun toggleService(enabled: Boolean) {
        val prefs = activity.getSharedPreferences("forwarder_service_prefs", Context.MODE_PRIVATE)
        val sms = prefs.getBoolean("key_sms_enabled", false)
        val push = prefs.getBoolean("key_push_enabled", false)
        ForwarderForegroundService.updateStatus(activity, enabled, sms, push)
        checkAndRequestPermissionsOnEnable(enabled, sms, push)
    }

    @JavascriptInterface
    fun toggleSms(enabled: Boolean) {
        val prefs = activity.getSharedPreferences("forwarder_service_prefs", Context.MODE_PRIVATE)
        val running = prefs.getBoolean("key_service_running", false)
        val push = prefs.getBoolean("key_push_enabled", false)
        ForwarderForegroundService.updateStatus(activity, running, enabled, push)
        checkAndRequestPermissionsOnEnable(running, enabled, push)
    }

    @JavascriptInterface
    fun togglePush(enabled: Boolean) {
        val prefs = activity.getSharedPreferences("forwarder_service_prefs", Context.MODE_PRIVATE)
        val running = prefs.getBoolean("key_service_running", false)
        val sms = prefs.getBoolean("key_sms_enabled", false)
        ForwarderForegroundService.updateStatus(activity, running, sms, enabled)
        checkAndRequestPermissionsOnEnable(running, sms, enabled)
    }

    @JavascriptInterface
    fun updateServiceStatus(serviceRunning: Boolean, smsEnabled: Boolean, pushEnabled: Boolean, showNotification: Boolean = true) {
        val prefs = activity.getSharedPreferences("forwarder_service_prefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean("key_service_running", serviceRunning)
            .putBoolean("key_sms_enabled", smsEnabled)
            .putBoolean("key_push_enabled", pushEnabled)
            .apply()
        ForwarderForegroundService.updateStatus(activity, serviceRunning, smsEnabled, pushEnabled)
        checkAndRequestPermissionsOnEnable(serviceRunning, smsEnabled, pushEnabled)
    }

    @JavascriptInterface
    fun saveTelegramConfig(token: String, chatId: String, endpoint: String, webhook: String) {
        Config.TELEGRAM_BOT_TOKEN = token
        Config.TELEGRAM_CHAT_ID = chatId
        if (endpoint.isNotEmpty()) Config.TELEGRAM_API_ENDPOINT = endpoint
        Config.WEBHOOK_URL = webhook

        val prefs = activity.getSharedPreferences("pushtoweb_config", Context.MODE_PRIVATE)
        prefs.edit()
            .putString("bot_token", token)
            .putString("chat_id", chatId)
            .putString("api_endpoint", endpoint)
            .putString("webhook_url", webhook)
            .apply()
    }

    @JavascriptInterface
    fun getTelegramConfig(): String {
        val prefs = activity.getSharedPreferences("pushtoweb_config", Context.MODE_PRIVATE)
        val token = prefs.getString("bot_token", Config.TELEGRAM_BOT_TOKEN) ?: Config.TELEGRAM_BOT_TOKEN
        val chatId = prefs.getString("chat_id", Config.TELEGRAM_CHAT_ID) ?: Config.TELEGRAM_CHAT_ID
        val endpoint = prefs.getString("api_endpoint", Config.TELEGRAM_API_ENDPOINT) ?: Config.TELEGRAM_API_ENDPOINT
        val webhook = prefs.getString("webhook_url", Config.WEBHOOK_URL) ?: Config.WEBHOOK_URL

        val json = org.json.JSONObject()
        json.put("botToken", token)
        json.put("chatId", chatId)
        json.put("apiEndpoint", endpoint)
        json.put("webhookUrl", webhook)
        return json.toString()
    }

    @JavascriptInterface
    fun sendTestTelegram() {
        TelegramSender.forwardPayload(
            type = "notification",
            sender = "PushToWeb Android App",
            text = "Связь с нативным приложением PushToWeb работает отлично!",
            appName = "PushToWeb"
        )
        Toast.makeText(activity, "Тестовое сообщение отправлено в Telegram", Toast.LENGTH_SHORT).show()
    }

    @JavascriptInterface
    fun getInstalledApps(): String {
        return try {
            val pm = activity.packageManager
            val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            val jsonArray = org.json.JSONArray()

            for (app in apps) {
                val pkgName = app.packageName
                if (pkgName == activity.packageName) continue

                val isSystem = (app.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0
                val launchIntent = pm.getLaunchIntentForPackage(pkgName)
                val isSmsApp = pkgName.contains("mms") || pkgName.contains("telephony") || pkgName.contains("messaging")

                // Only include apps that have a launch intent (UI/notifications) or SMS apps
                if (launchIntent != null || isSmsApp) {
                    val label = try {
                        pm.getApplicationLabel(app).toString()
                    } catch (e: Exception) {
                        pkgName
                    }

                    val json = org.json.JSONObject()
                    json.put("packageName", pkgName)
                    json.put("appName", label)
                    json.put("isSystem", isSystem)
                    jsonArray.put(json)
                }
            }
            jsonArray.toString()
        } catch (e: Exception) {
            "[]"
        }
    }

    @JavascriptInterface
    fun saveBackupJson(jsonContent: String, fileName: String) {
        val mainActivity = activity as? MainActivity
        if (mainActivity != null) {
            mainActivity.saveBackupWithStoragePicker(jsonContent, fileName)
        } else {
            activity.runOnUiThread {
                try {
                    val downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS)
                    val file = java.io.File(downloadsDir, if (fileName.isEmpty()) "pushtoweb_backup.json" else fileName)
                    file.writeText(jsonContent)
                    Toast.makeText(activity, "Сохранено в Загрузки: ${file.name}", Toast.LENGTH_LONG).show()
                } catch (e: Exception) {
                    Toast.makeText(activity, "Ошибка сохранения бэкапа: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
