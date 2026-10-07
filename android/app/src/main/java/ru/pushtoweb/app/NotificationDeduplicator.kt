package ru.pushtoweb.app

import android.app.Notification
import android.os.Build
import android.service.notification.StatusBarNotification
import java.util.Collections
import java.util.concurrent.ConcurrentHashMap

object NotificationDeduplicator {
    // Map of notification key -> Set of previously sent line/message strings
    private val keyToSentItems = ConcurrentHashMap<String, MutableSet<String>>()

    // Map of notification key -> Last full raw text sent
    private val keyToLastText = ConcurrentHashMap<String, String>()

    // Global cache of recently sent message hashes to avoid duplicate posts across short intervals (10 mins)
    private val globalSentCache = ConcurrentHashMap<String, Long>()

    private const val CACHE_EXPIRATION_MS = 10 * 60 * 1000L // 10 minutes

    fun processNotification(sbn: StatusBarNotification): List<String> {
        val extras = sbn.notification.extras ?: return emptyList()
        val appPackage = sbn.packageName ?: ""
        val sbnKey = sbn.key ?: "${appPackage}_${sbn.id}"

        val title = (extras.getCharSequence(Notification.EXTRA_TITLE)
            ?: extras.getCharSequence(Notification.EXTRA_TITLE_BIG)
            ?: "").toString().trim()

        val sentSet = keyToSentItems.getOrPut(sbnKey) {
            Collections.newSetFromMap(ConcurrentHashMap())
        }

        val now = System.currentTimeMillis()
        cleanOldCache(now)

        val newItems = mutableListOf<String>()

        // 1. Try Notification.EXTRA_MESSAGES (MessagingStyle)
        val rawMessages = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
        if (!rawMessages.isNullOrEmpty()) {
            for (item in rawMessages) {
                val msgText = when (item) {
                    is android.os.Bundle -> item.getCharSequence("text")?.toString()?.trim() ?: ""
                    else -> ""
                }
                if (msgText.isNotEmpty() && shouldSend(sbnKey, appPackage, title, msgText, sentSet, now)) {
                    newItems.add(msgText)
                }
            }
            if (newItems.isNotEmpty()) return newItems
        }

        // 2. Try Notification.EXTRA_TEXT_LINES (InboxStyle)
        val lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        if (!lines.isNullOrEmpty()) {
            for (line in lines) {
                val lineStr = line?.toString()?.trim() ?: ""
                if (lineStr.isNotEmpty() && shouldSend(sbnKey, appPackage, title, lineStr, sentSet, now)) {
                    newItems.add(lineStr)
                }
            }
            if (newItems.isNotEmpty()) return newItems
        }

        // 3. Fallback to EXTRA_BIG_TEXT / EXTRA_TEXT / tickerText
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val summaryText = extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString()?.trim() ?: ""
        val tickerText = sbn.notification.tickerText?.toString()?.trim() ?: ""

        val rawText = when {
            bigText.isNotEmpty() -> bigText
            text.isNotEmpty() -> text
            summaryText.isNotEmpty() -> summaryText
            tickerText.isNotEmpty() -> tickerText
            else -> ""
        }

        if (rawText.isEmpty()) {
            // Title-only notification if title is present and hasn't been sent
            if (title.isNotEmpty() && shouldSend(sbnKey, appPackage, title, title, sentSet, now)) {
                newItems.add(title)
            }
            return newItems
        }

        val lastText = keyToLastText[sbnKey] ?: ""

        // Delta check: if rawText starts with lastText, extract only the new suffix
        val deltaText = if (lastText.isNotEmpty() && rawText.startsWith(lastText)) {
            rawText.substring(lastText.length).trim()
        } else {
            rawText
        }

        keyToLastText[sbnKey] = rawText

        if (deltaText.isNotEmpty()) {
            // If deltaText contains multiple newlines, split into separate message items
            val splitLines = deltaText.split("\n").map { it.trim() }.filter { it.isNotEmpty() }
            for (l in splitLines) {
                if (shouldSend(sbnKey, appPackage, title, l, sentSet, now)) {
                    newItems.add(l)
                }
            }
        }

        return newItems
    }

    private fun shouldSend(
        sbnKey: String,
        packageName: String,
        title: String,
        itemText: String,
        sentSet: MutableSet<String>,
        now: Long
    ): Boolean {
        if (itemText.isEmpty()) return false
        val globalHash = "$packageName|$title|$itemText"

        val alreadyInKeySet = sentSet.contains(itemText)
        val lastGlobalTime = globalSentCache[globalHash]
        val alreadyGlobal = lastGlobalTime != null && (now - lastGlobalTime < CACHE_EXPIRATION_MS)

        if (!alreadyInKeySet && !alreadyGlobal) {
            sentSet.add(itemText)
            globalSentCache[globalHash] = now
            return true
        }
        return false
    }

    fun onNotificationRemoved(sbnKey: String) {
        keyToSentItems.remove(sbnKey)
        keyToLastText.remove(sbnKey)
    }

    private fun cleanOldCache(now: Long) {
        if (globalSentCache.size > 300) {
            val iterator = globalSentCache.entries.iterator()
            while (iterator.hasNext()) {
                val entry = iterator.next()
                if (now - entry.value > CACHE_EXPIRATION_MS) {
                    iterator.remove()
                }
            }
        }
    }
}
