package com.example.rapidresponse.queue

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.rapidresponse.local.PendingAlertDao
import com.example.rapidresponse.local.PendingAlertStatus
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.network.ApiException
import com.example.rapidresponse.repository.RapidResponseRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

private const val MAX_ATTEMPTS = 8

// Runs in the background - possibly minutes or hours after the user hit "Send" - so it must
// not assume anything about UI lifecycle. WorkManager guarantees this runs (with backoff)
// until it returns success/failure, surviving process death and, once network returns,
// device reboots.
@HiltWorker
class AlertSyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val repository: RapidResponseRepository,
    private val dao: PendingAlertDao
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val KEY_CLIENT_ALERT_ID = "client_alert_id"
    }

    override suspend fun doWork(): Result {
        val clientAlertId = inputData.getString(KEY_CLIENT_ALERT_ID) ?: return Result.failure()
        val pending = dao.getById(clientAlertId) ?: return Result.success() // already delivered or discarded

        val alert = EmergencyAlert(
            type = pending.type,
            description = pending.description,
            latitude = pending.latitude,
            longitude = pending.longitude,
            building = pending.building,
            floor = pending.floor,
            priority = pending.priority,
            reporterPhone = pending.reporterPhone,
            clientAlertId = pending.clientAlertId
        )

        val result = repository.submitAlert(alert)

        if (result.e == null) {
            dao.deleteById(clientAlertId)
            return Result.success()
        }

        val error = result.e
        val attempts = pending.attemptCount + 1
        val isPermanentFailure = error is ApiException && !error.isRetryable
        return if (isPermanentFailure || attempts >= MAX_ATTEMPTS) {
            dao.update(
                pending.copy(
                    attemptCount = attempts,
                    status = PendingAlertStatus.FAILED,
                    lastError = error?.message
                )
            )
            Result.failure()
        } else {
            dao.update(pending.copy(attemptCount = attempts, lastError = error?.message))
            Result.retry()
        }
    }
}
