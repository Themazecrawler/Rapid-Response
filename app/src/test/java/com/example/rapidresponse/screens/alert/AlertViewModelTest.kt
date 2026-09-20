package com.example.rapidresponse.screens.alert

import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.queue.AlertQueueManager
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
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AlertViewModelTest {

    private val dispatcher = StandardTestDispatcher()
    private val queueManager = mockk<AlertQueueManager>()

    private val alert = EmergencyAlert(
        type = "medical",
        description = "Twisted ankle",
        latitude = 1.0,
        longitude = 2.0,
        building = "Gym",
        floor = "1",
        priority = "medium"
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `starts idle`() {
        assertEquals(SubmitState.Idle, AlertViewModel(queueManager).submitState.value)
    }

    @Test
    fun `queues the alert and reports success without needing the network`() {
        coEvery { queueManager.enqueue(alert) } returns "client-id"
        val viewModel = AlertViewModel(queueManager)

        viewModel.submitAlert(alert)
        dispatcher.scheduler.advanceUntilIdle()

        coVerify(exactly = 1) { queueManager.enqueue(alert) }
        assertEquals(SubmitState.Success, viewModel.submitState.value)
    }

    @Test
    fun `resetState returns to idle so the form can be reused`() {
        coEvery { queueManager.enqueue(alert) } returns "client-id"
        val viewModel = AlertViewModel(queueManager)
        viewModel.submitAlert(alert)
        dispatcher.scheduler.advanceUntilIdle()

        viewModel.resetState()

        assertEquals(SubmitState.Idle, viewModel.submitState.value)
    }
}
