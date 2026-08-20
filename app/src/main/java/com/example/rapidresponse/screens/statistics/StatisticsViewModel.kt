package com.example.rapidresponse.screens.statistics

import com.example.rapidresponse.model.AlertStats
import com.example.rapidresponse.model.DataOrException
import com.example.rapidresponse.repository.RapidResponseRepository
import com.example.rapidresponse.viewmodel.LoadableViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

@HiltViewModel
class StatisticsViewModel @Inject constructor(
    private val repository: RapidResponseRepository
) : LoadableViewModel<AlertStats?>(null) {

    val stats: StateFlow<AlertStats?> get() = data

    override suspend fun fetch(): DataOrException<AlertStats?, Exception> {
        // DataOrException<AlertStats, _> isn't assignable to DataOrException<AlertStats?, _>
        // (Kotlin generics are invariant), even though .data is nullable either way.
        val result = repository.getAlertStats()
        return DataOrException(data = result.data, e = result.e)
    }
}
