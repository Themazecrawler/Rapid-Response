package com.example.rapidresponse.screens.contacts

import com.example.rapidresponse.model.DataOrException
import com.example.rapidresponse.model.EmergencyContact
import com.example.rapidresponse.model.UserProfile
import com.example.rapidresponse.repository.RapidResponseRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ContactsViewModelTest {

    private val repository = mockk<RapidResponseRepository>()

    private val available = EmergencyContact(
        id = 1,
        name = "A",
        role = "Officer",
        phone = "1",
        email = "a@example.com",
        department = "Security"
    )
    private val unavailable = available.copy(id = 2, name = "B", available = false)

    private val dispatcher = StandardTestDispatcher()

    private fun idle() = dispatcher.scheduler.advanceUntilIdle()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun profileWithRole(role: String) {
        coEvery { repository.getProfile() } returns DataOrException(data = UserProfile(role = role))
    }

    @Test
    fun `students only load available contacts and get no management controls`() {
        profileWithRole("student")
        coEvery { repository.getContacts() } returns DataOrException(data = listOf(available))

        val viewModel = ContactsViewModel(repository)
        idle()

        assertFalse(viewModel.isStaff.value)
        assertEquals(listOf(available), viewModel.contacts.value)
        coVerify(exactly = 0) { repository.getAllContacts() }
    }

    @Test
    fun `security staff load every contact including unavailable ones`() {
        profileWithRole("security")
        coEvery { repository.getAllContacts() } returns DataOrException(data = listOf(available, unavailable))

        val viewModel = ContactsViewModel(repository)
        idle()

        assertTrue(viewModel.isStaff.value)
        assertEquals(2, viewModel.contacts.value.size)
    }

    @Test
    fun `toggling availability calls the API then reloads the list`() {
        profileWithRole("admin")
        coEvery { repository.getAllContacts() } returns DataOrException(data = listOf(available))
        coEvery { repository.setContactAvailability(1, false) } returns
            DataOrException(data = available.copy(available = false))
        val viewModel = ContactsViewModel(repository)
        idle()

        coEvery { repository.getAllContacts() } returns
            DataOrException(data = listOf(available.copy(available = false)))
        viewModel.setAvailability(available, false)
        idle()

        coVerify { repository.setContactAvailability(1, false) }
        assertFalse(viewModel.contacts.value.first().available)
    }

    @Test
    fun `a failed update surfaces the error and leaves the list alone`() {
        profileWithRole("admin")
        coEvery { repository.getAllContacts() } returns DataOrException(data = listOf(available))
        coEvery { repository.setContactAvailability(1, false) } returns
            DataOrException(e = Exception("forbidden"))
        val viewModel = ContactsViewModel(repository)
        idle()

        viewModel.setAvailability(available, false)
        idle()

        assertEquals("forbidden", viewModel.actionError.value)
        assertTrue(viewModel.contacts.value.first().available)
    }

    @Test
    fun `adding a contact reloads the list and reports success`() {
        profileWithRole("admin")
        coEvery { repository.getAllContacts() } returns DataOrException(data = listOf(available))
        coEvery { repository.createContact(any()) } returns DataOrException(data = unavailable)
        val viewModel = ContactsViewModel(repository)
        idle()
        var saved = false

        coEvery { repository.getAllContacts() } returns DataOrException(data = listOf(available, unavailable))
        viewModel.addContact(unavailable) { saved = true }
        idle()

        assertTrue(saved)
        assertEquals(2, viewModel.contacts.value.size)
    }

    @Test
    fun `a failed add keeps the dialog open by not calling onSuccess`() {
        profileWithRole("admin")
        coEvery { repository.getAllContacts() } returns DataOrException(data = listOf(available))
        coEvery { repository.createContact(any()) } returns DataOrException(e = Exception("Validation failed"))
        val viewModel = ContactsViewModel(repository)
        idle()
        var saved = false

        viewModel.addContact(unavailable) { saved = true }
        idle()

        assertFalse(saved)
        assertEquals("Validation failed", viewModel.actionError.value)
    }
}
