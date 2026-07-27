package com.mydoners.kds.presentation.kds

sealed interface KdsAction {
    /** PENDING → CONFIRMED — kitchen has checked stock and accepts the order. */
    data class OnAcceptOrder(val orderId: Int) : KdsAction

    /** CONFIRMED → COOKING — kitchen starts making an already-accepted order. */
    data class OnStartCooking(val orderId: Int) : KdsAction
    data class OnMarkReady(val orderId: Int) : KdsAction
    data class OnCancelOrder(val orderId: Int) : KdsAction
    data object OnRetryConnection : KdsAction
}
