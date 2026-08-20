package com.example.rapidresponse.notifications

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

// Bridges "a notification was tapped" (which can happen from a background service or a cold
// app start, both outside any Compose scope) to the NavHost, which observes pendingRoute and
// navigates once it's composed. Deliberately a plain singleton rather than something
// Hilt-scoped: navigation intent is process-wide UI state, not a dependency to inject.
object NotificationNavigator {
    private val _pendingRoute = MutableStateFlow<String?>(null)
    val pendingRoute: StateFlow<String?> = _pendingRoute

    fun navigateTo(route: String) {
        _pendingRoute.value = route
    }

    fun consume() {
        _pendingRoute.value = null
    }
}
