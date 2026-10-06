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
    fun sendTestTelegram() {
        TelegramSender.forwardPayload(
            type = "notification",
            sender = "PushToWeb Android App",
            text = "Связь с нативным приложением PushToWeb работает отлично!",
            appName = "PushToWeb"
        )
        Toast.makeText(activity, "Тестовое сообщение отправлено в Telegram", Toast.LENGTH_SHORT).show()
    }
}
