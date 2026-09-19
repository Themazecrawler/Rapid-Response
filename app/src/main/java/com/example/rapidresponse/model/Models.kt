package com.example.rapidresponse.model

data class UserProfile(
    val id: Int? = null,
    val email: String? = null,
    val displayName: String? = null,
    val role: String? = null,
    val campus: String? = null,
    val createdAt: String? = null
)

data class SyncUserRequest(
    val displayName: String,
    val campus: String
)

data class DeviceTokenRequest(
    val token: String
)

data class EmergencyAlert(
    val id: Int? = null,
    val type: String,
    val description: String,
    val latitude: Double?,
    val longitude: Double?,
    val building: String?,
    val floor: String?,
    val priority: String,
    val status: String? = null,
    val createdAt: String? = null,
    val reporterName: String? = null,
    val reporterPhone: String? = null,
    // Client-generated dedup key so a WorkManager retry of an alert that actually already
    // landed doesn't create a duplicate row server-side.
    val clientAlertId: String? = null
)

data class EmergencyContact(
    val id: Int? = null,
    val name: String,
    val role: String,
    val phone: String,
    val email: String,
    val department: String,
    val available: Boolean = true
)

data class AvailabilityRequest(
    val available: Boolean
)

data class ApiEnvelope<T>(
    val success: Boolean,
    val data: T? = null
)

data class CountEntry(
    val label: String,
    val count: Int
)

data class AlertStats(
    val totalAlerts: Int,
    val activeAlerts: Int,
    val investigatingAlerts: Int,
    val resolvedAlerts: Int,
    val byType: List<CountEntry>,
    val byPriority: List<CountEntry>,
    val byDayOfWeek: List<CountEntry>,
    val mostCommonType: String?,
    val busiestDay: String?
)
