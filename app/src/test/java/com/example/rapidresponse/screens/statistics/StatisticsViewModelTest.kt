package com.example.rapidresponse.screens.statistics

import com.example.rapidresponse.model.AlertStats
import com.example.rapidresponse.model.CountEntry
import com.example.rapidresponse.model.DataOrException
import com.example.rapidresponse.repository.RapidResponseRepository
import io.mockk.coEvery
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
class StatisticsViewModelTest {

    private val dispatcher = StandardTestDispatcher()
    private val repository = mockk<RapidResponseRepository>()

    private val stats = AlertStats(
        totalAlerts = 3,
        activeAlerts = 1,
        investigatingAlerts = 1,
        resolvedAlerts = 1,
        byType = listOf(CountEntry("fire", 2)),
        byPriority = listOf(CountEntry("high", 3)),
        byDayOfWeek = listOf(CountEntry("Mon", 3)),
        mostCommonType = "fire",
        busiestDay = "Mon"
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
    fun `exposes the loaded statistics`() {
        coEvery { repository.getAlertStats() } returns DataOrException(data = stats)

        val viewModel = StatisticsViewModel(repository)
        dispatcher.scheduler.advanceUntilIdle()

        assertEquals(stats, viewModel.stats.value)
        assertFalse(viewModel.loading.value)
        assertNull(viewModel.error.value)
    }

    @Test
    fun `has no statistics and an error when loading fails`() {
        coEvery { repository.getAlertStats() } returns DataOrException(e = Exception("server error"))

        val viewModel = StatisticsViewModel(repository)
        dispatcher.scheduler.advanceUntilIdle()

        assertNull(viewModel.stats.value)
        assertEquals("server error", viewModel.error.value)
    }

    @Test
    fun `reload replaces the statistics`() {
        coEvery { repository.getAlertStats() } returns DataOrException(data = stats)
        val viewModel = StatisticsViewModel(repository)
        dispatcher.scheduler.advanceUntilIdle()

        val updated = stats.copy(totalAlerts = 9)
        coEvery { repository.getAlertStats() } returns DataOrException(data = updated)
        viewModel.load()
        dispatcher.scheduler.advanceUntilIdle()

        assertEquals(9, viewModel.stats.value?.totalAlerts)
    }
}
