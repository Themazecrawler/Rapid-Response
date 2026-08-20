package com.example.rapidresponse.network

import com.example.rapidresponse.model.ApiEnvelope
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
    @POST("api/auth/sync")
    suspend fun syncProfile(@Body request: SyncUserRequest): Response<ApiEnvelope<UserProfile>>

    @GET("api/users/profile")
    suspend fun getProfile(): Response<ApiEnvelope<UserProfile>>

    @PUT("api/users/profile")
    suspend fun updateProfile(@Body request: SyncUserRequest): Response<ApiEnvelope<UserProfile>>

    @POST("api/alerts")
    suspend fun createAlert(@Body alert: EmergencyAlert): Response<ApiEnvelope<EmergencyAlert>>

    @GET("api/alerts/recent")
    suspend fun getRecentAlerts(): Response<ApiEnvelope<List<EmergencyAlert>>>

    @GET("api/users/alerts")
    suspend fun getMyAlerts(): Response<ApiEnvelope<List<EmergencyAlert>>>

    @GET("api/contacts")
    suspend fun getContacts(): Response<ApiEnvelope<List<EmergencyContact>>>
}
