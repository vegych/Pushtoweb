package ru.pushtoweb.app

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
        const val CHANNEL_ID = "pushtoweb_fg_channel"
        const val NOTIFICATION_ID = 1001

        private const val PREFS_NAME = "forwarder_service_prefs"
        private const val KEY_SERVICE_RUNNING = "key_service_running"
        private const val KEY_SMS_ENABLED = "key_sms_enabled"
        private const val KEY_PUSH_ENABLED = "key_push_enabled"
        private const val KEY_SHOW_NOTIF_WHEN_STOPPED = "key_show_notif_when_stopped"

        fun start(context: Context) {
            val intent = Intent(context, ForwarderForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun updateStatus(
            context: Context,
            serviceRunning: Boolean,
            smsEnabled: Boolean,
            pushEnabled: Boolean,
            showNotifWhenStopped: Boolean = false
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean(KEY_SERVICE_RUNNING, serviceRunning)
                .putBoolean(KEY_SMS_ENABLED, smsEnabled)
                .putBoolean(KEY_PUSH_ENABLED, pushEnabled)
                .putBoolean(KEY_SHOW_NOTIF_WHEN_STOPPED, showNotifWhenStopped)
                .apply()

            val intent = Intent(context, ForwarderForegroundService::class.java).apply {
                action = "ACTION_UPDATE_NOTIFICATION"
                putExtra("serviceRunning", serviceRunning)
                putExtra("smsEnabled", smsEnabled)
                putExtra("pushEnabled", pushEnabled)
                putExtra("showNotifWhenStopped", showNotifWhenStopped)
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
        val serviceRunning = intent?.getBooleanExtra("serviceRunning", prefs.getBoolean(KEY_SERVICE_RUNNING, false))
            ?: prefs.getBoolean(KEY_SERVICE_RUNNING, false)
        val smsEnabled = intent?.getBooleanExtra("smsEnabled", prefs.getBoolean(KEY_SMS_ENABLED, false))
            ?: prefs.getBoolean(KEY_SMS_ENABLED, false)
        val pushEnabled = intent?.getBooleanExtra("pushEnabled", prefs.getBoolean(KEY_PUSH_ENABLED, false))
            ?: prefs.getBoolean(KEY_PUSH_ENABLED, false)
        val showNotifWhenStopped = intent?.getBooleanExtra("showNotifWhenStopped", prefs.getBoolean(KEY_SHOW_NOTIF_WHEN_STOPPED, false))
            ?: prefs.getBoolean(KEY_SHOW_NOTIF_WHEN_STOPPED, false)

        if (!serviceRunning && !showNotifWhenStopped) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
            stopSelf()
            return START_NOT_STICKY
        }

        buildAndPostNotification(serviceRunning, smsEnabled, pushEnabled)
        return START_STICKY
    }

    private fun startWithCurrentStatus() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val serviceRunning = prefs.getBoolean(KEY_SERVICE_RUNNING, false)
        val smsEnabled = prefs.getBoolean(KEY_SMS_ENABLED, false)
        val pushEnabled = prefs.getBoolean(KEY_PUSH_ENABLED, false)
        val showNotifWhenStopped = prefs.getBoolean(KEY_SHOW_NOTIF_WHEN_STOPPED, false)

        if (!serviceRunning && !showNotifWhenStopped) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
            stopSelf()
            return
        }

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
            !serviceRunning -> "⏸️ PushToWeb на паузе (SMS: Выкл · Push: Выкл)"
            smsEnabled && pushEnabled -> "🟢 Активен: SMS [ВКЛ] · Push [ВКЛ]"
            smsEnabled && !pushEnabled -> "🟢 Активен: SMS [ВКЛ] · Push [ВЫКЛ]"
            !smsEnabled && pushEnabled -> "🟢 Активен: Push [ВКЛ] · SMS [ВЫКЛ]"
            else -> "⚠️ Сервис включен (SMS и Push выключены)"
        }

        val subInfo = if (serviceRunning) "Telegram шлюз активен" else "Нажмите для включения"

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("PushToWeb Gateway")
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
                "Статус PushToWeb",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Показывает в строке состояния работу пересылки SMS и Push"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
