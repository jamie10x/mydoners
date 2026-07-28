package com.mydoners.kds.domain.repository

import com.mydoners.kds.core.DataError
import com.mydoners.kds.core.Result
import com.mydoners.kds.domain.model.ChangedBy
import com.mydoners.kds.domain.model.Order
import com.mydoners.kds.domain.model.OrderStatus
import com.mydoners.kds.domain.model.RealtimeEvent
import com.mydoners.kds.domain.model.SalesSummary
import kotlinx.coroutines.flow.Flow

interface OrderRepository {
    /** Work-queue recovery on launch/reconnect — see GET /orders?status=... in docs/openapi.yaml. */
    suspend fun fetchActiveOrders(): Result<List<Order>, DataError.Network>

    suspend fun fetchOrder(orderId: Int): Result<Order, DataError.Network>

    suspend fun updateStatus(orderId: Int, status: OrderStatus, changedBy: ChangedBy): Result<Order, DataError.Network>

    /** Live feed — connects lazily on first collection, matching the tablet's always-on screen lifecycle. */
    fun observeRealtimeEvents(): Flow<RealtimeEvent>

    suspend fun fetchTodaySummary(): Result<SalesSummary, DataError.Network>

    suspend fun fetchTodayHistory(): Result<List<Order>, DataError.Network>
}
