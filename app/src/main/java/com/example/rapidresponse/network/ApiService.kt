package com.example.rapidresponse.network

import com.example.rapidresponse.model.AlertStats
import com.example.rapidresponse.model.ApiEnvelope
import com.example.rapidresponse.model.DeviceTokenRequest
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.model.EmergencyContact
import com.example.rapidresponse.model.SyncUserRequest
import com.example.rapidresponse.model.UserProfile
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT

interface ApiService {

    // Creates/updates the Postgres profile row for the currently signed-in Firebase user.
    @POST("api/v1/auth/sync")
    suspend fun syncProfile(@Body request: SyncUserRequest): Response<ApiEnvelope<UserProfile>>

    @GET("api/v1/users/profile")
    suspend fun getProfile(): Response<ApiEnvelope<UserProfile>>

    @PUT("api/v1/users/profile")
    suspend fun updateProfile(@Body request: SyncUserRequest): Response<ApiEnvelope<UserProfile>>

    @POST("api/v1/alerts")
    suspend fun createAlert(@Body alert: EmergencyAlert): Response<ApiEnvelope<EmergencyAlert>>

    @GET("api/v1/alerts/recent")
    suspend fun getRecentAlerts(): Response<ApiEnvelope<List<EmergencyAlert>>>

    @GET("api/v1/users/alerts")
    suspend fun getMyAlerts(): Response<ApiEnvelope<List<EmergencyAlert>>>

    @GET("api/v1/contacts")
    suspend fun getContacts(): Response<ApiEnvelope<List<EmergencyContact>>>

    @GET("api/v1/alerts/stats")
    suspend fun getAlertStats(): Response<ApiEnvelope<AlertStats>>

    @POST("api/v1/users/device-token")
    suspend fun registerDeviceToken(@Body request: DeviceTokenRequest): Response<Unit>
}
