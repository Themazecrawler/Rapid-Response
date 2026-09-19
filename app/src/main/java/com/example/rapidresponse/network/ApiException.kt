package com.example.rapidresponse.network

class ApiException(
    val statusCode: Int,
    message: String
) : Exception(message) {
    val isRetryable: Boolean
        get() = statusCode == 408 || statusCode == 425 || statusCode == 429 || statusCode >= 500
}
