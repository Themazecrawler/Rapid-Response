package com.example.rapidresponse.model

data class DataOrException<T, E : Exception>(
    var data: T? = null,
    var loading: Boolean = false,
    var e: E? = null
)
