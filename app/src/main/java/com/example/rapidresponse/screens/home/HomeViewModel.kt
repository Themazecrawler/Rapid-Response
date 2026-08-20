package com.example.rapidresponse.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.rapidresponse.local.PendingAlertStatus
import com.example.rapidresponse.queue.AlertQueueManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    queueManager: AlertQueueManager
) : ViewModel() {

    private val _pendingCount = MutableStateFlow(0)
    val pendingCount: StateFlow<Int> = _pendingCount

    private val _hasFailed = MutableStateFlow(false)
    val hasFailed: StateFlow<Boolean> = _hasFailed

    init {
        viewModelScope.launch {
            queueManager.observePending().collect { pending ->
                _pendingCount.value = pending.size
                _hasFailed.value = pending.any { it.status == PendingAlertStatus.FAILED }
            }
        }
    }
}
