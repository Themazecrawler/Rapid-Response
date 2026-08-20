package com.example.rapidresponse.screens.incoming

import com.example.rapidresponse.model.DataOrException
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.repository.RapidResponseRepository
import com.example.rapidresponse.viewmodel.LoadableViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

@HiltViewModel
class IncomingAlertsViewModel @Inject constructor(
    private val repository: RapidResponseRepository
) : LoadableViewModel<List<EmergencyAlert>>(emptyList()) {

    val alerts: StateFlow<List<EmergencyAlert>> get() = data

    override suspend fun fetch(): DataOrException<List<EmergencyAlert>, Exception> =
        repository.getRecentAlerts()
}
