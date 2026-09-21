package com.example.rapidresponse.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.rapidresponse.model.DataOrException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

// viewModelScope is Main.immediate, so the load must be posted with Dispatchers.Main or it would
// run fetch() inside this init, before the subclass's own properties are assigned.
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
        viewModelScope.launch(Dispatchers.Main) {
            val result = fetch()
            if (result.e == null) {
                _data.value = result.data ?: initialValue
                _error.value = null
            }
        }
    }

    fun load() {
        viewModelScope.launch(Dispatchers.Main) {
            _loading.value = true
            val result = fetch()
            _data.value = result.data ?: initialValue
            _error.value = result.e?.message
            _loading.value = false
        }
    }
}
