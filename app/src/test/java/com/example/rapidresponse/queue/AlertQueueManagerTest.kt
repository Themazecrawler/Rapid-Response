package com.example.rapidresponse.queue

import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequest
import androidx.work.Operation
import androidx.work.WorkManager
import com.example.rapidresponse.local.PendingAlertDao
import com.example.rapidresponse.local.PendingAlertEntity
import com.example.rapidresponse.local.PendingAlertStatus
import com.example.rapidresponse.model.EmergencyAlert
import io.mockk.CapturingSlot
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class AlertQueueManagerTest {

    private val dao = mockk<PendingAlertDao>(relaxUnitFun = true)
    private val workManager = mockk<WorkManager>()
    private lateinit var manager: AlertQueueManager

    @Before
    fun setUp() {
        val operation = mockk<Operation>(relaxed = true)
        every { workManager.enqueueUniqueWork(any(), any(), any<OneTimeWorkRequest>()) } returns operation
        every { workManager.cancelUniqueWork(any()) } returns operation
        manager = AlertQueueManager(dao, workManager)
    }

    private val sampleAlert = EmergencyAlert(
        type = "medical",
        description = "Twisted ankle",
        latitude = 1.0,
        longitude = 2.0,
        building = "Gym",
        floor = "1",
        priority = "medium",
        reporterPhone = null
    )

    @Test
    fun `enqueue writes a pending row and schedules delivery with REPLACE`() = runTest {
        val entitySlot = slot<PendingAlertEntity>()
        coEvery { dao.upsert(capture(entitySlot)) } returns Unit
        val nameSlot = slot<String>()
        val policySlot = slot<ExistingWorkPolicy>()
        every {
            workManager.enqueueUniqueWork(capture(nameSlot), capture(policySlot), any<OneTimeWorkRequest>())
        } returns mockk(relaxed = true)

        val clientAlertId = manager.enqueue(sampleAlert)

        assertEquals(sampleAlert.type, entitySlot.captured.type)
        assertEquals(clientAlertId, entitySlot.captured.clientAlertId)
        assertEquals(PendingAlertStatus.PENDING, entitySlot.captured.status)
        assertEquals(0, entitySlot.captured.attemptCount)
        assertTrue(nameSlot.captured.endsWith(clientAlertId))
        assertEquals(ExistingWorkPolicy.REPLACE, policySlot.captured)
    }

    @Test
    fun `retry reschedules delivery with REPLACE for the given id`() {
        val nameSlot = slot<String>()
        val policySlot = slot<ExistingWorkPolicy>()
        every {
            workManager.enqueueUniqueWork(capture(nameSlot), capture(policySlot), any<OneTimeWorkRequest>())
        } returns mockk(relaxed = true)

        manager.retry("client-123")

        assertTrue(nameSlot.captured.endsWith("client-123"))
        assertEquals(ExistingWorkPolicy.REPLACE, policySlot.captured)
    }

    @Test
    fun `discard deletes the row and cancels the scheduled work`() = runTest {
        coEvery { dao.deleteById("client-123") } returns Unit
        val nameSlot: CapturingSlot<String> = slot()
        every { workManager.cancelUniqueWork(capture(nameSlot)) } returns mockk(relaxed = true)

        manager.discard("client-123")

        coVerify(exactly = 1) { dao.deleteById("client-123") }
        assertTrue(nameSlot.captured.endsWith("client-123"))
    }

    @Test
    fun `resumePendingDeliveries reschedules every still-pending row with KEEP`() = runTest {
        val entities = listOf(
            PendingAlertEntity(
                clientAlertId = "a",
                type = "fire",
                description = "d",
                latitude = null,
                longitude = null,
                building = null,
                floor = null,
                priority = "high",
                reporterPhone = null,
                status = PendingAlertStatus.PENDING,
                attemptCount = 2,
                lastError = "timeout",
                createdAtMillis = 0L
            ),
            PendingAlertEntity(
                clientAlertId = "b",
                type = "fire",
                description = "d",
                latitude = null,
                longitude = null,
                building = null,
                floor = null,
                priority = "high",
                reporterPhone = null,
                status = PendingAlertStatus.PENDING,
                attemptCount = 0,
                lastError = null,
                createdAtMillis = 0L
            )
        )
        coEvery { dao.getAllPendingOnce() } returns entities
        val policySlot = mutableListOf<ExistingWorkPolicy>()
        every {
            workManager.enqueueUniqueWork(any(), capture(policySlot), any<OneTimeWorkRequest>())
        } returns mockk(relaxed = true)

        manager.resumePendingDeliveries()

        assertEquals(2, policySlot.size)
        assertTrue(policySlot.all { it == ExistingWorkPolicy.KEEP })
    }
}
