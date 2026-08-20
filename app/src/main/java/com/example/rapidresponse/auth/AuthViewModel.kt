package com.example.rapidresponse.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.rapidresponse.repository.RapidResponseRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.UserProfileChangeRequest
import com.google.firebase.messaging.FirebaseMessaging
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val firebaseAuth: FirebaseAuth,
    private val repository: RapidResponseRepository
) : ViewModel() {

    private val _user = MutableStateFlow(firebaseAuth.currentUser)
    val user: StateFlow<FirebaseUser?> = _user

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading

    // Populated from the Postgres profile (Firebase doesn't know about roles). Used to
    // decide whether this device should see the campus-wide "Incoming Alerts" screen -
    // push notifications only go to security/admin, so this gates the matching UI.
    private val _role = MutableStateFlow<String?>(null)
    val role: StateFlow<String?> = _role

    private val authStateListener = FirebaseAuth.AuthStateListener { auth ->
        _user.value = auth.currentUser
        if (auth.currentUser != null) {
            onSignedIn()
        } else {
            _role.value = null
        }
    }

    init {
        firebaseAuth.addAuthStateListener(authStateListener)
    }

    override fun onCleared() {
        firebaseAuth.removeAuthStateListener(authStateListener)
    }

    private fun onSignedIn() {
        viewModelScope.launch {
            val profileResult = repository.getProfile()
            _role.value = profileResult.data?.role
        }
        viewModelScope.launch {
            try {
                val token = FirebaseMessaging.getInstance().token.await()
                repository.registerDeviceToken(token)
            } catch (e: Exception) {
                // Best-effort - see registerDeviceToken's contract. Nothing actionable to do
                // here beyond not crashing; the next app open/token refresh will retry.
            }
        }
    }

    fun signIn(email: String, password: String, onError: (String) -> Unit, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _loading.value = true
            try {
                firebaseAuth.signInWithEmailAndPassword(email, password).await()
                onSuccess()
            } catch (e: Exception) {
                onError(e.message ?: "Sign in failed")
            } finally {
                _loading.value = false
            }
        }
    }

    fun signUp(
        email: String,
        password: String,
        displayName: String,
        campus: String,
        onError: (String) -> Unit,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _loading.value = true
            try {
                val result = firebaseAuth.createUserWithEmailAndPassword(email, password).await()
                val profileUpdate = UserProfileChangeRequest.Builder()
                    .setDisplayName(displayName)
                    .build()
                result.user?.updateProfile(profileUpdate)?.await()

                // Create the matching Postgres profile row (role/campus live in our own DB,
                // Firebase only owns the identity/credentials).
                val syncResult = repository.syncProfile(displayName, campus)
                if (syncResult.e != null) {
                    onError(syncResult.e?.message ?: "Account created, but profile sync failed")
                    return@launch
                }
                onSuccess()
            } catch (e: Exception) {
                onError(e.message ?: "Registration failed")
            } finally {
                _loading.value = false
            }
        }
    }

    fun signOut() {
        firebaseAuth.signOut()
    }
}
