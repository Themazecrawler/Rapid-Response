package com.example.rapidresponse.screens.contacts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.rapidresponse.model.EmergencyContact
import com.example.rapidresponse.repository.RapidResponseRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ContactsViewModel @Inject constructor(
    private val repository: RapidResponseRepository
) : ViewModel() {

    private val _contacts = MutableStateFlow<List<EmergencyContact>>(emptyList())
    val contacts: StateFlow<List<EmergencyContact>> = _contacts

    private val _loading = MutableStateFlow(true)
    val loading: StateFlow<Boolean> = _loading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    init {
        loadContacts()
    }

    fun loadContacts() {
        viewModelScope.launch {
            _loading.value = true
            val result = repository.getContacts()
            _contacts.value = result.data ?: emptyList()
            _error.value = result.e?.message
            _loading.value = false
        }
    }
}
