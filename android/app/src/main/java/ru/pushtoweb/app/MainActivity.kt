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

    private var downloadThread: Thread? = null
    private var pendingApkFile: java.io.File? = null

    companion object {
        private const val REQUEST_CODE_CREATE_FILE = 2001
        private const val REQUEST_CODE_INSTALL_PERM = 2002
    }

    override fun onDestroy() {
        super.onDestroy()
        downloadThread?.interrupt()
    }

    fun cleanDownloadedApkFiles() {
        try {
            val updateDir = java.io.File(getExternalFilesDir(null), "updates")
            if (updateDir.exists()) {
                val files = updateDir.listFiles()
                files?.forEach { f ->
                    if (f.name.endsWith(".apk")) {
                        val deleted = f.delete()
                        Log.d("PushToWeb", "Cleanup old update APK ${f.name}: $deleted")
                    }
                }
            }
            pendingApkFile = null
        } catch (e: Exception) {
            Log.e("PushToWeb", "Failed to clean old update APKs", e)
        }
    }

    fun downloadAndInstallApk(apkUrl: String, customFileName: String?) {
        downloadThread?.interrupt()

        val fileName = if (!customFileName.isNullOrEmpty() && customFileName.endsWith(".apk")) {
            customFileName
        } else {
            "PushToWeb-update.apk"
        }

        downloadThread = Thread {
            var input: java.io.InputStream? = null
            var output: java.io.FileOutputStream? = null
            var connection: java.net.HttpURLConnection? = null
            var downloadedFile: java.io.File? = null

            try {
                notifyDownloadProgress(0, 0, "Подключение к серверу...")

                val updateDir = java.io.File(getExternalFilesDir(null), "updates")
                if (!updateDir.exists()) {
                    updateDir.mkdirs()
                }

                // Delete any old APK files first to save storage
                updateDir.listFiles()?.forEach { if (it.name.endsWith(".apk")) it.delete() }

                downloadedFile = java.io.File(updateDir, fileName)
                pendingApkFile = downloadedFile

                // Follow redirects (GitHub releases redirect to AWS S3/objects)
                var currentUrl = apkUrl
                var redirects = 0
                while (redirects < 5) {
                    val urlObj = java.net.URL(currentUrl)
                    connection = (urlObj.openConnection() as java.net.HttpURLConnection).apply {
                        instanceFollowRedirects = false
                        connectTimeout = 15000
                        readTimeout = 30000
                        setRequestProperty("User-Agent", "PushToWeb-Android/${Config.APP_VERSION_NAME}")
                    }
                    val code = connection.responseCode
                    if (code == java.net.HttpURLConnection.HTTP_MOVED_PERM ||
                        code == java.net.HttpURLConnection.HTTP_MOVED_TEMP ||
                        code == java.net.HttpURLConnection.HTTP_SEE_OTHER ||
                        code == 307 || code == 308) {
                        val newLocation = connection.getHeaderField("Location")
                        if (!newLocation.isNullOrEmpty()) {
                            currentUrl = newLocation
                            redirects++
                            continue
                        }
                    }
                    break
                }

                if (connection?.responseCode != java.net.HttpURLConnection.HTTP_OK) {
                    throw Exception("HTTP ошибка сервера: ${connection?.responseCode} ${connection?.responseMessage}")
                }

                val fileLength = connection.contentLength
                input = connection.inputStream
                output = java.io.FileOutputStream(downloadedFile)

                val data = ByteArray(8192)
                var total: Long = 0
                var count: Int
                var lastProgressUpdate = 0L

                while (input.read(data).also { count = it } != -1) {
                    if (Thread.currentThread().isInterrupted) {
                        downloadedFile.delete()
                        notifyDownloadFailed("Загрузка отменена")
                        return@Thread
                    }
                    total += count.toLong()
                    output.write(data, 0, count)

                    val now = System.currentTimeMillis()
                    if (fileLength > 0 && (now - lastProgressUpdate > 150 || total == fileLength.toLong())) {
                        lastProgressUpdate = now
                        val percent = ((total * 100) / fileLength).toInt()
                        notifyDownloadProgress(percent, total, "")
                    }
                }

                output.flush()
                notifyDownloadProgress(100, total, "Загрузка завершена")

                // Launch package installer
                runOnUiThread {
                    installApk(downloadedFile)
                }

            } catch (e: Exception) {
                if (Thread.currentThread().isInterrupted) {
                    downloadedFile?.delete()
                    notifyDownloadFailed("Загрузка отменена")
                } else {
                    Log.e("PushToWeb", "Error downloading APK: ${e.message}", e)
                    downloadedFile?.delete()
                    notifyDownloadFailed(e.message ?: "Ошибка загрузки APK")
                }
            } finally {
                try { input?.close() } catch (ignored: Exception) {}
                try { output?.close() } catch (ignored: Exception) {}
                connection?.disconnect()
            }
        }.apply { start() }
    }

    fun cancelApkDownload() {
        downloadThread?.interrupt()
        downloadThread = null
        cleanDownloadedApkFiles()
    }

    private fun notifyDownloadProgress(percent: Int, bytesDownloaded: Long, status: String) {
        runOnUiThread {
            val safeStatus = status.replace("'", "\\'")
            webView.evaluateJavascript(
                "if (window.__onApkDownloadProgress) window.__onApkDownloadProgress($percent, $bytesDownloaded, '$safeStatus');",
                null
            )
        }
    }

    private fun notifyDownloadFailed(error: String) {
        runOnUiThread {
            val safeErr = error.replace("'", "\\'").replace("\n", " ")
            webView.evaluateJavascript(
                "if (window.__onApkDownloadError) window.__onApkDownloadError('$safeErr');",
                null
            )
            Toast.makeText(this, "Ошибка скачивания: $error", Toast.LENGTH_SHORT).show()
        }
    }

    fun installApk(apkFile: java.io.File) {
        if (!apkFile.exists()) {
            Toast.makeText(this, "Файл APK не найден", Toast.LENGTH_SHORT).show()
            return
        }
        pendingApkFile = apkFile

        // Check Unknown sources permission on Android 8.0+ (Oreo+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!packageManager.canRequestPackageInstalls()) {
                try {
                    val intent = Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivityForResult(intent, REQUEST_CODE_INSTALL_PERM)
                    Toast.makeText(this, "Разрешите установку обновлений для приложения", Toast.LENGTH_LONG).show()
                    return
                } catch (e: Exception) {
                    Log.e("PushToWeb", "Failed to open unknown app sources settings", e)
                }
            }
        }

        try {
            val apkUri = androidx.core.content.FileProvider.getUriForFile(
                this,
                "$packageName.fileprovider",
                apkFile
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)

            webView.evaluateJavascript(
                "if (window.__onApkInstallStarted) window.__onApkInstallStarted();",
                null
            )
        } catch (e: Exception) {
            Log.e("PushToWeb", "Error starting package installer: ${e.message}", e)
            Toast.makeText(this, "Не удалось запустить установщик: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onResume() {
        super.onResume()
        // If an update was installed or app is resumed, clean up old APKs if version changed or requested
        cleanDownloadedApkFiles()
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
        } else if (requestCode == REQUEST_CODE_INSTALL_PERM) {
            val apk = pendingApkFile
            if (apk != null && apk.exists()) {
                installApk(apk)
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
