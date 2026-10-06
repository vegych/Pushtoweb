package ru.pushtoweb.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Load saved Telegram credentials into Config object
        loadSavedConfig()

        // Request permissions on startup
        requestStartupPermissions()

        // Auto start background keep-alive service
        ForwarderForegroundService.start(this)

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            }
            webViewClient = object : WebViewClient() {
                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)
                    // If remote load fails, automatically fallback to local offline asset
                    val failingUrl = request?.url?.toString() ?: ""
                    if (!failingUrl.startsWith("file:///android_asset/")) {
                        view?.loadUrl("file:///android_asset/web/index.html")
                    }
                }
            }
            webChromeClient = WebChromeClient()
            addJavascriptInterface(AndroidBridge(this@MainActivity), "AndroidBridge")
        }

        setContentView(webView)

        // Check if bundled web asset exists
        val hasLocalAsset = try {
            assets.open("web/index.html").close()
            true
        } catch (e: Exception) {
            false
        }

        val targetUrl = if (hasLocalAsset) {
            "file:///android_asset/web/index.html"
        } else {
            Config.APP_WEB_URL
        }

        webView.loadUrl(targetUrl)
    }

    private fun loadSavedConfig() {
        val prefs = getSharedPreferences("pushtoweb_config", Context.MODE_PRIVATE)
        Config.TELEGRAM_BOT_TOKEN = prefs.getString("bot_token", Config.TELEGRAM_BOT_TOKEN) ?: Config.TELEGRAM_BOT_TOKEN
        Config.TELEGRAM_CHAT_ID = prefs.getString("chat_id", Config.TELEGRAM_CHAT_ID) ?: Config.TELEGRAM_CHAT_ID
        Config.TELEGRAM_API_ENDPOINT = prefs.getString("api_endpoint", Config.TELEGRAM_API_ENDPOINT) ?: Config.TELEGRAM_API_ENDPOINT
        Config.WEBHOOK_URL = prefs.getString("webhook_url", Config.WEBHOOK_URL) ?: Config.WEBHOOK_URL
    }

    private fun requestStartupPermissions() {
        val needed = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) {
            needed.add(android.Manifest.permission.RECEIVE_SMS)
        }
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            needed.add(android.Manifest.permission.READ_SMS)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                needed.add(android.Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), 101)
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
