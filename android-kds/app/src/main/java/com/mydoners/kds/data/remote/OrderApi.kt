package com.mydoners.kds.data.remote

import com.mydoners.kds.core.DataError
import com.mydoners.kds.core.Result
import com.mydoners.kds.core.network.safeCall
import com.mydoners.kds.data.dto.OrderDto
import com.mydoners.kds.data.dto.SalesSummaryDto
import com.mydoners.kds.data.dto.UpdateOrderStatusRequest
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.patch
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType

/** Thin REST wrapper — see docs/openapi.yaml for the endpoints this calls. */
class OrderApi(private val httpClient: HttpClient) {

    suspend fun fetchActiveOrders(): Result<List<OrderDto>, DataError.Network> = safeCall {
        httpClient.get("/orders") {
            parameter("status", "PENDING,CONFIRMED,COOKING,READY_FOR_DELIVERY")
        }
    }

    suspend fun fetchOrder(orderId: Int): Result<OrderDto, DataError.Network> = safeCall {
        httpClient.get("/orders/$orderId")
    }

    suspend fun updateStatus(orderId: Int, status: String, changedBy: String): Result<OrderDto, DataError.Network> =
        safeCall {
            httpClient.patch("/orders/$orderId/status") {
                contentType(ContentType.Application.Json)
                setBody(UpdateOrderStatusRequest(status = status, changedBy = changedBy))
            }
        }

    /** Ambient today-strip in the top bar and the Sales screen. */
    suspend fun fetchTodaySummary(): Result<SalesSummaryDto, DataError.Network> = safeCall {
        httpClient.get("/orders/today-summary")
    }

    /** History screen — today's completed/cancelled orders only. */
    suspend fun fetchTodayHistory(): Result<List<OrderDto>, DataError.Network> = safeCall {
        httpClient.get("/orders/today-history")
    }
}
