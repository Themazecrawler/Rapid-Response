package com.example.rapidresponse.repository

import com.example.rapidresponse.model.AlertStats
import com.example.rapidresponse.model.ApiEnvelope
import com.example.rapidresponse.model.AvailabilityRequest
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.model.EmergencyContact
import com.example.rapidresponse.network.ApiException
import com.example.rapidresponse.network.ApiService
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.Response
import java.io.IOException

class RapidResponseRepositoryTest {

    private val api = mockk<ApiService>()
    private val repository = RapidResponseRepository(api)

    private fun errorBody(text: String) = text.toResponseBody("application/json".toMediaType())

    private val alert = EmergencyAlert(
        type = "fire",
        description = "d",
        latitude = null,
        longitude = null,
        building = null,
        floor = null,
        priority = "high"
    )

    @Test
    fun `unwraps the envelope on success`() = runBlocking {
        coEvery { api.createAlert(alert) } returns Response.success(ApiEnvelope(true, alert))

        val result = repository.submitAlert(alert)

        assertEquals(alert, result.data)
        assertNull(result.e)
        assertFalse(result.loading)
    }

    @Test
    fun `maps an HTTP error to an ApiException carrying the status and server message`() = runBlocking {
        coEvery { api.createAlert(alert) } returns Response.error(409, errorBody("already used"))

        val result = repository.submitAlert(alert)

        val error = result.e as ApiException
        assertEquals(409, error.statusCode)
        assertEquals("already used", error.message)
        assertFalse(error.isRetryable)
    }

    @Test
    fun `treats server errors and throttling as retryable`() = runBlocking {
        listOf(429, 500, 503).forEach { code ->
            coEvery { api.createAlert(alert) } returns Response.error(code, errorBody("try later"))
            assertTrue("HTTP $code should be retryable", (repository.submitAlert(alert).e as ApiException).isRetryable)
        }
    }

    @Test
    fun `treats client mistakes as permanent`() = runBlocking {
        listOf(400, 401, 403, 404, 409).forEach { code ->
            coEvery { api.createAlert(alert) } returns Response.error(code, errorBody("no"))
            assertFalse("HTTP $code should not be retryable", (repository.submitAlert(alert).e as ApiException).isRetryable)
        }
    }

    @Test
    fun `keeps network failures as the original exception`() = runBlocking {
        val failure = IOException("offline")
        coEvery { api.createAlert(alert) } throws failure

        val result = repository.submitAlert(alert)

        assertEquals(failure, result.e)
        assertNull(result.data)
    }

    @Test
    fun `falls back to an empty list when a list endpoint returns no data`() = runBlocking {
        coEvery { api.getContacts() } returns Response.success(ApiEnvelope(true, null))

        val result = repository.getContacts()

        assertEquals(emptyList<EmergencyContact>(), result.data)
    }

    @Test
    fun `has no data for a missing single-object payload`() = runBlocking {
        coEvery { api.getAlertStats() } returns Response.success(ApiEnvelope<AlertStats>(true, null))

        assertNull(repository.getAlertStats().data)
    }

    @Test
    fun `sends the availability flag for the right contact`() = runBlocking {
        val contact = EmergencyContact(
            id = 4,
            name = "A",
            role = "r",
            phone = "1",
            email = "a@example.com",
            department = "d",
            available = false
        )
        coEvery { api.setContactAvailability(4, AvailabilityRequest(false)) } returns
            Response.success(ApiEnvelope(true, contact))

        val result = repository.setContactAvailability(4, false)

        assertEquals(contact, result.data)
        coVerify { api.setContactAvailability(4, AvailabilityRequest(false)) }
    }

    @Test
    fun `device token registration succeeds without a response body`() = runBlocking {
        coEvery { api.registerDeviceToken(any()) } returns Response.success(Unit)

        val result = repository.registerDeviceToken("token")

        assertEquals(Unit, result.data)
        assertNull(result.e)
    }

    @Test
    fun `device token registration reports HTTP failures`() = runBlocking {
        coEvery { api.registerDeviceToken(any()) } returns Response.error(500, errorBody("boom"))

        val error = repository.registerDeviceToken("token").e as ApiException

        assertEquals(500, error.statusCode)
    }
}
