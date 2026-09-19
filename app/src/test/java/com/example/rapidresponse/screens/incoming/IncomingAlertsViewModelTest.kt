package com.example.rapidresponse.screens.incoming

import com.example.rapidresponse.model.DataOrException
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.network.AlertStreamClient
import com.example.rapidresponse.notifications.AlertRefreshSignal
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
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class IncomingAlertsViewModelTest {

    private val repository = mockk<RapidResponseRepository>()
    private val streamClient = mockk<AlertStreamClient>()

    private fun alert(id: Int) = EmergencyAlert(
        id = id,
        type = "fire",
        description = "d",
        latitude = null,
        longitude = null,
        building = null,
        floor = null,
        priority = "high"
    )

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

    @Test
    fun `refresh replaces data without toggling the loading state`() {
        coEvery { repository.getRecentAlerts() } returns DataOrException(data = listOf(alert(1)))
        val viewModel = IncomingAlertsViewModel(repository, streamClient)
        idle()
        assertEquals(1, viewModel.alerts.value.size)

        coEvery { repository.getRecentAlerts() } returns DataOrException(data = listOf(alert(1), alert(2)))
        viewModel.refresh()
        idle()

        assertEquals(2, viewModel.alerts.value.size)
        assertFalse(viewModel.loading.value)
    }

    @Test
    fun `a failed refresh keeps the alerts already on screen`() {
        coEvery { repository.getRecentAlerts() } returns DataOrException(data = listOf(alert(1)))
        val viewModel = IncomingAlertsViewModel(repository, streamClient)
        idle()

        coEvery { repository.getRecentAlerts() } returns DataOrException(e = Exception("offline"))
        viewModel.refresh()
        idle()

        assertEquals(1, viewModel.alerts.value.size)
        assertNull(viewModel.error.value)
    }

    @Test
    fun `an arriving push notification triggers a refetch`() {
        coEvery { repository.getRecentAlerts() } returns DataOrException(data = listOf(alert(1)))
        val viewModel = IncomingAlertsViewModel(repository, streamClient)
        idle()

        coEvery { repository.getRecentAlerts() } returns DataOrException(data = listOf(alert(1), alert(2)))
        AlertRefreshSignal.notifyNewAlert()
        idle()

        assertEquals(2, viewModel.alerts.value.size)
        coVerify(exactly = 2) { repository.getRecentAlerts() }
    }
}
