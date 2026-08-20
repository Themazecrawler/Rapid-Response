package com.example.rapidresponse.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.rapidresponse.repository.RapidResponseRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.UserProfileChangeRequest
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

    private val authStateListener = FirebaseAuth.AuthStateListener { auth ->
        _user.value = auth.currentUser
    }

    init {
        firebaseAuth.addAuthStateListener(authStateListener)
    }

    override fun onCleared() {
        firebaseAuth.removeAuthStateListener(authStateListener)
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
