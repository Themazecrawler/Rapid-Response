package com.example.rapidresponse.local

import androidx.room.Entity
import androidx.room.PrimaryKey

object PendingAlertStatus {
    const val PENDING = "pending"
    const val FAILED = "failed"
}

// An alert that's been accepted from the user but not yet confirmed delivered to the
// backend. Written synchronously on submit (see AlertQueueManager.enqueue) so the app never
// depends on a live network call to "save" an alert - only to deliver one.
@Entity(tableName = "pending_alerts")
data class PendingAlertEntity(
    @PrimaryKey val clientAlertId: String,
    val type: String,
    val description: String,
    val latitude: Double?,
    val longitude: Double?,
    val building: String?,
    val floor: String?,
    val priority: String,
    val reporterPhone: String?,
    val status: String,
    val attemptCount: Int,
    val lastError: String?,
    val createdAtMillis: Long
)
