package com.example.rapidresponse.notifications

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

object AlertRefreshSignal {
    private val _events = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val events: SharedFlow<Unit> = _events

    fun notifyNewAlert() {
        _events.tryEmit(Unit)
    }
}
