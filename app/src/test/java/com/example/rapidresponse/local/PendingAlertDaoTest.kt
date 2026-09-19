package com.example.rapidresponse.local

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PendingAlertDaoTest {

    private lateinit var db: AppDatabase
    private lateinit var dao: PendingAlertDao

    private fun entity(id: String, attemptCount: Int = 0, status: String = PendingAlertStatus.PENDING) =
        PendingAlertEntity(
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
            attemptCount = attemptCount,
            lastError = null,
            createdAtMillis = 0L
        )

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        dao = db.pendingAlertDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    @Test
    fun `upsert then getById round-trips the row`() = runTest {
        dao.upsert(entity("a"))

        val loaded = dao.getById("a")

        assertEquals("a", loaded?.clientAlertId)
        assertEquals(PendingAlertStatus.PENDING, loaded?.status)
    }

    @Test
    fun `upsert replaces an existing row with the same id`() = runTest {
        dao.upsert(entity("a", attemptCount = 0))
        dao.upsert(entity("a", attemptCount = 5))

        val loaded = dao.getById("a")

        assertEquals(5, loaded?.attemptCount)
    }

    @Test
    fun `getAllPendingOnce excludes failed rows`() = runTest {
        dao.upsert(entity("pending-1", status = PendingAlertStatus.PENDING))
        dao.upsert(entity("failed-1", status = PendingAlertStatus.FAILED))

        val pending = dao.getAllPendingOnce()

        assertEquals(1, pending.size)
        assertEquals("pending-1", pending.first().clientAlertId)
    }

    @Test
    fun `deleteById removes only the matching row`() = runTest {
        dao.upsert(entity("keep"))
        dao.upsert(entity("remove"))

        dao.deleteById("remove")

        assertNull(dao.getById("remove"))
        assertTrue(dao.getById("keep") != null)
    }

    @Test
    fun `update persists changed fields`() = runTest {
        dao.upsert(entity("a", attemptCount = 0))
        val updated = entity("a", attemptCount = 3, status = PendingAlertStatus.FAILED).copy(lastError = "boom")

        dao.update(updated)

        val loaded = dao.getById("a")
        assertEquals(3, loaded?.attemptCount)
        assertEquals(PendingAlertStatus.FAILED, loaded?.status)
        assertEquals("boom", loaded?.lastError)
    }

    @Test
    fun `observeAll emits newest-first`() = runTest {
        dao.upsert(entity("older").copy(createdAtMillis = 1L))
        dao.upsert(entity("newer").copy(createdAtMillis = 2L))

        val rows = dao.observeAll().first()

        assertEquals(listOf("newer", "older"), rows.map { it.clientAlertId })
    }
}
