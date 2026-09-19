package com.example.rapidresponse.network

import com.example.rapidresponse.utils.Constants
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.flow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources
import java.io.IOException
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

private class StreamRejectedException(code: Int) : IOException("Stream rejected with HTTP $code")

@Singleton
class AlertStreamClient(
    client: OkHttpClient,
    private val baseUrl: String,
    private val initialBackoffMs: Long
) {
    @Inject
    constructor(client: OkHttpClient) : this(client, Constants.BASE_URL, DEFAULT_BACKOFF_MS)

    private val streamClient = client.newBuilder()
        .callTimeout(0, TimeUnit.MILLISECONDS)
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    fun events(): Flow<Unit> = flow {
        var failures = 0
        while (true) {
            val error = runCatching {
                connect().collect {
                    failures = 0
                    emit(Unit)
                }
            }.exceptionOrNull()
            if (error is CancellationException) throw error
            if (error is StreamRejectedException) return@flow
            delay(backoffMs(failures))
            failures += 1
        }
    }

    private fun backoffMs(failures: Int): Long =
        minOf(MAX_BACKOFF_MS, initialBackoffMs shl failures.coerceAtMost(MAX_BACKOFF_SHIFT))

    private fun connect(): Flow<Unit> = callbackFlow {
        val request = Request.Builder()
            .url("${baseUrl.trimEnd('/')}/api/v1/alerts/stream")
            .header("Accept", "text/event-stream")
            .build()

        val source = EventSources.createFactory(streamClient).newEventSource(
            request,
            object : EventSourceListener() {
                override fun onOpen(eventSource: EventSource, response: Response) {
                    trySend(Unit)
                }

                override fun onEvent(eventSource: EventSource, id: String?, type: String?, data: String) {
                    trySend(Unit)
                }

                override fun onClosed(eventSource: EventSource) {
                    close()
                }

                override fun onFailure(eventSource: EventSource, t: Throwable?, response: Response?) {
                    val code = response?.code
                    when {
                        code != null && code in 400..499 && code != 408 && code != 429 ->
                            close(StreamRejectedException(code))
                        else -> close(t ?: IOException("Stream failed with HTTP $code"))
                    }
                }
            }
        )
        awaitClose { source.cancel() }
    }

    private companion object {
        const val DEFAULT_BACKOFF_MS = 1_000L
        const val MAX_BACKOFF_MS = 30_000L
        const val MAX_BACKOFF_SHIFT = 5
    }
}
