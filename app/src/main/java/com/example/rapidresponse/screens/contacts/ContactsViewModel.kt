package com.example.rapidresponse.screens.contacts

import com.example.rapidresponse.model.DataOrException
import com.example.rapidresponse.model.EmergencyContact
import com.example.rapidresponse.repository.RapidResponseRepository
import com.example.rapidresponse.viewmodel.LoadableViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

@HiltViewModel
class ContactsViewModel @Inject constructor(
    private val repository: RapidResponseRepository
) : LoadableViewModel<List<EmergencyContact>>(emptyList()) {

    val contacts: StateFlow<List<EmergencyContact>> get() = data

    override suspend fun fetch(): DataOrException<List<EmergencyContact>, Exception> =
        repository.getContacts()
}
