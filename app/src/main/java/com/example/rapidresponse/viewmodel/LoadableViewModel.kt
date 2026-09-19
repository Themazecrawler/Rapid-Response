package com.example.rapidresponse.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.rapidresponse.model.DataOrException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

// The "fetch one thing from the repository and expose data/loading/error" shape was
// hand-written identically in every read-only screen's ViewModel. Subclasses only need to
// say what to fetch (fetch()) and what to show before the first result arrives (initialValue).
//
// init { load() } below runs during construction, but load() only *schedules* the fetch on
// viewModelScope - by the time that coroutine actually runs fetch(), the subclass's own
// constructor (and any properties it declares, like an injected repository) has already
// finished, so overriding fetch() to reference them is safe despite the call originating in
// the base class's init block.
abstract class LoadableViewModel<T>(private val initialValue: T) : ViewModel() {

    private val _data = MutableStateFlow(initialValue)
    val data: StateFlow<T> = _data

    private val _loading = MutableStateFlow(true)
    val loading: StateFlow<Boolean> = _loading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    protected abstract suspend fun fetch(): DataOrException<T, Exception>

    init {
        load()
    }

    fun refresh() {
        viewModelScope.launch {
            val result = fetch()
            if (result.e == null) {
                _data.value = result.data ?: initialValue
                _error.value = null
            }
        }
    }

    fun load() {
        viewModelScope.launch {
            _loading.value = true
            val result = fetch()
            _data.value = result.data ?: initialValue
            _error.value = result.e?.message
            _loading.value = false
        }
    }
}
