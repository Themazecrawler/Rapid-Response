package com.example.rapidresponse.network

import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import okhttp3.Interceptor
import okhttp3.Response
import java.util.concurrent.TimeUnit
import javax.inject.Inject

/**
 * Every backend route requires a Firebase ID token (see backend's authenticateFirebaseToken
 * middleware), so we attach the current user's token to every outgoing request here rather
 * than threading it through each call site.
 */
class FirebaseAuthInterceptor @Inject constructor(
    private val firebaseAuth: FirebaseAuth
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val user = firebaseAuth.currentUser
        val request = chain.request()

        if (user == null) {
            return chain.proceed(request)
        }

        val token = try {
            Tasks.await(user.getIdToken(false), 10, TimeUnit.SECONDS).token
        } catch (e: Exception) {
            null
        }

        val authenticatedRequest = if (token != null) {
            request.newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            request
        }

        return chain.proceed(authenticatedRequest)
    }
}
