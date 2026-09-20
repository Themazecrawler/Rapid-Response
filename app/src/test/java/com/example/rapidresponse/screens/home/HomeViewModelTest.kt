package com.example.rapidresponse.screens.home

import com.example.rapidresponse.local.PendingAlertEntity
import com.example.rapidresponse.local.PendingAlertStatus
import com.example.rapidresponse.queue.AlertQueueManager
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
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
class HomeViewModelTest {

    private val dispatcher = StandardTestDispatcher()
    private val pending = MutableStateFlow<List<PendingAlertEntity>>(emptyList())
    private val queueManager = mockk<AlertQueueManager>()

    private fun entity(id: String, status: String) = PendingAlertEntity(
        clientAlertId = id,
        type = "fire",
        description = "d",
        latitude = null,
        longitude = null,
        building = null,
        floor = null,
        priority = "high",
        reporterPhone = null,
        status = status,
        attemptCount = 0,
        lastError = null,
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

    @Test
    fun `starts with nothing pending and no failures`() {
        val viewModel = HomeViewModel(queueManager)
        dispatcher.scheduler.advanceUntilIdle()

        assertEquals(0, viewModel.pendingCount.value)
        assertFalse(viewModel.hasFailed.value)
    }

    @Test
    fun `counts queued alerts as they change`() {
        val viewModel = HomeViewModel(queueManager)
        dispatcher.scheduler.advanceUntilIdle()

        pending.value = listOf(entity("a", PendingAlertStatus.PENDING), entity("b", PendingAlertStatus.PENDING))
        dispatcher.scheduler.advanceUntilIdle()

        assertEquals(2, viewModel.pendingCount.value)
        assertFalse(viewModel.hasFailed.value)
    }

    @Test
    fun `flags a failed delivery and clears the flag once it is resolved`() {
        val viewModel = HomeViewModel(queueManager)
        pending.value = listOf(entity("a", PendingAlertStatus.PENDING), entity("b", PendingAlertStatus.FAILED))
        dispatcher.scheduler.advanceUntilIdle()
        assertTrue(viewModel.hasFailed.value)

        pending.value = listOf(entity("a", PendingAlertStatus.PENDING))
        dispatcher.scheduler.advanceUntilIdle()

        assertFalse(viewModel.hasFailed.value)
    }
}
