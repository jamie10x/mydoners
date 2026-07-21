package com.mydoners.kds.presentation.kds

sealed interface KdsAction {
    data class OnAcceptOrder(val orderId: Int) : KdsAction
    data class OnMarkReady(val orderId: Int) : KdsAction
    data class OnCancelOrder(val orderId: Int) : KdsAction
    data object OnRetryConnection : KdsAction
}
