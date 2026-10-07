package ru.pushtoweb.app

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.ConnectionPool
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import android.content.Context

object TelegramSender {
    // Reusable HTTP client with persistent connection pool to reduce battery & TLS handshake overhead
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .connectionPool(ConnectionPool(5, 5, TimeUnit.MINUTES))
        .retryOnConnectionFailure(true)
        .build()

    fun ensureConfigLoaded(context: Context) {
        if (Config.TELEGRAM_BOT_TOKEN.isEmpty() || Config.TELEGRAM_CHAT_ID.isEmpty()) {
            val prefs = context.getSharedPreferences("pushtoweb_config", Context.MODE_PRIVATE)
            Config.TELEGRAM_BOT_TOKEN = prefs.getString("bot_token", Config.TELEGRAM_BOT_TOKEN) ?: Config.TELEGRAM_BOT_TOKEN
            Config.TELEGRAM_CHAT_ID = prefs.getString("chat_id", Config.TELEGRAM_CHAT_ID) ?: Config.TELEGRAM_CHAT_ID
            Config.TELEGRAM_API_ENDPOINT = prefs.getString("api_endpoint", Config.TELEGRAM_API_ENDPOINT) ?: Config.TELEGRAM_API_ENDPOINT
            Config.WEBHOOK_URL = prefs.getString("webhook_url", Config.WEBHOOK_URL) ?: Config.WEBHOOK_URL
        }
    }

    fun forwardPayloadSync(
        type: String,
        sender: String,
        text: String,
        appName: String = "",
        packageName: String = "",
        title: String = "",
        operator: String = ""
    ) {
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

            // 1. Webhook Gateway
            if (Config.WEBHOOK_URL.isNotEmpty()) {
                val mediaType = "application/json; charset=utf-8".toMediaType()
                val body = json.toString().toRequestBody(mediaType)
                val request = Request.Builder()
                    .url(Config.WEBHOOK_URL)
                    .post(body)
                    .build()
                client.newCall(request).execute().close()
            }

            // 2. Telegram Bot Direct
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
            forwardPayloadSync(type, sender, text, appName, packageName, title, operator)
        }
    }
}
