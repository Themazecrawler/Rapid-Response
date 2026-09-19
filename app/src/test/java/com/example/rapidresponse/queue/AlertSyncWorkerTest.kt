package com.example.rapidresponse.queue

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.work.ListenableWorker
import androidx.work.WorkerFactory
import androidx.work.WorkerParameters
import androidx.work.testing.TestListenableWorkerBuilder
import androidx.work.workDataOf
import com.example.rapidresponse.local.PendingAlertDao
import com.example.rapidresponse.local.PendingAlertEntity
import com.example.rapidresponse.local.PendingAlertStatus
import com.example.rapidresponse.model.DataOrException
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.repository.RapidResponseRepository
import io.mockk.coEvery
import io.mockk.mockk
import io.mockk.slot
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AlertSyncWorkerTest {

    private val repository = mockk<RapidResponseRepository>()
    private val dao = mockk<PendingAlertDao>(relaxUnitFun = true)

    private fun samplePending(attemptCount: Int) = PendingAlertEntity(
        clientAlertId = "id-1",
        type = "fire",
        description = "Smoke in the library",
        latitude = null,
        longitude = null,
        building = "Library",
        floor = "2",
        priority = "high",
        reporterPhone = null,
        status = PendingAlertStatus.PENDING,
        attemptCount = attemptCount,
        lastError = null,
        createdAtMillis = 0L
    )

    private fun buildWorker(clientAlertId: String?): AlertSyncWorker {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val builder = TestListenableWorkerBuilder<AlertSyncWorker>(context)
        if (clientAlertId != null) {
            builder.setInputData(workDataOf(AlertSyncWorker.KEY_CLIENT_ALERT_ID to clientAlertId))
        }
        builder.setWorkerFactory(object : WorkerFactory() {
            override fun createWorker(
                appContext: Context,
                workerClassName: String,
                workerParameters: WorkerParameters
            ): ListenableWorker = AlertSyncWorker(appContext, workerParameters, repository, dao)
        })
        return builder.build()
    }

    @Test
    fun `fails immediately when no client alert id was provided`() = runTest {
        val result = buildWorker(null).doWork()

        assertEquals(ListenableWorker.Result.failure(), result)
    }

    @Test
    fun `succeeds without calling the repository when the pending row is already gone`() = runTest {
        coEvery { dao.getById("id-1") } returns null

        val result = buildWorker("id-1").doWork()

        assertEquals(ListenableWorker.Result.success(), result)
    }

    @Test
    fun `deletes the local row and succeeds on successful delivery`() = runTest {
        coEvery { dao.getById("id-1") } returns samplePending(attemptCount = 0)
        coEvery { repository.submitAlert(any()) } returns
            DataOrException(data = EmergencyAlert(type = "fire", description = "d", latitude = null, longitude = null, building = null, floor = null, priority = "high"))

        val result = buildWorker("id-1").doWork()

        assertEquals(ListenableWorker.Result.success(), result)
    }

    @Test
    fun `retries and increments the attempt count when below the max`() = runTest {
        coEvery { dao.getById("id-1") } returns samplePending(attemptCount = 2)
        coEvery { repository.submitAlert(any()) } returns DataOrException(e = Exception("network down"))
        val updated = slot<PendingAlertEntity>()
        coEvery { dao.update(capture(updated)) } returns Unit

        val result = buildWorker("id-1").doWork()

        assertEquals(ListenableWorker.Result.retry(), result)
        assertEquals(3, updated.captured.attemptCount)
        assertEquals(PendingAlertStatus.PENDING, updated.captured.status)
    }

    @Test
    fun `stops retrying and marks the row failed at the max attempt count`() = runTest {
        coEvery { dao.getById("id-1") } returns samplePending(attemptCount = 7)
        coEvery { repository.submitAlert(any()) } returns DataOrException(e = Exception("still down"))
        val updated = slot<PendingAlertEntity>()
        coEvery { dao.update(capture(updated)) } returns Unit

        val result = buildWorker("id-1").doWork()

        assertEquals(ListenableWorker.Result.failure(), result)
        assertEquals(8, updated.captured.attemptCount)
        assertEquals(PendingAlertStatus.FAILED, updated.captured.status)
        assertEquals("still down", updated.captured.lastError)
    }
}
