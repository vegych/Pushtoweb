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

        // Skip ongoing notifications (e.g. background service, active calls, media players)
        if (sbn.isOngoing) {
            Log.d("NotificationForwarder", "Skipping ongoing notification from ${sbn.packageName}")
            return
        }

        val flags = sbn.notification.flags
        if ((flags and Notification.FLAG_ONGOING_EVENT) != 0 ||
            (flags and Notification.FLAG_FOREGROUND_SERVICE) != 0 ||
            (flags and Notification.FLAG_NO_CLEAR) != 0) {
            Log.d("NotificationForwarder", "Skipping flag-ongoing/foreground notification from ${sbn.packageName}")
            return
        }

        val category = sbn.notification.category
        if (category == Notification.CATEGORY_SERVICE ||
            category == Notification.CATEGORY_PROGRESS ||
            category == Notification.CATEGORY_SYSTEM) {
            Log.d("NotificationForwarder", "Skipping service/system category: $category")
            return
        }

        // Check if service running and push forwarding is enabled
        val prefs = applicationContext.getSharedPreferences("forwarder_service_prefs", Context.MODE_PRIVATE)
        val serviceRunning = prefs.getBoolean("key_service_running", false)
        val pushEnabled = prefs.getBoolean("key_push_enabled", true)
        val smsEnabled = prefs.getBoolean("key_sms_enabled", true)
        if (!serviceRunning || !pushEnabled) return

        val extras = sbn.notification.extras ?: return
        val title = (extras.getCharSequence(Notification.EXTRA_TITLE)
            ?: extras.getCharSequence(Notification.EXTRA_TITLE_BIG)
            ?: "").toString().trim()

        val textTmp = (extras.getCharSequence(Notification.EXTRA_TEXT) ?: "").toString().trim()
        val bigTextTmp = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: "").toString().trim()
        val combinedText = "$title $textTmp $bigTextTmp".lowercase()

        // Skip background running messages from system/apps
        if (combinedText.contains("работает в фоновом режиме") ||
            combinedText.contains("выполняется в фоновом режиме") ||
            combinedText.contains("running in the background") ||
            combinedText.contains("background activity")) {
            Log.d("NotificationForwarder", "Skipping background service notice from ${sbn.packageName}")
            return
        }

        val notifContent = textTmp.ifEmpty { bigTextTmp }

        // Cross-deduplication with recently forwarded SMS
        if (RecentMessageCache.isDuplicateOfRecentSms(sender = title, title = title, text = notifContent)) {
            Log.d("NotificationForwarder", "Notification is duplicate of recently forwarded SMS. Skipping.")
            return
        }

        val appPackage = sbn.packageName ?: ""

        // Skip notifications from SMS apps if SMS forwarding is active and this sender sent a recent SMS
        if (smsEnabled) {
            val defaultSmsPkg = try {
                android.provider.Telephony.Sms.getDefaultSmsPackage(applicationContext)
            } catch (e: Exception) {
                null
            }
            val isSmsApp = (defaultSmsPkg != null && appPackage.equals(defaultSmsPkg, ignoreCase = true)) ||
                appPackage.equals("com.google.android.apps.messaging", ignoreCase = true) ||
                appPackage.equals("com.samsung.android.messaging", ignoreCase = true) ||
                appPackage.contains("mms", ignoreCase = true)

            if (isSmsApp && RecentMessageCache.hasRecentSmsFrom(title)) {
                Log.d("NotificationForwarder", "Skipping duplicate notification from SMS app for recent sender: $title")
                return
            }
        }

        // Check app filter rules
        val rulesPrefs = applicationContext.getSharedPreferences("pushtoweb_rules", Context.MODE_PRIVATE)
        val rulesJsonStr = rulesPrefs.getString("key_app_rules_json", null)

        if (!rulesJsonStr.isNullOrEmpty()) {
            try {
                val jsonArray = org.json.JSONArray(rulesJsonStr)
                var matchedRule: org.json.JSONObject? = null

                for (i in 0 until jsonArray.length()) {
                    val item = jsonArray.optJSONObject(i) ?: continue
                    val pkg = item.optString("packageName", "")
                    if (pkg.equals(appPackage, ignoreCase = true)) {
                        matchedRule = item
                        break
                    }
                }

                if (matchedRule != null) {
                    val isEnabled = matchedRule.optBoolean("enabled", false)
                    if (!isEnabled) {
                        Log.d("NotificationForwarder", "App $appPackage is disabled in filter rules. Skipping.")
                        return
                    }

                    // Check excludeKeywords
                    val excludeArr = matchedRule.optJSONArray("excludeKeywords")
                    if (excludeArr != null) {
                        for (k in 0 until excludeArr.length()) {
                            val kw = excludeArr.optString(k, "").trim()
                            if (kw.isNotEmpty() && (title.contains(kw, ignoreCase = true) || notifContent.contains(kw, ignoreCase = true))) {
                                Log.d("NotificationForwarder", "Notification matched exclude keyword '$kw'. Skipping.")
                                return
                            }
                        }
                    }

                    // Check filterMode
                    val filterMode = matchedRule.optString("filterMode", "all")
                    if (filterMode == "keywords") {
                        val kwArr = matchedRule.optJSONArray("keywords")
                        var kwMatch = false
                        if (kwArr != null) {
                            for (k in 0 until kwArr.length()) {
                                val kw = kwArr.optString(k, "").trim()
                                if (kw.isNotEmpty() && (title.contains(kw, ignoreCase = true) || notifContent.contains(kw, ignoreCase = true))) {
                                    kwMatch = true
                                    break
                                }
                            }
                        }
                        if (!kwMatch) {
                            Log.d("NotificationForwarder", "App $appPackage filterMode=keywords, but no keywords matched. Skipping.")
                            return
                        }
                    }
                } else {
                    // App is NOT in the enabled app rules filter list
                    Log.d("NotificationForwarder", "App $appPackage is not in enabled filter rules. Skipping.")
                    return
                }
            } catch (e: Exception) {
                Log.e("NotificationForwarder", "Error evaluating app filter rules JSON", e)
            }
        }

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
            if (RecentMessageCache.isDuplicateOfRecentSms(sender = title, title = title, text = msgText)) {
                Log.d("NotificationForwarder", "Skipping new delta message matching recent SMS")
                continue
            }
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
