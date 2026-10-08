package ru.pushtoweb.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.telephony.TelephonyManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SmsBroadcastReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent?.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val pendingResult = goAsync()

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val prefs = context.getSharedPreferences("forwarder_service_prefs", Context.MODE_PRIVATE)
                val serviceRunning = prefs.getBoolean("key_service_running", false)
                val smsEnabled = prefs.getBoolean("key_sms_enabled", true)
                if (!serviceRunning || !smsEnabled) {
                    pendingResult.finish()
                    return@launch
                }

                TelegramSender.ensureConfigLoaded(context)
                val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
                val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
                val operatorName = tm?.networkOperatorName ?: ""

                if (!messages.isNullOrEmpty()) {
                    for (sms in messages) {
                        val sender = sms.originatingAddress ?: "SMS"
                        val body = sms.messageBody ?: ""

                        TelegramSender.forwardPayloadSync(
                            type = "sms",
                            sender = sender,
                            text = body,
                            appName = "SMS",
                            packageName = "com.android.sms",
                            operator = operatorName
                        )
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                pendingResult.finish()
            }
        }
    }
}
