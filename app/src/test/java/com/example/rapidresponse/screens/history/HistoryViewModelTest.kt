package com.example.rapidresponse.screens.history

import com.example.rapidresponse.local.PendingAlertEntity
import com.example.rapidresponse.local.PendingAlertStatus
import com.example.rapidresponse.model.DataOrException
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.queue.AlertQueueManager
import com.example.rapidresponse.repository.RapidResponseRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class HistoryViewModelTest {

    private val dispatcher = StandardTestDispatcher()
    private val repository = mockk<RapidResponseRepository>()
    private val queueManager = mockk<AlertQueueManager>(relaxUnitFun = true)
    private val pending = MutableStateFlow<List<PendingAlertEntity>>(emptyList())

    private val alert = EmergencyAlert(
        id = 1,
        type = "fire",
        description = "d",
        latitude = null,
        longitude = null,
        building = null,
        floor = null,
        priority = "high"
    )

    private val queued = PendingAlertEntity(
        clientAlertId = "queued-1",
        type = "fire",
        description = "d",
        latitude = null,
        longitude = null,
        building = null,
        floor = null,
        priority = "high",
        reporterPhone = null,
        status = PendingAlertStatus.FAILED,
        attemptCount = 8,
        lastError = "offline",
        createdAtMillis = 0L
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        every { queueManager.observePending() } returns pending
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun create(): HistoryViewModel {
        val viewModel = HistoryViewModel(repository, queueManager)
        dispatcher.scheduler.advanceUntilIdle()
        return viewModel
    }

    @Test
    fun `loads the delivered alert history`() {
        coEvery { repository.getMyAlerts() } returns DataOrException(data = listOf(alert))

        val viewModel = create()

        assertEquals(listOf(alert), viewModel.alerts.value)
        assertNull(viewModel.error.value)
    }

    @Test
    fun `shows the load error instead of an empty success`() {
        coEvery { repository.getMyAlerts() } returns DataOrException(e = Exception("offline"))

        val viewModel = create()

        assertEquals("offline", viewModel.error.value)
        assertEquals(emptyList<EmergencyAlert>(), viewModel.alerts.value)
    }

    @Test
    fun `surfaces alerts that are still waiting on this device`() {
        coEvery { repository.getMyAlerts() } returns DataOrException(data = emptyList())
        val viewModel = create()

        pending.value = listOf(queued)
        dispatcher.scheduler.advanceUntilIdle()

        assertEquals(listOf(queued), viewModel.pendingAlerts.value)
    }

    @Test
    fun `retry asks the queue to redeliver that alert`() {
        coEvery { repository.getMyAlerts() } returns DataOrException(data = emptyList())
        val viewModel = create()

        viewModel.retry("queued-1")

        verify { queueManager.retry("queued-1") }
    }

    @Test
    fun `discard removes that alert from the queue`() {
        coEvery { repository.getMyAlerts() } returns DataOrException(data = emptyList())
        val viewModel = create()

        viewModel.discard("queued-1")
        dispatcher.scheduler.advanceUntilIdle()

        coVerify { queueManager.discard("queued-1") }
    }
}
