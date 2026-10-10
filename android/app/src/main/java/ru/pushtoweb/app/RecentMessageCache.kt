package ru.pushtoweb.app

import java.util.concurrent.CopyOnWriteArrayList

object RecentMessageCache {
    data class RecentItem(
        val sender: String,
        val text: String,
        val normalizedText: String,
        val timestamp: Long
    )

    private val recentSmsList = CopyOnWriteArrayList<RecentItem>()
    private const val SMS_EXPIRATION_MS = 60 * 1000L // 60 seconds deduplication window

    fun recordSentSms(sender: String, text: String) {
        val now = System.currentTimeMillis()
        cleanOld(now)
        val normalized = normalize(text)
        recentSmsList.add(RecentItem(sender.trim(), text.trim(), normalized, now))
    }

    fun hasRecentSmsFrom(sender: String): Boolean {
        val now = System.currentTimeMillis()
        cleanOld(now)
        val cleanSender = sender.trim().lowercase()
        if (cleanSender.isEmpty()) return false
        return recentSmsList.any {
            it.sender.lowercase() == cleanSender ||
            (cleanSender.length >= 4 && it.sender.lowercase().contains(cleanSender)) ||
            (it.sender.length >= 4 && cleanSender.contains(it.sender.lowercase()))
        }
    }

    fun isDuplicateOfRecentSms(sender: String, title: String, text: String): Boolean {
        if (text.isBlank()) return false
        val now = System.currentTimeMillis()
        cleanOld(now)

        val notifNorm = normalize(text)
        if (notifNorm.isEmpty()) return false

        val cleanSender = sender.trim().lowercase()
        val cleanTitle = title.trim().lowercase()

        for (item in recentSmsList) {
            // 1. Exact or normalized text match
            if (item.normalizedText == notifNorm) {
                return true
            }

            // 2. Substring match (e.g. if notification text is preview or contains SMS text)
            if (notifNorm.length > 20 && item.normalizedText.length > 20) {
                if (notifNorm.contains(item.normalizedText) || item.normalizedText.contains(notifNorm)) {
                    return true
                }
            }

            // 3. Sender matches and prefix matches (at least 25 characters)
            val senderMatches = item.sender.lowercase() == cleanSender ||
                item.sender.lowercase() == cleanTitle ||
                (cleanSender.isNotEmpty() && cleanSender.contains(item.sender.lowercase())) ||
                (cleanTitle.isNotEmpty() && cleanTitle.contains(item.sender.lowercase()))

            if (senderMatches && notifNorm.length >= 25 && item.normalizedText.length >= 25) {
                val prefixLen = minOf(30, minOf(notifNorm.length, item.normalizedText.length))
                if (notifNorm.substring(0, prefixLen) == item.normalizedText.substring(0, prefixLen)) {
                    return true
                }
            }
        }

        return false
    }

    private fun normalize(str: String): String {
        return str.lowercase()
            .replace(Regex("[^a-zа-я0-9]"), "")
    }

    private fun cleanOld(now: Long) {
        recentSmsList.removeIf { now - it.timestamp > SMS_EXPIRATION_MS }
    }
}
