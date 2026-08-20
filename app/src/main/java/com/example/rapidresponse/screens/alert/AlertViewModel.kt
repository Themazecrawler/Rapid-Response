package com.example.rapidresponse.screens.alert

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.queue.AlertQueueManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class SubmitState {
    object Idle : SubmitState()
    object Submitting : SubmitState()
    object Success : SubmitState()
    data class Error(val message: String) : SubmitState()
}

@HiltViewModel
class AlertViewModel @Inject constructor(
    private val queueManager: AlertQueueManager
) : ViewModel() {

    private val _submitState = MutableStateFlow<SubmitState>(SubmitState.Idle)
    val submitState: StateFlow<SubmitState> = _submitState

    // Queuing is a local DB write, not a network call, so this can't fail the way a direct
    // API call could - "success" here means "durably saved and will be delivered," not
    // "the server has it yet." Actual delivery happens in the background via
    // AlertSyncWorker and is visible on the History screen.
    fun submitAlert(alert: EmergencyAlert) {
        viewModelScope.launch {
            _submitState.value = SubmitState.Submitting
            queueManager.enqueue(alert)
            _submitState.value = SubmitState.Success
        }
    }

    fun resetState() {
        _submitState.value = SubmitState.Idle
    }
}
