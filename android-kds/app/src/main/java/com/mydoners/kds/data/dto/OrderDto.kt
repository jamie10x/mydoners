package com.mydoners.kds.data.dto

import kotlinx.serialization.Serializable

// Matches the `Order` / `OrderItem` schemas in docs/openapi.yaml field-for-field.

@Serializable
data class OrderItemDto(
    val id: Int,
    val productId: Int,
    val productName: String,
    val selectedVariant: String? = null,
    val quantity: Int,
    val unitPrice: Double,
    val totalPrice: Double,
)

@Serializable
data class OrderDto(
    val id: Int,
    val status: String,
    val items: List<OrderItemDto>,
    val totalAmount: Double,
    val paymentType: String,
    val paymentStatus: String,
    val latitude: Double,
    val longitude: Double,
    val landmarkAddress: String,
    val courierNotes: String? = null,
    val customerName: String? = null,
    val customerPhone: String? = null,
    val customerTelegramUsername: String? = null,
    val addressLabel: String? = null,
    val riskLevel: String? = null,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class UpdateOrderStatusRequest(
    val status: String,
    val changedBy: String,
)

@Serializable
data class TopItemDto(val productName: String, val quantity: Int)

@Serializable
data class SalesSummaryDto(
    val orderCount: Int,
    val revenue: Double,
    val topItems: List<TopItemDto>,
)
