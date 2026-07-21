package com.mydoners.kds.data.mapper

import com.mydoners.kds.data.dto.OrderDto
import com.mydoners.kds.data.dto.OrderItemDto
import com.mydoners.kds.domain.model.Order
import com.mydoners.kds.domain.model.OrderItem
import com.mydoners.kds.domain.model.OrderStatus
import com.mydoners.kds.domain.model.PaymentStatus
import com.mydoners.kds.domain.model.PaymentType
import com.mydoners.kds.domain.model.RiskLevel

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
    landmarkAddress = landmarkAddress,
    courierNotes = courierNotes,
    riskLevel = riskLevel?.let(RiskLevel::valueOf),
    createdAt = createdAt,
)
