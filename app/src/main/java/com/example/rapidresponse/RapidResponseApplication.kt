package com.example.rapidresponse

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.example.rapidresponse.notifications.NotificationChannels
import com.example.rapidresponse.queue.AlertQueueManager
import com.google.android.libraries.places.api.Places
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltAndroidApp
class RapidResponseApplication : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    @Inject
    lateinit var alertQueueManager: AlertQueueManager

    override fun onCreate() {
        super.onCreate()
        if (!Places.isInitialized()) {
            Places.initialize(applicationContext, BuildConfig.MAPS_API_KEY)
        }

        NotificationChannels.createAll(this)

        // Re-arm delivery for any alert still marked "pending" whose WorkManager job may not
        // have survived (force-stop, work DB cleared) - a cold-start safety net on top of
        // WorkManager's own persistence, not a replacement for it.
        CoroutineScope(Dispatchers.IO).launch {
            alertQueueManager.resumePendingDeliveries()
        }
    }

    override fun getWorkManagerConfiguration(): Configuration =
        Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()
}
