package com.mydoners.kds.data.mapper

import com.mydoners.kds.data.dto.OrderDto
import com.mydoners.kds.data.dto.OrderItemDto
import com.mydoners.kds.data.dto.SalesSummaryDto
import com.mydoners.kds.data.dto.TopItemDto
import com.mydoners.kds.domain.model.Order
import com.mydoners.kds.domain.model.OrderItem
import com.mydoners.kds.domain.model.OrderStatus
import com.mydoners.kds.domain.model.PaymentStatus
import com.mydoners.kds.domain.model.PaymentType
import com.mydoners.kds.domain.model.RiskLevel
import com.mydoners.kds.domain.model.SalesSummary
import com.mydoners.kds.domain.model.TopItem

fun OrderItemDto.toDomain(): OrderItem = OrderItem(
    id = id,
    productId = productId,
    productName = productName,
    selectedVariant = selectedVariant,
    quantity = quantity,
    unitPrice = unitPrice,
    totalPrice = totalPrice,
)

fun OrderDto.toDomain(): Order = Order(
    id = id,
    status = OrderStatus.valueOf(status),
    items = items.map(OrderItemDto::toDomain),
    totalAmount = totalAmount,
    paymentType = PaymentType.valueOf(paymentType),
    paymentStatus = PaymentStatus.valueOf(paymentStatus),
    latitude = latitude,
    longitude = longitude,
    landmarkAddress = landmarkAddress,
    courierNotes = courierNotes,
    customerName = customerName,
    customerPhone = customerPhone,
    customerTelegramUsername = customerTelegramUsername,
    addressLabel = addressLabel,
    riskLevel = riskLevel?.let(RiskLevel::valueOf),
    createdAt = createdAt,
)

fun TopItemDto.toDomain(): TopItem = TopItem(productName = productName, quantity = quantity)

fun SalesSummaryDto.toDomain(): SalesSummary = SalesSummary(
    orderCount = orderCount,
    revenue = revenue,
    topItems = topItems.map(TopItemDto::toDomain),
)
