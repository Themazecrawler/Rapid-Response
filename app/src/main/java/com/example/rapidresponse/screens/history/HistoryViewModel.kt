package com.example.rapidresponse.screens.history

import androidx.lifecycle.viewModelScope
import com.example.rapidresponse.local.PendingAlertEntity
import com.example.rapidresponse.model.DataOrException
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.queue.AlertQueueManager
import com.example.rapidresponse.repository.RapidResponseRepository
import com.example.rapidresponse.viewmodel.LoadableViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val repository: RapidResponseRepository,
    private val queueManager: AlertQueueManager
) : LoadableViewModel<List<EmergencyAlert>>(emptyList()) {

    val alerts: StateFlow<List<EmergencyAlert>> get() = data

    override suspend fun fetch(): DataOrException<List<EmergencyAlert>, Exception> =
        repository.getMyAlerts()

    // Alerts saved on this device but not yet confirmed delivered - surfaced here so a
    // failed/slow delivery is visible to the user rather than silently retried in the
    // background with no way to tell.
    private val _pendingAlerts = MutableStateFlow<List<PendingAlertEntity>>(emptyList())
    val pendingAlerts: StateFlow<List<PendingAlertEntity>> = _pendingAlerts

    init {
        viewModelScope.launch {
            queueManager.observePending().collect { _pendingAlerts.value = it }
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
