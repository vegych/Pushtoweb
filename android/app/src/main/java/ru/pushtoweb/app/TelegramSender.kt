package ru.pushtoweb.app

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object TelegramSender {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    fun forwardPayload(
        type: String,
        sender: String,
        text: String,
        appName: String = "",
        packageName: String = "",
        title: String = "",
        operator: String = ""
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val json = JSONObject().apply {
                    put("type", type)
                    put("sender", sender)
                    put("text", text)
                    put("appName", appName)
                    put("packageName", packageName)
                    put("title", title)
                    put("operator", operator)
                    put("timestamp", System.currentTimeMillis())
                }

                // 1. Отправка на Webhook шлюз (если настроен)
                if (Config.WEBHOOK_URL.isNotEmpty()) {
                    val mediaType = "application/json; charset=utf-8".toMediaType()
                    val body = json.toString().toRequestBody(mediaType)
                    val request = Request.Builder()
                        .url(Config.WEBHOOK_URL)
                        .post(body)
                        .build()
                    client.newCall(request).execute().close()
                }

                // 2. Прямая отправка в Telegram бот
                if (Config.TELEGRAM_BOT_TOKEN.isNotEmpty() && Config.TELEGRAM_CHAT_ID.isNotEmpty()) {
                    val messageText = buildString {
                        if (type == "sms") {
                            append("💬 <b>[SMS]</b> <code>$sender</code>\n")
                        } else {
                            append("📲 <b>[${appName.ifEmpty { "Уведомление" }}]</b> · <i>$sender</i>\n")
                        }
                        if (title.isNotEmpty() && title != sender && title != appName) {
                            append("<b>$title</b>\n")
                        }
                        append("$text\n")
                        if (operator.isNotEmpty()) {
                            append("\n<pre>📶 $operator</pre>")
                        }
                    }

                    val tgJson = JSONObject().apply {
                        put("chat_id", Config.TELEGRAM_CHAT_ID)
                        put("text", messageText)
                        put("parse_mode", "HTML")
                    }

                    val tgUrl = "${Config.TELEGRAM_API_ENDPOINT.trimEnd('/')}/bot${Config.TELEGRAM_BOT_TOKEN}/sendMessage"
                    val tgBody = tgJson.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
                    val tgRequest = Request.Builder().url(tgUrl).post(tgBody).build()
                    client.newCall(tgRequest).execute().close()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
