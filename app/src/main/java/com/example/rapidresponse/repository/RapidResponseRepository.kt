package com.example.rapidresponse.repository

import com.example.rapidresponse.model.AlertStats
import com.example.rapidresponse.model.DataOrException
import com.example.rapidresponse.model.DeviceTokenRequest
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.model.EmergencyContact
import com.example.rapidresponse.model.SyncUserRequest
import com.example.rapidresponse.model.UserProfile
import com.example.rapidresponse.network.ApiService
import javax.inject.Inject

class RapidResponseRepository @Inject constructor(private val api: ApiService) {

    suspend fun syncProfile(displayName: String, campus: String): DataOrException<UserProfile, Exception> {
        val result = DataOrException<UserProfile, Exception>(loading = true)
        try {
            val response = api.syncProfile(SyncUserRequest(displayName, campus))
            if (response.isSuccessful) {
                result.data = response.body()?.data
            } else {
                result.e = Exception(response.errorBody()?.string() ?: "Failed to sync profile")
            }
        } catch (e: Exception) {
            result.e = e
        }
        result.loading = false
        return result
    }

    suspend fun submitAlert(alert: EmergencyAlert): DataOrException<EmergencyAlert, Exception> {
        val result = DataOrException<EmergencyAlert, Exception>(loading = true)
        try {
            val response = api.createAlert(alert)
            if (response.isSuccessful) {
                result.data = response.body()?.data
            } else {
                result.e = Exception(response.errorBody()?.string() ?: "Failed to submit alert")
            }
        } catch (e: Exception) {
            result.e = e
        }
        result.loading = false
        return result
    }

    suspend fun getMyAlerts(): DataOrException<List<EmergencyAlert>, Exception> {
        val result = DataOrException<List<EmergencyAlert>, Exception>(loading = true)
        try {
            val response = api.getMyAlerts()
            if (response.isSuccessful) {
                result.data = response.body()?.data ?: emptyList()
            } else {
                result.e = Exception(response.errorBody()?.string() ?: "Failed to load alert history")
            }
        } catch (e: Exception) {
            result.e = e
        }
        result.loading = false
        return result
    }

    suspend fun getContacts(): DataOrException<List<EmergencyContact>, Exception> {
        val result = DataOrException<List<EmergencyContact>, Exception>(loading = true)
        try {
            val response = api.getContacts()
            if (response.isSuccessful) {
                result.data = response.body()?.data ?: emptyList()
            } else {
                result.e = Exception(response.errorBody()?.string() ?: "Failed to load contacts")
            }
        } catch (e: Exception) {
            result.e = e
        }
        result.loading = false
        return result
    }

    suspend fun getAlertStats(): DataOrException<AlertStats, Exception> {
        val result = DataOrException<AlertStats, Exception>(loading = true)
        try {
            val response = api.getAlertStats()
            if (response.isSuccessful) {
                result.data = response.body()?.data
            } else {
                result.e = Exception(response.errorBody()?.string() ?: "Failed to load statistics")
            }
        } catch (e: Exception) {
            result.e = e
        }
        result.loading = false
        return result
    }

    suspend fun getProfile(): DataOrException<UserProfile, Exception> {
        val result = DataOrException<UserProfile, Exception>(loading = true)
        try {
            val response = api.getProfile()
            if (response.isSuccessful) {
                result.data = response.body()?.data
            } else {
                result.e = Exception(response.errorBody()?.string() ?: "Failed to load profile")
            }
        } catch (e: Exception) {
            result.e = e
        }
        result.loading = false
        return result
    }

    // Best-effort: a failure here just means push notifications don't reach this device
    // until the next successful attempt, so callers don't need to treat it as fatal.
    suspend fun registerDeviceToken(token: String): DataOrException<Unit, Exception> {
        val result = DataOrException<Unit, Exception>(loading = true)
        try {
            val response = api.registerDeviceToken(DeviceTokenRequest(token))
            if (response.isSuccessful) {
                result.data = Unit
            } else {
                result.e = Exception(response.errorBody()?.string() ?: "Failed to register device token")
            }
        } catch (e: Exception) {
            result.e = e
        }
        result.loading = false
        return result
    }

    suspend fun getRecentAlerts(): DataOrException<List<EmergencyAlert>, Exception> {
        val result = DataOrException<List<EmergencyAlert>, Exception>(loading = true)
        try {
            val response = api.getRecentAlerts()
            if (response.isSuccessful) {
                result.data = response.body()?.data ?: emptyList()
            } else {
                result.e = Exception(response.errorBody()?.string() ?: "Failed to load recent alerts")
            }
        } catch (e: Exception) {
            result.e = e
        }
        result.loading = false
        return result
    }
}
