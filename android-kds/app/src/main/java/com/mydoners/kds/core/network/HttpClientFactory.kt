package com.mydoners.kds.core.network

import com.mydoners.kds.BuildConfig
import com.mydoners.kds.core.config.DeviceConfig
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.auth.Auth
import io.ktor.client.plugins.auth.providers.BearerTokens
import io.ktor.client.plugins.auth.providers.bearer
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.http.takeFrom
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

object HttpClientFactory {
    fun create(deviceConfig: DeviceConfig): HttpClient = HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
        install(Logging) {
            level = if (BuildConfig.DEBUG) LogLevel.INFO else LogLevel.NONE
        }
        install(Auth) {
            bearer {
                // The device key never expires/rotates automatically (single
                // fixed tablet, manual rotation per docs/auth-contract.md #2),
                // so both loadTokens and refreshTokens resolve the same value.
                loadTokens { BearerTokens(deviceConfig.getApiKey(), "") }
                refreshTokens { BearerTokens(deviceConfig.getApiKey(), "") }
            }
        }
        defaultRequest {
            url { takeFrom(BuildConfig.BACKEND_URL) }
        }
    }
}
