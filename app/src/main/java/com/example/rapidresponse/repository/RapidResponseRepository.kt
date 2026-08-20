package com.example.rapidresponse.repository

import com.example.rapidresponse.model.AlertStats
import com.example.rapidresponse.model.ApiEnvelope
import com.example.rapidresponse.model.DataOrException
import com.example.rapidresponse.model.DeviceTokenRequest
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.model.EmergencyContact
import com.example.rapidresponse.model.SyncUserRequest
import com.example.rapidresponse.model.UserProfile
import com.example.rapidresponse.network.ApiService
import retrofit2.Response
import javax.inject.Inject

class RapidResponseRepository @Inject constructor(private val api: ApiService) {

    // Every endpoint below follows the same shape: call it, unwrap the envelope on success,
    // fall back to the response/exception message on failure. These two helpers are the only
    // places that pattern needs to be written.

    private suspend fun <T> safeCall(
        errorMessage: String,
        default: T? = null,
        block: suspend () -> Response<ApiEnvelope<T>>
    ): DataOrException<T, Exception> {
        val result = DataOrException<T, Exception>(loading = true)
        try {
            val response = block()
            if (response.isSuccessful) {
                result.data = response.body()?.data ?: default
            } else {
                result.e = Exception(response.errorBody()?.string() ?: errorMessage)
            }
        } catch (e: Exception) {
            result.e = e
        }
        result.loading = false
        return result
    }

    // For the handful of endpoints (currently just device-token registration) that don't
    // return an ApiEnvelope body at all.
    private suspend fun safeUnitCall(
        errorMessage: String,
        block: suspend () -> Response<Unit>
    ): DataOrException<Unit, Exception> {
        val result = DataOrException<Unit, Exception>(loading = true)
        try {
            val response = block()
            if (response.isSuccessful) {
                result.data = Unit
            } else {
                result.e = Exception(response.errorBody()?.string() ?: errorMessage)
            }
        } catch (e: Exception) {
            result.e = e
        }
        result.loading = false
        return result
    }

    suspend fun syncProfile(displayName: String, campus: String): DataOrException<UserProfile, Exception> =
        safeCall("Failed to sync profile") { api.syncProfile(SyncUserRequest(displayName, campus)) }

    suspend fun submitAlert(alert: EmergencyAlert): DataOrException<EmergencyAlert, Exception> =
        safeCall("Failed to submit alert") { api.createAlert(alert) }

    suspend fun getMyAlerts(): DataOrException<List<EmergencyAlert>, Exception> =
        safeCall("Failed to load alert history", default = emptyList()) { api.getMyAlerts() }

    suspend fun getContacts(): DataOrException<List<EmergencyContact>, Exception> =
        safeCall("Failed to load contacts", default = emptyList()) { api.getContacts() }

    suspend fun getAlertStats(): DataOrException<AlertStats, Exception> =
        safeCall("Failed to load statistics") { api.getAlertStats() }

    suspend fun getProfile(): DataOrException<UserProfile, Exception> =
        safeCall("Failed to load profile") { api.getProfile() }

    // Best-effort: a failure here just means push notifications don't reach this device
    // until the next successful attempt, so callers don't need to treat it as fatal.
    suspend fun registerDeviceToken(token: String): DataOrException<Unit, Exception> =
        safeUnitCall("Failed to register device token") { api.registerDeviceToken(DeviceTokenRequest(token)) }

    suspend fun getRecentAlerts(): DataOrException<List<EmergencyAlert>, Exception> =
        safeCall("Failed to load recent alerts", default = emptyList()) { api.getRecentAlerts() }
}
