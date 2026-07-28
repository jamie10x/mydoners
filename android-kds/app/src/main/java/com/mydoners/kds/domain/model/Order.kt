package com.mydoners.kds.domain.model

// Mirrors packages/shared-contracts/src/index.ts — keep in sync by hand,
// per docs/decisions.md #8 (KDS mirrors the TS contracts manually rather
// than sharing generated types).

enum class OrderStatus {
    PENDING,
    CONFIRMED,
    COOKING,
    READY_FOR_DELIVERY,
    ON_THE_WAY,
    DELIVERED,
    CANCELLED,
}

enum class PaymentType { CASH, CLICK, PAYME }
enum class PaymentStatus { UNPAID, PAID }
enum class ChangedBy { SYSTEM, KITCHEN, COURIER, USER }
enum class RiskLevel { LOW, MEDIUM, HIGH }

data class OrderItem(
    val id: Int,
    val productId: Int,
    val productName: String,
    val selectedVariant: String?,
    val quantity: Int,
    val unitPrice: Double,
    val totalPrice: Double,
)

data class Order(
    val id: Int,
    val status: OrderStatus,
    val items: List<OrderItem>,
    val totalAmount: Double,
    val paymentType: PaymentType,
    val paymentStatus: PaymentStatus,
    val latitude: Double,
    val longitude: Double,
    val landmarkAddress: String,
    val courierNotes: String?,
    // Snapshotted at checkout on the backend — see backend/src/db/schema.ts.
    // Expanded-card-only context; no business logic depends on these.
    val customerName: String?,
    val customerPhone: String?,
    val customerTelegramUsername: String?,
    val addressLabel: String?,
    val riskLevel: RiskLevel?,
    val createdAt: String,
)

/** Backs the Sales screen and the top bar's ambient today-strip — see GET /orders/today-summary. */
data class SalesSummary(
    val orderCount: Int,
    val revenue: Double,
    val topItems: List<TopItem>,
)

data class TopItem(val productName: String, val quantity: Int)

/**
 * Statuses the KDS's own action buttons are allowed to move an order
 * through — mirrors the transition table in
 * backend/src/services/orderService.ts, restricted to what the kitchen
 * (not the courier or customer) can trigger.
 */
fun OrderStatus.nextKitchenAction(): OrderStatus? = when (this) {
    OrderStatus.PENDING -> OrderStatus.CONFIRMED
    OrderStatus.CONFIRMED -> OrderStatus.COOKING
    OrderStatus.COOKING -> OrderStatus.READY_FOR_DELIVERY
    else -> null
}
