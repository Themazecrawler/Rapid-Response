package com.example.rapidresponse.notifications

import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.example.rapidresponse.MainActivity
import com.example.rapidresponse.R
import com.example.rapidresponse.navigation.Screen
import com.example.rapidresponse.repository.RapidResponseRepository
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.random.Random

// Registered in the manifest; the FCM SDK instantiates this itself, which is why the
// repository has to come in via field injection rather than a constructor.
@AndroidEntryPoint
class RapidResponseFirebaseMessagingService : FirebaseMessagingService() {

    @Inject
    lateinit var repository: RapidResponseRepository

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Tokens rotate (app reinstall, data clear, FCM-initiated refresh); re-register
        // whenever that happens so delivery doesn't silently stop.
        serviceScope.launch {
            repository.registerDeviceToken(token)
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        if (message.data["type"] != "new_alert") return

        val alertType = message.data["alertType"] ?: "Alert"
        val priority = message.data["priority"]?.replaceFirstChar { it.uppercase() }
        val building = message.data["building"]?.takeIf { it.isNotBlank() }
        val description = message.data["description"] ?: ""

        val title = buildString {
            append(if (priority != null) "$priority priority: $alertType" else alertType)
        }
        val body = buildString {
            append(description)
            if (building != null) append(if (isEmpty()) "Near $building" else " · Near $building")
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(MainActivity.EXTRA_NAVIGATE_TO, Screen.IncomingAlertsScreen.route)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, NotificationChannels.NEW_ALERTS)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(this).notify(Random.nextInt(), notification)
    }
}
