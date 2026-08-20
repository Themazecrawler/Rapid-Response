package com.example.rapidresponse.screens.alert

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.repository.RapidResponseRepository
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
    private val repository: RapidResponseRepository
) : ViewModel() {

    private val _submitState = MutableStateFlow<SubmitState>(SubmitState.Idle)
    val submitState: StateFlow<SubmitState> = _submitState

    fun submitAlert(alert: EmergencyAlert) {
        viewModelScope.launch {
            _submitState.value = SubmitState.Submitting
            val result = repository.submitAlert(alert)
            _submitState.value = if (result.e == null) {
                SubmitState.Success
            } else {
                SubmitState.Error(result.e?.message ?: "Failed to submit alert")
            }
        }
    }

    fun resetState() {
        _submitState.value = SubmitState.Idle
    }
}
