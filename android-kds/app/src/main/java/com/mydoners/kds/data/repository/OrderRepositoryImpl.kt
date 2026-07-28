package com.mydoners.kds.data.repository

import com.mydoners.kds.core.DataError
import com.mydoners.kds.core.Result
import com.mydoners.kds.core.map
import com.mydoners.kds.core.network.RealtimeClient
import com.mydoners.kds.data.mapper.toDomain
import com.mydoners.kds.data.remote.OrderApi
import com.mydoners.kds.domain.model.ChangedBy
import com.mydoners.kds.domain.model.Order
import com.mydoners.kds.domain.model.OrderStatus
import com.mydoners.kds.domain.model.RealtimeEvent
import com.mydoners.kds.domain.model.SalesSummary
import com.mydoners.kds.domain.repository.OrderRepository
import kotlinx.coroutines.flow.Flow

class OrderRepositoryImpl(
    private val orderApi: OrderApi,
    private val realtimeClient: RealtimeClient,
) : OrderRepository {

    override suspend fun fetchActiveOrders(): Result<List<Order>, DataError.Network> =
        orderApi.fetchActiveOrders().map { dtos -> dtos.map { it.toDomain() } }

    override suspend fun fetchOrder(orderId: Int): Result<Order, DataError.Network> =
        orderApi.fetchOrder(orderId).map { it.toDomain() }

    override suspend fun updateStatus(
        orderId: Int,
        status: OrderStatus,
        changedBy: ChangedBy,
    ): Result<Order, DataError.Network> =
        orderApi.updateStatus(orderId, status.name, changedBy.name).map { it.toDomain() }

    override fun observeRealtimeEvents(): Flow<RealtimeEvent> = realtimeClient.observe()

    override suspend fun fetchTodaySummary(): Result<SalesSummary, DataError.Network> =
        orderApi.fetchTodaySummary().map { it.toDomain() }

    override suspend fun fetchTodayHistory(): Result<List<Order>, DataError.Network> =
        orderApi.fetchTodayHistory().map { dtos -> dtos.map { it.toDomain() } }
}
