package com.example.rapidresponse.screens.statistics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.rapidresponse.model.AlertStats
import com.example.rapidresponse.repository.RapidResponseRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class StatisticsViewModel @Inject constructor(
    private val repository: RapidResponseRepository
) : ViewModel() {

    private val _stats = MutableStateFlow<AlertStats?>(null)
    val stats: StateFlow<AlertStats?> = _stats

    private val _loading = MutableStateFlow(true)
    val loading: StateFlow<Boolean> = _loading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _loading.value = true
            val result = repository.getAlertStats()
            _stats.value = result.data
            _error.value = result.e?.message
            _loading.value = false
        }
    }
}
