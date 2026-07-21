package com.mydoners.kds.domain.model

/**
 * Mirrors the event catalog in docs/websocket-events.md, but deliberately
 * carries only the orderId, not the full event payload. The WS payload
 * shapes (e.g. OrderCreatedData) don't match the REST `Order` shape exactly
 * — treating every event as "something changed, go refetch" avoids needing
 * two divergent parsers for the same conceptual order, at the cost of an
 * extra REST round-trip per event. Cheap trade for a handful of active
 * orders on a single kitchen tablet.
 */
sealed interface RealtimeEvent {
    data class OrderCreated(val orderId: Int) : RealtimeEvent
    data class OrderStatusChanged(val orderId: Int) : RealtimeEvent
    data class OrderCancelled(val orderId: Int) : RealtimeEvent
    data object Connected : RealtimeEvent
    data object Disconnected : RealtimeEvent
}
