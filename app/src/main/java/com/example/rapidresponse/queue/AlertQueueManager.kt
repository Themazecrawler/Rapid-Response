package com.example.rapidresponse.queue

import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkRequest
import androidx.work.workDataOf
import com.example.rapidresponse.local.PendingAlertDao
import com.example.rapidresponse.local.PendingAlertEntity
import com.example.rapidresponse.local.PendingAlertStatus
import com.example.rapidresponse.model.EmergencyAlert
import kotlinx.coroutines.flow.Flow
import java.util.UUID
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

// The single entry point for "send an alert reliably." Submitting writes to Room immediately
// (fast, local, can't fail due to network) and schedules a WorkManager job to deliver it;
// the UI can treat the write as done and move on instead of blocking on - or silently losing
// the result of - a single network request.
@Singleton
class AlertQueueManager @Inject constructor(
    private val dao: PendingAlertDao,
    private val workManager: WorkManager
) {
    fun observePending(): Flow<List<PendingAlertEntity>> = dao.observeAll()

    suspend fun enqueue(alert: EmergencyAlert): String {
        val clientAlertId = UUID.randomUUID().toString()
        dao.upsert(
            PendingAlertEntity(
                clientAlertId = clientAlertId,
                type = alert.type,
                description = alert.description,
                latitude = alert.latitude,
                longitude = alert.longitude,
                building = alert.building,
                floor = alert.floor,
                priority = alert.priority,
                reporterPhone = alert.reporterPhone,
                status = PendingAlertStatus.PENDING,
                attemptCount = 0,
                lastError = null,
                createdAtMillis = System.currentTimeMillis()
            )
        )
        scheduleDelivery(clientAlertId, ExistingWorkPolicy.REPLACE)
        return clientAlertId
    }

    // Re-arms delivery for a permanently failed alert (WorkManager gave up after
    // MAX_ATTEMPTS) when the user explicitly asks to retry.
    fun retry(clientAlertId: String) {
        scheduleDelivery(clientAlertId, ExistingWorkPolicy.REPLACE)
    }

    suspend fun discard(clientAlertId: String) {
        dao.deleteById(clientAlertId)
        workManager.cancelUniqueWork(uniqueWorkName(clientAlertId))
    }

    // Called once at app start: re-arms delivery for anything still marked "pending" whose
    // WorkManager job may not have survived (force-stop, work DB cleared, etc.). KEEP means
    // this never disturbs a job that's already scheduled or running.
    suspend fun resumePendingDeliveries() {
        dao.getAllPendingOnce().forEach { entity ->
            scheduleDelivery(entity.clientAlertId, ExistingWorkPolicy.KEEP)
        }
    }

    private fun scheduleDelivery(clientAlertId: String, policy: ExistingWorkPolicy) {
        val request = OneTimeWorkRequestBuilder<AlertSyncWorker>()
            .setInputData(workDataOf(AlertSyncWorker.KEY_CLIENT_ALERT_ID to clientAlertId))
            .setConstraints(
                Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
            )
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()
        workManager.enqueueUniqueWork(uniqueWorkName(clientAlertId), policy, request)
    }

    private fun uniqueWorkName(clientAlertId: String) = "alert-delivery-$clientAlertId"
}
