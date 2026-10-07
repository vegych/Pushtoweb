package ru.pushtoweb.app

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class NotificationForwarderService : NotificationListenerService() {

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d("NotificationForwarder", "Notification Listener Service Connected")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.d("NotificationForwarder", "Notification Listener Service Disconnected")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            requestRebind(ComponentName(this, NotificationForwarderService::class.java))
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        TelegramSender.ensureConfigLoaded(applicationContext)

        // Skip internal app notifications
        if (sbn.packageName == packageName) return

        // Check if service running and push forwarding is enabled
        val prefs = applicationContext.getSharedPreferences("forwarder_service_prefs", Context.MODE_PRIVATE)
        val serviceRunning = prefs.getBoolean("key_service_running", true)
        val pushEnabled = prefs.getBoolean("key_push_enabled", true)
        if (!serviceRunning || !pushEnabled) return

        val extras = sbn.notification.extras ?: return
        val title = (extras.getCharSequence(Notification.EXTRA_TITLE)
            ?: extras.getCharSequence(Notification.EXTRA_TITLE_BIG)
            ?: "").toString().trim()

        val appPackage = sbn.packageName ?: ""
        val pm = applicationContext.packageManager
        val appName = try {
            val appInfo = pm.getApplicationInfo(appPackage, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            appPackage
        }

        // Process notification and extract only new delta messages
        val newMessages = NotificationDeduplicator.processNotification(sbn)

        for (msgText in newMessages) {
            TelegramSender.forwardPayload(
                type = "notification",
                sender = title.ifEmpty { appName },
                text = msgText,
                appName = appName,
                packageName = appPackage,
                title = title
            )
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val appPackage = sbn.packageName ?: ""
        val sbnKey = sbn.key ?: "${appPackage}_${sbn.id}"
        NotificationDeduplicator.onNotificationRemoved(sbnKey)
    }
}
