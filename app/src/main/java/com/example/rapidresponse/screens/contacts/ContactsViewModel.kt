package com.example.rapidresponse.screens.contacts

import androidx.lifecycle.viewModelScope
import com.example.rapidresponse.model.DataOrException
import com.example.rapidresponse.model.EmergencyContact
import com.example.rapidresponse.repository.RapidResponseRepository
import com.example.rapidresponse.viewmodel.LoadableViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ContactsViewModel @Inject constructor(
    private val repository: RapidResponseRepository
) : LoadableViewModel<List<EmergencyContact>>(emptyList()) {

    val contacts: StateFlow<List<EmergencyContact>> get() = data

    private val _isStaff = MutableStateFlow(false)
    val isStaff: StateFlow<Boolean> = _isStaff

    private val _actionError = MutableStateFlow<String?>(null)
    val actionError: StateFlow<String?> = _actionError

    override suspend fun fetch(): DataOrException<List<EmergencyContact>, Exception> {
        val role = repository.getProfile().data?.role
        _isStaff.value = role == "security" || role == "admin"
        return if (_isStaff.value) repository.getAllContacts() else repository.getContacts()
    }

    fun addContact(contact: EmergencyContact, onSuccess: () -> Unit) {
        viewModelScope.launch {
            val result = repository.createContact(contact)
            if (result.e == null) {
                _actionError.value = null
                refresh()
                onSuccess()
            } else {
                _actionError.value = result.e?.message
            }
        }
    }

    fun setAvailability(contact: EmergencyContact, available: Boolean) {
        val id = contact.id ?: return
        viewModelScope.launch {
            val result = repository.setContactAvailability(id, available)
            if (result.e == null) {
                _actionError.value = null
                refresh()
            } else {
                _actionError.value = result.e?.message
            }
        }
    }

    fun clearActionError() {
        _actionError.value = null
    }
}
