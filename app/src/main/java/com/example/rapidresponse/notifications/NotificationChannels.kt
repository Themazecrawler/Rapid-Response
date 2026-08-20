package com.example.rapidresponse.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

object NotificationChannels {
    const val NEW_ALERTS = "new_alerts"

    fun createAll(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val channel = NotificationChannel(
            NEW_ALERTS,
            "New emergency alerts",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Notifies security/admin staff when a new emergency alert is reported"
        }

        val manager = context.getSystemService(NotificationManager::class.java)
        manager?.createNotificationChannel(channel)
    }
}
