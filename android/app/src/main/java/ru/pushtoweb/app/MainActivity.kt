package ru.pushtoweb.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var pendingBackupJson: String? = null
    private var pendingFileName: String? = null

    companion object {
        private const val REQUEST_CODE_CREATE_FILE = 2001
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Load saved Telegram credentials into Config object
        loadSavedConfig()

        // Start service only if explicitly enabled by user previously
        val fgPrefs = getSharedPreferences("forwarder_service_prefs", Context.MODE_PRIVATE)
        if (fgPrefs.getBoolean("key_service_running", false)) {
            ForwarderForegroundService.start(this)
        }

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                allowFileAccessFromFileURLs = true
                allowUniversalAccessFromFileURLs = true
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            }
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    val url = request?.url?.toString() ?: return false
                    if (url.startsWith("http://") || url.startsWith("https://")) {
                        if (!url.contains("app.assets")) {
                            try {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                }
                                startActivity(intent)
                                return true
                            } catch (e: Exception) {
                                Log.e("PushToWeb", "Failed to open url: $url", e)
                            }
                        }
                    }
                    return false
                }

                override fun shouldInterceptRequest(
                    view: WebView?,
                    request: WebResourceRequest?
                ): WebResourceResponse? {
                    val uri = request?.url ?: return null
                    return assetLoader.shouldInterceptRequest(uri)
                }
            }
            setDownloadListener { url, _, _, _, _ ->
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this@MainActivity, "Ошибка открытия загрузки: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    Log.d("PushToWebJS", "${consoleMessage?.message()} -- From line ${consoleMessage?.lineNumber()} of ${consoleMessage?.sourceId()}")
                    return true
                }
            }
            addJavascriptInterface(AndroidBridge(this@MainActivity), "AndroidBridge")
        }

        setContentView(webView)

        // Load via secure asset loader (supports ES modules and local storage)
        webView.loadUrl(Config.APP_WEB_URL)
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

    fun saveBackupWithStoragePicker(jsonContent: String, fileName: String) {
        pendingBackupJson = jsonContent
        pendingFileName = fileName
        runOnUiThread {
            try {
                val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "application/json"
                    putExtra(Intent.EXTRA_TITLE, if (fileName.isNotEmpty()) fileName else "pushtoweb_backup.json")
                }
                startActivityForResult(intent, REQUEST_CODE_CREATE_FILE)
            } catch (e: Exception) {
                saveToDownloadsDirectly(jsonContent, fileName)
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_CODE_CREATE_FILE && resultCode == RESULT_OK) {
            data?.data?.let { uri ->
                val content = pendingBackupJson
                if (content != null) {
                    try {
                        contentResolver.openOutputStream(uri)?.use { os ->
                            os.write(content.toByteArray(Charsets.UTF_8))
                        }
                        Toast.makeText(this, "Бэкап успешно сохранен!", Toast.LENGTH_SHORT).show()
                    } catch (e: Exception) {
                        Toast.makeText(this, "Ошибка записи файла: ${e.message}", Toast.LENGTH_SHORT).show()
                    } finally {
                        pendingBackupJson = null
                        pendingFileName = null
                    }
                }
            }
        }
    }

    private fun saveToDownloadsDirectly(jsonContent: String, fileName: String) {
        try {
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            val file = java.io.File(downloadsDir, if (fileName.isNotEmpty()) fileName else "pushtoweb_backup.json")
            file.writeText(jsonContent)
            Toast.makeText(this, "Бэкап сохранен в папку Загрузки: ${file.name}", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Ошибка сохранения файла: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
}
