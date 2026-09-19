package com.example.rapidresponse.screens.incoming

import androidx.lifecycle.viewModelScope
import com.example.rapidresponse.model.DataOrException
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.network.AlertStreamClient
import com.example.rapidresponse.notifications.AlertRefreshSignal
import com.example.rapidresponse.repository.RapidResponseRepository
import com.example.rapidresponse.viewmodel.LoadableViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class IncomingAlertsViewModel @Inject constructor(
    private val repository: RapidResponseRepository,
    private val streamClient: AlertStreamClient
) : LoadableViewModel<List<EmergencyAlert>>(emptyList()) {

    val alerts: StateFlow<List<EmergencyAlert>> get() = data

    fun streamEvents(): Flow<Unit> = streamClient.events()

    init {
        viewModelScope.launch {
            AlertRefreshSignal.events.collect { refresh() }
        }
    }

    override suspend fun fetch(): DataOrException<List<EmergencyAlert>, Exception> =
        repository.getRecentAlerts()
}
