package com.example.rapidresponse.screens.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.rapidresponse.local.PendingAlertEntity
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.queue.AlertQueueManager
import com.example.rapidresponse.repository.RapidResponseRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val repository: RapidResponseRepository,
    private val queueManager: AlertQueueManager
) : ViewModel() {

    private val _alerts = MutableStateFlow<List<EmergencyAlert>>(emptyList())
    val alerts: StateFlow<List<EmergencyAlert>> = _alerts

    private val _loading = MutableStateFlow(true)
    val loading: StateFlow<Boolean> = _loading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    // Alerts saved on this device but not yet confirmed delivered - surfaced here so a
    // failed/slow delivery is visible to the user rather than silently retried in the
    // background with no way to tell.
    private val _pendingAlerts = MutableStateFlow<List<PendingAlertEntity>>(emptyList())
    val pendingAlerts: StateFlow<List<PendingAlertEntity>> = _pendingAlerts

    init {
        load()
        viewModelScope.launch {
            queueManager.observePending().collect { _pendingAlerts.value = it }
        }
    }

    fun load() {
        viewModelScope.launch {
            _loading.value = true
            val result = repository.getMyAlerts()
            _alerts.value = result.data ?: emptyList()
            _error.value = result.e?.message
            _loading.value = false
        }
    }

    fun retry(clientAlertId: String) {
        queueManager.retry(clientAlertId)
    }

    fun discard(clientAlertId: String) {
        viewModelScope.launch {
            queueManager.discard(clientAlertId)
        }
    }
}
