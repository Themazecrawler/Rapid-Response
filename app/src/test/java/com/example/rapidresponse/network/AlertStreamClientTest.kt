package com.example.rapidresponse.network

import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class AlertStreamClientTest {

    private lateinit var server: MockWebServer
    private lateinit var client: AlertStreamClient

    private fun sse(body: String) = MockResponse()
        .setHeader("Content-Type", "text/event-stream")
        .setBody(body)

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        client = AlertStreamClient(OkHttpClient(), server.url("/").toString(), 10L)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `emits when the stream opens and for every event`() = runBlocking {
        server.enqueue(sse("id: 1\nevent: alert\ndata: {}\n\nevent: resync\ndata: {}\n\n"))

        val emissions = withTimeout(5_000) { client.events().take(3).toList() }

        assertEquals(3, emissions.size)
        assertEquals("/api/v1/alerts/stream", server.takeRequest().path)
    }

    @Test
    fun `asks for an event stream`() = runBlocking {
        server.enqueue(sse("data: {}\n\n"))

        withTimeout(5_000) { client.events().take(1).toList() }

        assertEquals("text/event-stream", server.takeRequest().getHeader("Accept"))
    }

    @Test
    fun `reconnects with backoff after a server error`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(503))
        server.enqueue(sse("data: {}\n\n"))

        val emissions = withTimeout(5_000) { client.events().take(1).toList() }

        assertEquals(1, emissions.size)
        assertEquals(2, server.requestCount)
    }

    @Test
    fun `reconnects when the server ends the stream`() = runBlocking {
        server.enqueue(sse("data: {}\n\n"))
        server.enqueue(sse("data: {}\n\n"))

        val emissions = withTimeout(5_000) { client.events().take(4).toList() }

        assertEquals(4, emissions.size)
        assertTrue(server.requestCount >= 2)
    }

    @Test
    fun `stops instead of retrying when the server rejects the caller`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(403))

        val emissions = withTimeout(5_000) { client.events().toList() }

        assertTrue(emissions.isEmpty())
        assertEquals(1, server.requestCount)
    }
}
