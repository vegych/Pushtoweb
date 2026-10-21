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
        context: Context? = null,
        type: String,
        sender: String,
        text: String,
        appName: String = "",
        packageName: String = "",
        title: String = "",
        operator: String = "",
        imageBitmap: android.graphics.Bitmap? = null
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
                        append("📲 <b>[${appName.ifEmpty { "Уведомление" }}]</b>\n")
                        if (sender.isNotEmpty()) {
                            append("$sender\n")
                        }
                    }
                    if (title.isNotEmpty() && title != sender && title != appName) {
                        append("<b>$title</b>\n")
                    }
                    append("$text\n")
                    if (operator.isNotEmpty()) {
                        append("\n📶 $operator")
                    }
                }

                val endpoint = Config.TELEGRAM_API_ENDPOINT.trimEnd('/')
                val botToken = Config.TELEGRAM_BOT_TOKEN
                val chatId = Config.TELEGRAM_CHAT_ID

                if (imageBitmap != null) {
                    try {
                        val stream = java.io.ByteArrayOutputStream()
                        imageBitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 90, stream)
                        val byteArray = stream.toByteArray()

                        val multipartBody = okhttp3.MultipartBody.Builder()
                            .setType(okhttp3.MultipartBody.FORM)
                            .addFormDataPart("chat_id", chatId)
                            .addFormDataPart("caption", messageText)
                            .addFormDataPart("parse_mode", "HTML")
                            .addFormDataPart(
                                "photo",
                                "notification_image.jpg",
                                okhttp3.RequestBody.create("image/jpeg".toMediaType(), byteArray)
                            )
                            .build()

                        val tgUrl = "$endpoint/bot$botToken/sendPhoto"
                        val tgRequest = Request.Builder().url(tgUrl).post(multipartBody).build()
                        val response = client.newCall(tgRequest).execute()
                        val responseStr = response.body?.string()
                        response.close()

                        if (responseStr != null && JSONObject(responseStr).optBoolean("ok")) {
                            if (context != null) {
                                recordLogToPrefs(context, type, sender, text, appName, packageName, title, operator)
                            }
                            return
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }

                // Standard sendMessage fallback
                val tgJson = JSONObject().apply {
                    put("chat_id", chatId)
                    put("text", messageText)
                    put("parse_mode", "HTML")
                }

                val tgUrl = "$endpoint/bot$botToken/sendMessage"
                val tgBody = tgJson.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
                val tgRequest = Request.Builder().url(tgUrl).post(tgBody).build()
                val response = client.newCall(tgRequest).execute()
                val isSuccess = response.isSuccessful
                response.close()

                if (isSuccess && context != null) {
                    recordLogToPrefs(context, type, sender, text, appName, packageName, title, operator)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun recordLogToPrefs(
        context: Context,
        type: String,
        sender: String,
        text: String,
        appName: String,
        packageName: String,
        title: String,
        operator: String
    ) {
        try {
            val prefs = context.getSharedPreferences("pushtoweb_logs", Context.MODE_PRIVATE)
            val currentRaw = prefs.getString("key_logs_json", "[]") ?: "[]"
            val currentArray = org.json.JSONArray(currentRaw)

            val logEntry = JSONObject().apply {
                put("id", "log_" + System.currentTimeMillis() + "_" + (1000..9999).random())
                put("timestamp", System.currentTimeMillis())
                put("type", type)
                put("packageName", packageName)
                put("appName", appName.ifEmpty { if (type == "sms") "SMS" else "Уведомление" })
                put("sender", sender)
                put("title", title)
                put("text", text)
                put("operator", operator)
                put("status", "forwarded")
            }

            val updatedArray = org.json.JSONArray()
            updatedArray.put(logEntry)
            for (i in 0 until Math.min(currentArray.length(), 199)) {
                updatedArray.put(currentArray.get(i))
            }

            prefs.edit().putString("key_logs_json", updatedArray.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun forwardPayload(
        context: Context? = null,
        type: String,
        sender: String,
        text: String,
        appName: String = "",
        packageName: String = "",
        title: String = "",
        operator: String = "",
        imageBitmap: android.graphics.Bitmap? = null
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            forwardPayloadSync(context, type, sender, text, appName, packageName, title, operator, imageBitmap)
        }
    }
}
